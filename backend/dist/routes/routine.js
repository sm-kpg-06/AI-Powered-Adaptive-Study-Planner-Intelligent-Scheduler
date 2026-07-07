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
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let routine = yield prisma_1.default.routine.findUnique({ where: { userId: req.user.userId } });
    if (!routine) {
        routine = yield prisma_1.default.routine.create({ data: { userId: req.user.userId } });
    }
    res.json(routine);
}));
router.put('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { wakeTime, sleepTime, isWeekendDifferent, weekendWakeTime, weekendSleepTime, breakfastTime, lunchTime, dinnerTime, timetable } = req.body;
    const routine = yield prisma_1.default.routine.upsert({
        where: { userId: req.user.userId },
        update: { wakeTime, sleepTime, isWeekendDifferent, weekendWakeTime, weekendSleepTime, breakfastTime, lunchTime, dinnerTime, timetable },
        create: { userId: req.user.userId, wakeTime, sleepTime, isWeekendDifferent, weekendWakeTime, weekendSleepTime, breakfastTime, lunchTime, dinnerTime, timetable }
    });
    res.json(routine);
}));
exports.default = router;
