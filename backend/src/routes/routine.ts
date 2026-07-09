import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: any, res: any) => {
  let routine = await prisma.routine.findUnique({ where: { userId: req.user.userId } });
  if (!routine) {
    routine = await prisma.routine.create({ data: { userId: req.user.userId } });
  }
  res.json(routine);
});

router.put('/', async (req: any, res: any) => {
  const { wakeTime, sleepTime, isWeekendDifferent, weekendWakeTime, weekendSleepTime, breakfastTime, lunchTime, dinnerTime, timetable } = req.body;
  const routine = await prisma.routine.upsert({
    where: { userId: req.user.userId },
    update: { wakeTime, sleepTime, isWeekendDifferent, weekendWakeTime, weekendSleepTime, breakfastTime, lunchTime, dinnerTime, timetable },
    create: { userId: req.user.userId, wakeTime, sleepTime, isWeekendDifferent, weekendWakeTime, weekendSleepTime, breakfastTime, lunchTime, dinnerTime, timetable }
  });
  res.json(routine);
});

export default router;
