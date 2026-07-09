"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
function getFocusType(difficulty) {
    if (difficulty === 'Hard')
        return 'Deep Focus';
    if (difficulty === 'Easy')
        return 'Light Focus';
    return 'Active Recall';
}
// ─── ASSIGNMENT ──────────────────────────────────────────────
router.post('/assignment', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, subjectId, topicId, deadline, duration, difficulty } = req.body;
    const task = yield prisma_1.default.task.create({
        data: {
            taskType: 'ASSIGNMENT',
            title,
            subjectId,
            topicId,
            deadline: deadline ? new Date(deadline) : null,
            duration: duration ? Math.round(parseFloat(duration)) : null, // duration is already converted to mins by frontend
            difficulty,
            focusType: getFocusType(difficulty),
            userId: req.user.userId
        }
    });
    res.json(task);
}));
// ─── EXAM (multi-exam per subject) ──────────────────────────
router.post('/exam', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subjectId, examName, examDate, topics } = req.body;
    // topics: Array<{name, difficulty, estimatedHours}>
    // 1. Create the Exam record
    const exam = yield prisma_1.default.exam.create({
        data: {
            examName: examName || 'Exam',
            examDate: new Date(examDate),
            subjectId,
            userId: req.user.userId
        }
    });
    // 2. Create each topic + revision task
    for (const t of topics) {
        let durationMins = 90; // Default fallback to 1.5 hours
        let estHours = 1.5;
        if (t.duration) {
            durationMins = Math.round(parseFloat(t.duration));
            estHours = durationMins / 60;
        }
        else if (t.estimatedHours) {
            estHours = parseFloat(t.estimatedHours);
            durationMins = Math.round(estHours * 60);
        }
        const topicObj = yield prisma_1.default.topic.create({
            data: {
                title: t.name || t.title,
                difficulty: t.difficulty || 'Medium',
                estimatedHours: estHours,
                subjectId,
                examId: exam.id
            }
        });
        yield prisma_1.default.task.create({
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
    yield prisma_1.default.task.create({
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
}));
// ─── MARK COMPLETE ────────────────────────────────────────────
router.post('/:id/complete', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { completionPercentage } = req.body;
    yield prisma_1.default.task.updateMany({
        where: { id: req.params.id, userId: req.user.userId },
        data: {
            isCompleted: true,
            completionPercentage: completionPercentage ? parseInt(completionPercentage) : 100
        }
    });
    res.json({ success: true });
}));
exports.default = router;
