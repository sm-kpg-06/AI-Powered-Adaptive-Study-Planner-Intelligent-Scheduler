import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { startOfDay } from 'date-fns';

const router = Router();
router.use(authenticate);

// Get the daily log for today to see if user reported
router.get('/today', async (req: any, res: any) => {
  const today = startOfDay(new Date());
  
  let log = await prisma.dailyLog.findFirst({
    where: { userId: req.user.userId, date: today }
  });

  if (!log) {
    log = await prisma.dailyLog.create({
      data: { userId: req.user.userId, date: today }
    });
  }
  
  const yesterdayTasks = await prisma.task.findMany({
    where: { 
      userId: req.user.userId,
      date: { lt: today, gte: startOfDay(new Date(Date.now() - 86400000)) }
    }
  });

  res.json({ log, yesterdayTasks });
});

// Submit daily feedback
router.post('/submit', async (req: any, res: any) => {
  const { logId, feedbackData, taskCompletionMap } = req.body; 
  // taskCompletionMap: { [taskId: string]: number (0-100) }
  
  await prisma.dailyLog.update({
    where: { id: logId, userId: req.user.userId },
    data: { reported: true, feedbackData: JSON.stringify(feedbackData) }
  });

  if (taskCompletionMap) {
     for (const [id, percentage] of Object.entries(taskCompletionMap)) {
         const perc = percentage as number;
         const task = await prisma.task.findUnique({ where: { id } });
         if (!task) continue;

         if (perc >= 100) {
             await prisma.task.update({ where: { id }, data: { isCompleted: true, completionPercentage: 100 } });
         } else if (perc === 0) {
             // Totally missed, throw it back to scheduler natively
             await prisma.task.update({ where: { id }, data: { isMissed: true, isCompleted: false, date: null } });
         } else {
             // Partially completed! Dynamic programmatic split.
             const remainingDuration = task.duration ? Math.round(task.duration * ((100 - perc) / 100)) : 30;
             
             // 1. Mark original as completed at X%
             await prisma.task.update({ where: { id }, data: { isCompleted: true, completionPercentage: perc } });

             // 2. Clone remaining block perfectly for AI rescheduling array
             await prisma.task.create({
                 data: {
                    taskType: task.taskType,
                    title: `${task.title} (Continuation)`,
                    userId: task.userId,
                    subjectId: task.subjectId,
                    topicId: task.topicId,
                    deadline: task.deadline,
                    difficulty: task.difficulty,
                    duration: remainingDuration,
                    isCompleted: false,
                    isMissed: true
                 }
             });
         }
     }
  }

  res.json({ success: true });
});

export default router;
