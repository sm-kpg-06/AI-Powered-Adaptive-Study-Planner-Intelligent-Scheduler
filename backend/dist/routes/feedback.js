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
const date_fns_1 = require("date-fns");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Get the daily log for today to see if user reported
router.get('/today', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const today = (0, date_fns_1.startOfDay)(new Date());
    let log = yield prisma_1.default.dailyLog.findFirst({
        where: { userId: req.user.userId, date: today }
    });
    if (!log) {
        log = yield prisma_1.default.dailyLog.create({
            data: { userId: req.user.userId, date: today }
        });
    }
    const yesterdayTasks = yield prisma_1.default.task.findMany({
        where: {
            userId: req.user.userId,
            date: { lt: today, gte: (0, date_fns_1.startOfDay)(new Date(Date.now() - 86400000)) }
        }
    });
    res.json({ log, yesterdayTasks });
}));
// Submit daily feedback
router.post('/submit', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { logId, feedbackData, taskCompletionMap } = req.body;
    // taskCompletionMap: { [taskId: string]: number (0-100) }
    yield prisma_1.default.dailyLog.update({
        where: { id: logId, userId: req.user.userId },
        data: { reported: true, feedbackData: JSON.stringify(feedbackData) }
    });
    if (taskCompletionMap) {
        for (const [id, percentage] of Object.entries(taskCompletionMap)) {
            const perc = percentage;
            const task = yield prisma_1.default.task.findUnique({ where: { id } });
            if (!task)
                continue;
            if (perc >= 100) {
                yield prisma_1.default.task.update({ where: { id }, data: { isCompleted: true, completionPercentage: 100 } });
            }
            else if (perc === 0) {
                // Totally missed, throw it back to scheduler natively
                yield prisma_1.default.task.update({ where: { id }, data: { isMissed: true, isCompleted: false, date: null } });
            }
            else {
                // Partially completed! Dynamic programmatic split.
                const remainingDuration = task.duration ? Math.round(task.duration * ((100 - perc) / 100)) : 30;
                // 1. Mark original as completed at X%
                yield prisma_1.default.task.update({ where: { id }, data: { isCompleted: true, completionPercentage: perc } });
                // 2. Clone remaining block perfectly for AI rescheduling array
                yield prisma_1.default.task.create({
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
}));
exports.default = router;
