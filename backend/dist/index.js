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
const frontendDistPath = path_1.default.join(__dirname, '../../frontend/dist');
console.log(`Frontend dist path: ${frontendDistPath}`);
app.use(express_1.default.static(frontendDistPath));
// Serve index.html for all unmatched routes (SPA routing)
app.get(/.*/, (req, res) => {
    const indexPath = path_1.default.join(frontendDistPath, 'index.html');
    console.log(`Serving SPA for ${req.path}, sending: ${indexPath}`);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error(`Error serving index.html: ${err.message}`);
            res.status(404).send('index.html not found');
        }
    });
});
exports.server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running natively on 0.0.0.0:${PORT}`);
});
