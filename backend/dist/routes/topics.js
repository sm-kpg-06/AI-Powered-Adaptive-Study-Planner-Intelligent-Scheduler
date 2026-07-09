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
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, difficulty, subjectId } = req.body;
    const subject = yield prisma_1.default.subject.findFirst({ where: { id: subjectId, userId: req.user.userId } });
    if (!subject)
        return res.status(403).json({ error: 'Unauthorized subject' });
    const topic = yield prisma_1.default.topic.create({
        data: { title, difficulty: difficulty || 'Medium', subjectId }
    });
    res.json(topic);
}));
router.patch('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const topic = yield prisma_1.default.topic.update({
        where: { id: req.params.id },
        data: req.body
    });
    res.json(topic);
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.topic.deleteMany({
        where: { id: req.params.id }
    });
    res.json({ success: true });
}));
exports.default = router;
