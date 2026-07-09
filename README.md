# AI Study Planner Web App

An intelligent, adaptive, and data-driven study planner built with React, Node.js, Express, and Python.

## Core Features
1. **User Authentication**: Secure JWT-based login and signup.
2. **Dashboard**: Daily and weekly views of upcoming priority-based tasks.
3. **Subjects & Topics Input**: Highly interactive UI to add subjects and break them down into topics.
4. **Routine Setup**: Set wake and sleep times for dynamic scheduling.
5. **AI Scheduling Logic**: A Python-based engine that infers task difficulty based on topic names and generates prioritized deadlines.
6. **Adaptive Rescheduling**: Generate new schedules on demand representing only pending topics.
7. **Calendar**: Visual weekly timetable view.
8. **Analytics**: Track your progress score, topics mastered, and more.

## Prerequisites
- Node.js (v18+)
- Python (v3.8+)
- SQLite (pre-configured)

## Setup Instructions

### 1. Database & Backend
From the root directory, configure the backend:
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```
The server will run on `http://localhost:5000`.

### 2. Frontend
Open another terminal, configure the frontend:
```bash
cd frontend
npm install
npm run dev
```
The app will run on `http://localhost:5173`.

## Architecture Details
- **Frontend**: Vite, React (TypeScript), Tailwind CSS.
- **Backend**: Node.js, Express, Prisma ORM, SQLite.
- **AI Engine**: Python standard library executing dynamic heuristic scheduling logic spawned by the Node server via `child_process`.
