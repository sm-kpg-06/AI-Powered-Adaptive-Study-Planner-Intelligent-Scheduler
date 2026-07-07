import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', async (req: any, res) => {
  const { title, difficulty, subjectId } = req.body;
  
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId: req.user.userId }});
  if (!subject) return res.status(403).json({ error: 'Unauthorized subject' });

  const topic = await prisma.topic.create({
    data: { title, difficulty: difficulty || 'Medium', subjectId }
  });
  res.json(topic);
});

router.patch('/:id', async (req: any, res) => {
  const topic = await prisma.topic.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(topic);
});

router.delete('/:id', async (req: any, res) => {
  await prisma.topic.deleteMany({
    where: { id: req.params.id }
  });
  res.json({ success: true });
});

export default router;
