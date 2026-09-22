const express = require('express');
const { readJsonFile, writeJsonFile } = require('../utils/fileStore');

const router = express.Router();
const WEEKOFFS_FILE = 'weekoffs.json';

const DEFAULT_WEEKOFFS = {
  weekoffs: [
    { dayOfWeek: 0, dayName: 'Sunday', isWeekoff: true },
    { dayOfWeek: 1, dayName: 'Monday', isWeekoff: false },
    { dayOfWeek: 2, dayName: 'Tuesday', isWeekoff: false },
    { dayOfWeek: 3, dayName: 'Wednesday', isWeekoff: false },
    { dayOfWeek: 4, dayName: 'Thursday', isWeekoff: false },
    { dayOfWeek: 5, dayName: 'Friday', isWeekoff: false },
    { dayOfWeek: 6, dayName: 'Saturday', isWeekoff: true },
  ],
};

router.get('/', async (req, res) => {
  try {
    const data = await readJsonFile(WEEKOFFS_FILE, DEFAULT_WEEKOFFS);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read weekoffs file.' });
  }
});

router.put('/', async (req, res) => {
  const { weekoffs } = req.body;
  if (!Array.isArray(weekoffs) || weekoffs.length !== 7) {
    return res.status(400).json({
      error: 'Request body must contain a "weekoffs" array of exactly 7 entries.',
    });
  }
  try {
    await writeJsonFile(WEEKOFFS_FILE, { weekoffs });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to write weekoffs file.' });
  }
});

module.exports = router;