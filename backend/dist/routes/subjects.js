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
    const subjects = yield prisma_1.default.subject.findMany({
        where: { userId: req.user.userId },
        include: { topics: true }
    });
    res.json(subjects);
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, color } = req.body;
    const subject = yield prisma_1.default.subject.create({
        data: { name, color: color || '#3B82F6', userId: req.user.userId }
    });
    res.json(subject);
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.subject.deleteMany({
        where: { id: req.params.id, userId: req.user.userId }
    });
    res.json({ success: true });
}));
exports.default = router;
