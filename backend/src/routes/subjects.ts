import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: any, res) => {
  const subjects = await prisma.subject.findMany({ 
    where: { userId: req.user.userId }, 
    include: { topics: true } 
  });
  res.json(subjects);
});

router.post('/', async (req: any, res) => {
  const { name, color } = req.body;
  const subject = await prisma.subject.create({
    data: { name, color: color || '#3B82F6', userId: req.user.userId }
  });
  res.json(subject);
});

router.delete('/:id', async (req: any, res) => {
  await prisma.subject.deleteMany({
    where: { id: req.params.id, userId: req.user.userId }
  });
  res.json({ success: true });
});

export default router;
