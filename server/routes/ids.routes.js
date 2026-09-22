const express = require('express');
const { readJsonFile, writeJsonFile } = require('../utils/fileStore');

const router = express.Router();
const COUNTERS_FILE = 'counters.json';
const DEFAULT_COUNTERS = {
  nextUserId: 1,
  nextAttendanceDayId: 1,
  nextSessionId: 1,
  nextHolidayId: 1,
};

const ENTITY_CONFIG = {
  user: { counterKey: 'nextUserId', prefix: 'USR' },
  attendanceDay: { counterKey: 'nextAttendanceDayId', prefix: 'ATD' },
  session: { counterKey: 'nextSessionId', prefix: 'SES' },
  holiday: { counterKey: 'nextHolidayId', prefix: 'HOL' },
};

function formatId(prefix, number) {
  return `${prefix}-${String(number).padStart(6, '0')}`;
}

router.post('/next', async (req, res) => {
  const { type } = req.body;
  const config = ENTITY_CONFIG[type];
  if (!config) {
    return res.status(400).json({
      error: 'type must be one of "user", "attendanceDay", "session", or "holiday".',
    });
  }

  try {
    const counters = await readJsonFile(COUNTERS_FILE, DEFAULT_COUNTERS);
    // Falls back to 1 if this key is missing — e.g. an existing
    // counters.json from before this phase won't have nextHolidayId yet.
    const currentValue = counters[config.counterKey] ?? 1;
    const id = formatId(config.prefix, currentValue);

    counters[config.counterKey] = currentValue + 1;
    await writeJsonFile(COUNTERS_FILE, counters);

    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate ID.' });
  }
});

module.exports = router;