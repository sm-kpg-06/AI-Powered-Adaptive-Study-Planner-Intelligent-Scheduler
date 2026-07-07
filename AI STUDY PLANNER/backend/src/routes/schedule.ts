import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ─── GENERATE SCHEDULE ────────────────────────────────────────
router.post('/generate', async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const routine = await prisma.routine.findUnique({ where: { userId } });
    if (!routine) return res.status(400).json({ error: 'Please configure your routine first.' });

    const events = await prisma.calendarEvent.findMany({ where: { userId } });

    // ── STEP 1: Delete stale split-child tasks from previous generation ──
    await prisma.task.deleteMany({ where: { userId, isSubTask: true } });

    // ── STEP 2: Fetch ORIGINAL (non-subTask) incomplete tasks ────────────
    const rawTasks = await prisma.task.findMany({
      where: { userId, isCompleted: false, isSubTask: false },
      include: { subject: true, topic: true, exam: true }
    });

    // Build enriched payload for Python
    const tasks = rawTasks.map((t: any) => ({
      id:          t.id,
      title:       t.title,
      taskType:    t.taskType,
      difficulty:  t.difficulty,
      duration:    t.duration,          // in minutes
      deadline:    t.deadline?.toISOString()  ?? null,
      examDate:    t.examDate?.toISOString()  ?? null,
      focusType:   t.focusType,
      examName:    t.examName ?? t.exam?.examName ?? '',
      examId:      t.examId  ?? '',
      subjectId:   t.subjectId ?? '',
      subjectName: t.subject?.name ?? '',
      topicName:   t.topic?.title ?? '',
      date:        t.date?.toISOString() ?? null,
    }));

    const inputData = JSON.stringify({ routine, events, tasks });

    const pythonScriptPath = path.join(__dirname, '../ai/scheduler.py');
    const pythonProcess    = spawn('python3', [pythonScriptPath]);

    let outputData = '';
    let errorData  = '';
    pythonProcess.stdout.on('data', (d) => { outputData += d.toString(); });
    pythonProcess.stderr.on('data', (d) => {
      errorData += d.toString();
      console.error('Scheduler stderr:', d.toString());
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Scheduler failed: ' + errorData });
      }

      try {
        const result = JSON.parse(outputData);
        if (result.error) return res.status(400).json({ error: result.error });

        // Known original task IDs from DB
        const knownIds = new Set(rawTasks.map((rt: any) => rt.id));

        // ── STEP 3: Persist scheduled tasks ─────────────────────────────
        for (const t of result.schedule) {
          if (t._unscheduled || !t.scheduledDate) continue;

          const commonData = {
            date:      new Date(t.scheduledDate),
            startTime: t.startTime  ?? null,
            endTime:   t.endTime    ?? null,
            difficulty:t.difficulty ?? null,
            focusType: t.focusType  ?? null,
            examName:  t.examName   ?? null,
          };

          if (knownIds.has(t.id)) {
            // Original task (Part 1) — UPDATE scheduling fields ONLY.
            // Do NOT overwrite duration: the DB must keep the full original
            // duration (e.g. 360 min) so future regenerations split correctly.
            await prisma.task.update({ where: { id: t.id }, data: commonData });

          } else {
            // Split child (part 2, 3, …) — CREATE a new row marked isSubTask
            const parentId = t._parentId || t.id.replace(/_p\d+$/, '');
            const parent   = rawTasks.find((rt: any) => rt.id === parentId);
            if (!parent) continue;

            await prisma.task.create({
              data: {
                ...commonData,
                duration:   t.duration ?? null,  // chunk size (e.g. 90 min)
                isSubTask:  true,
                taskType:   parent.taskType,
                title:      t.title,
                subjectId:  parent.subjectId  ?? null,
                topicId:    parent.topicId    ?? null,
                examId:     parent.examId     ?? null,
                examName:   t.examName        ?? parent.examName ?? null,
                deadline:   parent.deadline   ?? null,
                userId,
              }
            });
          }
        }

        res.json({
          message:   'Schedule generated successfully',
          schedule:  result.schedule,
          dailyView: result.dailyView,
        });

      } catch (err) {
        console.error('Parse error:', outputData.slice(0, 500));
        res.status(500).json({ error: 'Failed to parse scheduler output' });
      }
    });

    pythonProcess.stdin.write(inputData);
    pythonProcess.stdin.end();

  } catch (error) {
    console.error('Scheduler controller error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET SCHEDULED TASKS (all days) ──────────────────────────
router.get('/', async (req: any, res: any) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.user.userId, date: { not: null } },
    orderBy: { date: 'asc' },
    include: { topic: true, subject: true, exam: true }
  });

  const timeToMins = (t: string | null) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const enriched = tasks.map((t: any) => {
    // Compute actual scheduled chunk size from startTime/endTime
    const scheduledMinutes =
      t.startTime && t.endTime
        ? timeToMins(t.endTime) - timeToMins(t.startTime)
        : (t.duration ?? null);

    return {
      ...t,
      scheduledMinutes,                          // actual chunk duration for display
      examName:    t.examName    ?? t.exam?.examName    ?? '',
      subjectName: t.subject?.name ?? '',
      topicName:   t.topic?.title  ?? '',
      focusType:   t.focusType ?? (
        t.difficulty === 'Hard' ? 'Deep Focus' :
        t.difficulty === 'Easy' ? 'Light Focus' : 'Active Recall'
      )
    };
  });

  res.json(enriched);
});

export default router;
