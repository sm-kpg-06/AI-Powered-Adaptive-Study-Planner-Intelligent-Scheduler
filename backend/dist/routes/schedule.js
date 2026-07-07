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
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ─── GENERATE SCHEDULE ────────────────────────────────────────
router.post('/generate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const routine = yield prisma_1.default.routine.findUnique({ where: { userId } });
        if (!routine)
            return res.status(400).json({ error: 'Please configure your routine first.' });
        const events = yield prisma_1.default.calendarEvent.findMany({ where: { userId } });
        // ── STEP 1: Delete stale split-child tasks from previous generation ──
        yield prisma_1.default.task.deleteMany({ where: { userId, isSubTask: true } });
        // ── STEP 2: Fetch ORIGINAL (non-subTask) incomplete tasks ────────────
        const rawTasks = yield prisma_1.default.task.findMany({
            where: { userId, isCompleted: false, isSubTask: false },
            include: { subject: true, topic: true, exam: true }
        });
        // Build enriched payload for Python
        const tasks = rawTasks.map((t) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            return ({
                id: t.id,
                title: t.title,
                taskType: t.taskType,
                difficulty: t.difficulty,
                duration: t.duration, // in minutes
                deadline: (_b = (_a = t.deadline) === null || _a === void 0 ? void 0 : _a.toISOString()) !== null && _b !== void 0 ? _b : null,
                examDate: (_d = (_c = t.examDate) === null || _c === void 0 ? void 0 : _c.toISOString()) !== null && _d !== void 0 ? _d : null,
                focusType: t.focusType,
                examName: (_g = (_e = t.examName) !== null && _e !== void 0 ? _e : (_f = t.exam) === null || _f === void 0 ? void 0 : _f.examName) !== null && _g !== void 0 ? _g : '',
                examId: (_h = t.examId) !== null && _h !== void 0 ? _h : '',
                subjectId: (_j = t.subjectId) !== null && _j !== void 0 ? _j : '',
                subjectName: (_l = (_k = t.subject) === null || _k === void 0 ? void 0 : _k.name) !== null && _l !== void 0 ? _l : '',
                topicName: (_o = (_m = t.topic) === null || _m === void 0 ? void 0 : _m.title) !== null && _o !== void 0 ? _o : '',
                date: (_q = (_p = t.date) === null || _p === void 0 ? void 0 : _p.toISOString()) !== null && _q !== void 0 ? _q : null,
            });
        });
        const inputData = JSON.stringify({ routine, events, tasks });
        const pythonScriptPath = path_1.default.join(__dirname, '../ai/scheduler.py');
        const pythonProcess = (0, child_process_1.spawn)('python3', [pythonScriptPath]);
        let outputData = '';
        let errorData = '';
        pythonProcess.stdout.on('data', (d) => { outputData += d.toString(); });
        pythonProcess.stderr.on('data', (d) => {
            errorData += d.toString();
            console.error('Scheduler stderr:', d.toString());
        });
        pythonProcess.on('close', (code) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            if (code !== 0) {
                return res.status(500).json({ error: 'Scheduler failed: ' + errorData });
            }
            try {
                const result = JSON.parse(outputData);
                if (result.error)
                    return res.status(400).json({ error: result.error });
                // Known original task IDs from DB
                const knownIds = new Set(rawTasks.map((rt) => rt.id));
                // ── STEP 3: Persist scheduled tasks ─────────────────────────────
                for (const t of result.schedule) {
                    if (t._unscheduled || !t.scheduledDate)
                        continue;
                    const commonData = {
                        date: new Date(t.scheduledDate),
                        startTime: (_a = t.startTime) !== null && _a !== void 0 ? _a : null,
                        endTime: (_b = t.endTime) !== null && _b !== void 0 ? _b : null,
                        difficulty: (_c = t.difficulty) !== null && _c !== void 0 ? _c : null,
                        focusType: (_d = t.focusType) !== null && _d !== void 0 ? _d : null,
                        examName: (_e = t.examName) !== null && _e !== void 0 ? _e : null,
                    };
                    if (knownIds.has(t.id)) {
                        // Original task (Part 1) — UPDATE scheduling fields ONLY.
                        // Do NOT overwrite duration: the DB must keep the full original
                        // duration (e.g. 360 min) so future regenerations split correctly.
                        yield prisma_1.default.task.update({ where: { id: t.id }, data: commonData });
                    }
                    else {
                        // Split child (part 2, 3, …) — CREATE a new row marked isSubTask
                        const parentId = t._parentId || t.id.replace(/_p\d+$/, '');
                        const parent = rawTasks.find((rt) => rt.id === parentId);
                        if (!parent)
                            continue;
                        yield prisma_1.default.task.create({
                            data: Object.assign(Object.assign({}, commonData), { duration: (_f = t.duration) !== null && _f !== void 0 ? _f : null, isSubTask: true, taskType: parent.taskType, title: t.title, subjectId: (_g = parent.subjectId) !== null && _g !== void 0 ? _g : null, topicId: (_h = parent.topicId) !== null && _h !== void 0 ? _h : null, examId: (_j = parent.examId) !== null && _j !== void 0 ? _j : null, examName: (_l = (_k = t.examName) !== null && _k !== void 0 ? _k : parent.examName) !== null && _l !== void 0 ? _l : null, deadline: (_m = parent.deadline) !== null && _m !== void 0 ? _m : null, userId })
                        });
                    }
                }
                res.json({
                    message: 'Schedule generated successfully',
                    schedule: result.schedule,
                    dailyView: result.dailyView,
                });
            }
            catch (err) {
                console.error('Parse error:', outputData.slice(0, 500));
                res.status(500).json({ error: 'Failed to parse scheduler output' });
            }
        }));
        pythonProcess.stdin.write(inputData);
        pythonProcess.stdin.end();
    }
    catch (error) {
        console.error('Scheduler controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// ─── GET SCHEDULED TASKS (all days) ──────────────────────────
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tasks = yield prisma_1.default.task.findMany({
        where: { userId: req.user.userId, date: { not: null } },
        orderBy: { date: 'asc' },
        include: { topic: true, subject: true, exam: true }
    });
    const timeToMins = (t) => {
        if (!t)
            return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    const enriched = tasks.map((t) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        // Compute actual scheduled chunk size from startTime/endTime
        const scheduledMinutes = t.startTime && t.endTime
            ? timeToMins(t.endTime) - timeToMins(t.startTime)
            : ((_a = t.duration) !== null && _a !== void 0 ? _a : null);
        return Object.assign(Object.assign({}, t), { scheduledMinutes, examName: (_d = (_b = t.examName) !== null && _b !== void 0 ? _b : (_c = t.exam) === null || _c === void 0 ? void 0 : _c.examName) !== null && _d !== void 0 ? _d : '', subjectName: (_f = (_e = t.subject) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : '', topicName: (_h = (_g = t.topic) === null || _g === void 0 ? void 0 : _g.title) !== null && _h !== void 0 ? _h : '', focusType: (_j = t.focusType) !== null && _j !== void 0 ? _j : (t.difficulty === 'Hard' ? 'Deep Focus' :
                t.difficulty === 'Easy' ? 'Light Focus' : 'Active Recall') });
    });
    res.json(enriched);
}));
exports.default = router;
