# Final Project Report: AI Study Planner

## 1. Abstract & Introduction
The **AI Study Planner** is an intelligent, adaptive, and data-driven web application designed to help students optimize their academic preparation. In traditional study planning, students often struggle to allocate appropriate time to complex topics, manage encroaching deadlines, and balance their daily routines. The AI Study Planner solves this by providing dynamic heuristic text-based scheduling. 

By analyzing user-inputted subjects, topics, and exam deadlines alongside personal daily routines (wake times, sleep times, meal times), the application’s Python-based AI Engine automatically breaks down tasks, infers difficulty, and dynamically schedules optimal study windows focused explicitly on impending exams.

## 2. System Architecture & Technology Stack
The application adopts a robust Client-Server architecture with an integrated Python AI module:
*   **Frontend (User Interface):** Built using **React (TypeScript)** and **Vite** for fast client-side rendering. **Tailwind CSS** is utilized to provide a highly interactive, responsive, and visually appealing dashboard.
*   **Backend (API & Business Logic):** A **Node.js/Express** server orchestrates the application logic, secure JWT-based authentication, and API endpoints. 
*   **Database Integration:** Implemented using **Prisma ORM** coupled with a **SQLite** database, guaranteeing type-safe database queries and an easily deployable local persistent data store.
*   **AI Engine (Scheduling & OCR):** A separate **Python** script ecosystem (`scheduler.py`, `ocr.py`) is invoked via Unix child_process spawning. It utilizes Data Science and Machine Learning tools including **Tesseract OCR (via `pytesseract`)** and **Pillow (PIL)** for computer vision data extraction of timetables. Furthermore, it processes JSON dumps of database state, handling heuristics-based task chunking and time allocation to return actionable scheduled tasks.

## 3. Database Design (Core Entities)
The database schema involves heavily relational data that models the academic ecosystem of a student:
1.  **User & Routine:** Securely stores user credentials and individualized routine constraints (e.g., wake schemas, weekend variations, and fixed busy events).
2.  **Subject, Exam, & Topic:** Forms a nested hierarchy. Subjects contain Exams, and Exams contain granular Topics. Topics hold metadata like difficulty and estimated hours.
3.  **Task:** The central hub of execution. The system creates 'Tasks' from 'Topics'. Features logic for boolean tracking (`isCompleted`, `isSubTask`, `isMissed`) and contextual assignments (`focusType`, `completionPercentage`).

## 4. AI Scheduling Algorithm & Logic
The core novelty of the AI Study Planner lies in its dynamic, heuristic-based scheduler:
*   **Priority & Deadline Enforcement:** The engine calculates the closest `examDate` and sorts pending topics by urgency. Earlier deadlines are addressed and scheduled first.
*   **Intelligent Task Splitting:** To avoid overwhelming the student or bridging boundaries like meal limits, large topics (> 60-120 minutes) are algorithmically split into sub-tasks (Part 1, Part 2, etc.). Each sub-task is uniquely persisted via Prisma.
*   **Dynamic Time Allocation:** It evaluates a user's daily `Free Slots` (Total Schedule minus Sleep/Meals/Classes) to distribute chunks securely within boundaries without overlapping.
*   **Idempotent Regeneration:** If a user gets off-track, the scheduler can be manually reinvoked. It will safely drop uncompleted future tasks and re-plan without cascading re-splits or duplications.

## 5. Final Results & Project Output
The development has resulted in a stable, multi-faceted platform successfully resolving the core planning problem:
*   **Priority-Based Dashboard:** Users now receive an accurate daily and weekly view of upcoming priority tasks. Rather than showing total topic durations, the UI intelligently displays accurately segmented task-chunk durations.
*   **Adaptive Rescheduling functionality:** Users seamlessly trigger new schedules, empowering adaptive recovery from missed days.
*   **Analytics Tracking:** Progress scores, topics mastered, and daily logging accurately reflect granular progress over time.
*   **Performance:** The architectural decision to decouple the Node Server and the heavy Python Engine guarantees non-blocking I/O event loops leading to instant UI response times.

## 6. Conclusion and Future Scope
The AI Study Planner successfully modernizes academic scheduling by transferring the cognitive load of timetabling from the student to an intelligent algorithm. 

**Future enhancements could include:**
1.  Integration of Natural Language Processing (NLP) or Large Language Models (LLMs) to automatically estimate topic difficulties based on syllabus text parsing. 
2.  Push notifications and integration with Google Calendar/Apple Calendar endpoints via OAuth.
3.  Expanded analytics with Predictive Grading based on study depth vs. historical examination structures.
