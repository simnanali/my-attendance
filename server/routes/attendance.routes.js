const express = require('express');
const { readJsonFile, writeJsonFile } = require('../utils/fileStore');

const router = express.Router();

function monthFileName(year, month) {
    const paddedMonth = String(month).padStart(2, '0');
    return `attendance/${year}-${paddedMonth}.json`;
}

function parseYearMonth(req, res) {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
    ) {
        res.status(400).json({ error: 'Invalid year or month.' });
        return null;
    }
    return { year, month };
}

router.get('/:year/:month', async (req, res) => {
    const parsed = parseYearMonth(req, res);
    if (!parsed) return;
    const { year, month } = parsed;

    try {
        const fileName = monthFileName(year, month);
        const defaultFile = { year, month, attendance: [] };
        const data = await readJsonFile(fileName, defaultFile);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read attendance file.' });
    }
});

router.put('/:year/:month', async (req, res) => {
    const parsed = parseYearMonth(req, res);
    if (!parsed) return;
    const { year, month } = parsed;

    const { attendance } = req.body;
    if (!Array.isArray(attendance)) {
        return res
            .status(400)
            .json({ error: 'Request body must contain an "attendance" array.' });
    }

    try {
        const fileName = monthFileName(year, month);
        await writeJsonFile(fileName, { year, month, attendance });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to write attendance file.' });
    }
});

module.exports = router;
