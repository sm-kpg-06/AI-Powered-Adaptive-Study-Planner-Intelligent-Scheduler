import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function getFocusType(difficulty: string | null | undefined): string {
  if (difficulty === 'Hard') return 'Deep Focus';
  if (difficulty === 'Easy') return 'Light Focus';
  return 'Active Recall';
}

// ─── ASSIGNMENT ──────────────────────────────────────────────
router.post('/assignment', async (req: any, res: any) => {
  const { title, subjectId, topicId, deadline, duration, difficulty } = req.body;
  const task = await prisma.task.create({
    data: {
      taskType: 'ASSIGNMENT',
      title,
      subjectId,
      topicId,
      deadline: deadline ? new Date(deadline) : null,
      duration: duration ? Math.round(parseFloat(duration) * 60) : null, // convert hours → mins
      difficulty,
      focusType: getFocusType(difficulty),
      userId: req.user.userId
    }
  });
  res.json(task);
});

// ─── EXAM (multi-exam per subject) ──────────────────────────
router.post('/exam', async (req: any, res: any) => {
  const { subjectId, examName, examDate, topics } = req.body;
  // topics: Array<{name, difficulty, estimatedHours}>

  // 1. Create the Exam record
  const exam = await prisma.exam.create({
    data: {
      examName: examName || 'Exam',
      examDate: new Date(examDate),
      subjectId,
      userId: req.user.userId
    }
  });

  // 2. Create each topic + revision task
  for (const t of topics) {
    const durationMins = Math.round((parseFloat(t.estimatedHours) || 1.5) * 60);
    const topicObj = await prisma.topic.create({
      data: {
        title: t.name || t.title,
        difficulty: t.difficulty || 'Medium',
        estimatedHours: parseFloat(t.estimatedHours) || 1.5,
        subjectId,
        examId: exam.id
      }
    });

    await prisma.task.create({
      data: {
        taskType: 'REVISION',
        title: `${exam.examName}: ${topicObj.title}`,
        topicId: topicObj.id,
        subjectId,
        examId: exam.id,
        examName: exam.examName,
        duration: durationMins,
        difficulty: t.difficulty || 'Medium',
        focusType: getFocusType(t.difficulty),
        deadline: new Date(examDate),
        userId: req.user.userId
      }
    });
  }

  // 3. Auto-generate PYQ / Practice block (3 hours = 180 mins)
  await prisma.task.create({
    data: {
      taskType: 'REVISION',
      title: `${exam.examName}: PYQ & Practice Test`,
      subjectId,
      examId: exam.id,
      examName: exam.examName,
      duration: 180,
      difficulty: 'Hard',
      focusType: 'Deep Focus',
      deadline: new Date(examDate),
      userId: req.user.userId
    }
  });

  res.json({ success: true, exam });
});

// ─── MARK COMPLETE ────────────────────────────────────────────
router.post('/:id/complete', async (req: any, res: any) => {
  const { completionPercentage } = req.body;
  await prisma.task.updateMany({
    where: { id: req.params.id, userId: req.user.userId },
    data: {
      isCompleted: true,
      completionPercentage: completionPercentage ? parseInt(completionPercentage) : 100
    }
  });
  res.json({ success: true });
});

export default router;
