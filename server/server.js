const express = require('express');
const usersRouter = require('./routes/users.routes');
const settingsRouter = require('./routes/settings.routes');
const attendanceRouter = require('./routes/attendance.routes');
const idsRouter = require('./routes/ids.routes');
const authRouter = require('./routes/auth.routes');
const holidaysRouter = require('./routes/holidays.routes');
const weekoffsRouter = require('./routes/weekoffs.routes');
const attendanceRulesRouter = require('./routes/attendance-rules.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = ['http://localhost:4200', 'https://my-attendance-u7hz.onrender.com'];

app.use(express.json());

// Manual CORS handling with dynamic origin checking
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Check if the incoming request origin is in our allowed list
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle browser preflight (OPTIONS) check
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/ids', idsRouter);
app.use('/api/auth', authRouter);
app.use('/api/holidays', holidaysRouter);
app.use('/api/weekoffs', weekoffsRouter);
app.use('/api/attendance-rules', attendanceRulesRouter);

app.listen(PORT, () => {
    console.log(
        `Attendance JSON file server listening on http://localhost:${PORT}`
    );
});