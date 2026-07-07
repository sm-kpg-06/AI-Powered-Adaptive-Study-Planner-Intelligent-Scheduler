"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const subjects_1 = __importDefault(require("./routes/subjects"));
const topics_1 = __importDefault(require("./routes/topics"));
const routine_1 = __importDefault(require("./routes/routine"));
const schedule_1 = __importDefault(require("./routes/schedule"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/subjects', subjects_1.default);
app.use('/api/topics', topics_1.default);
app.use('/api/routine', routine_1.default);
app.use('/api/schedule', schedule_1.default);
app.use('/api/calendar', calendar_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/feedback', feedback_1.default);
app.get('/', (req, res) => {
    res.send('AI Study Planner API is running');
});
const frontendDistPath = path_1.default.join(__dirname, '../../frontend/dist');
app.use(express_1.default.static(frontendDistPath));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(frontendDistPath, 'index.html'));
});
exports.server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running natively on 0.0.0.0:${PORT}`);
});
