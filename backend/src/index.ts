import path from 'path';
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

const frontendDistPath = path.join(__dirname, '../../frontend/dist');
console.log(`Frontend dist path: ${frontendDistPath}`);

app.use(express.static(frontendDistPath));

// Serve index.html for all unmatched routes (SPA routing)
app.get(/.*/, (req, res) => {
  const indexPath = path.join(frontendDistPath, 'index.html');
  console.log(`Serving SPA for ${req.path}, sending: ${indexPath}`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`Error serving index.html: ${err.message}`);
      res.status(404).send('index.html not found');
    }
  });
});

export const server = app.listen(PORT as number, '0.0.0.0', () => {
  console.log(`Server is running natively on 0.0.0.0:${PORT}`);
});
