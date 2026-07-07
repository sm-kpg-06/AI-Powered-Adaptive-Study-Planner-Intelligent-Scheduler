import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import subjectsRoutes from './routes/subjects';
import topicsRoutes from './routes/topics';
import routineRoutes from './routes/routine';
import scheduleRoutes from './routes/schedule';
import calendarRoutes from './routes/calendar';
import tasksRoutes from './routes/tasks';
import feedbackRoutes from './routes/feedback';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/routine', routineRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/feedback', feedbackRoutes);

app.get('/', (req, res) => {
  res.send('AI Study Planner API is running');
});

export const server = app.listen(PORT as number, '0.0.0.0', () => {
  console.log(`Server is running natively on 0.0.0.0:${PORT}`);
});
