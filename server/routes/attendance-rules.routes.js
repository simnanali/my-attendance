const express = require('express');
const { readJsonFile, writeJsonFile } = require('../utils/fileStore');

const router = express.Router();
const RULES_FILE = 'attendance-rules.json';

const DEFAULT_RULES = {
  attendanceRules: {
    standardWorkingMinutes: 480,
    fullDayThresholdMinutes: 360,
    halfDayThresholdMinutes: 240,
  },
};

router.get('/', async (req, res) => {
  try {
    const data = await readJsonFile(RULES_FILE, DEFAULT_RULES);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read attendance rules file.' });
  }
});

router.put('/', async (req, res) => {
  const { standardWorkingMinutes, fullDayThresholdMinutes, halfDayThresholdMinutes } = req.body;
  const values = [standardWorkingMinutes, fullDayThresholdMinutes, halfDayThresholdMinutes];

  if (values.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
    return res.status(400).json({ error: 'All three thresholds must be numbers.' });
  }

  // Defensive re-check of the core invariant (Section 16), mirroring
  // the client-side validator — a narrow safety primitive, not
  // business logic, matching the precedent already approved for
  // password hashing in Phase 3.
  const isValid =
    standardWorkingMinutes > fullDayThresholdMinutes &&
    fullDayThresholdMinutes > halfDayThresholdMinutes &&
    halfDayThresholdMinutes > 0;

  if (!isValid) {
    return res.status(400).json({
      error:
        'Invalid configuration: Standard Working Minutes must be greater than the Full Day Threshold, which must be greater than the Half Day Threshold, which must be greater than 0.',
    });
  }

  try {
    await writeJsonFile(RULES_FILE, {
      attendanceRules: { standardWorkingMinutes, fullDayThresholdMinutes, halfDayThresholdMinutes },
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to write attendance rules file.' });
  }
});

module.exports = router;