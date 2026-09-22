const express = require('express');
const { readJsonFile, writeJsonFile } = require('../utils/fileStore');

const router = express.Router();
const HOLIDAYS_FILE = 'holidays.json';

router.get('/', async (req, res) => {
  try {
    const data = await readJsonFile(HOLIDAYS_FILE, { holidays: [] });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read holidays file.' });
  }
});

router.put('/', async (req, res) => {
  const { holidays } = req.body;
  if (!Array.isArray(holidays)) {
    return res
      .status(400)
      .json({ error: 'Request body must contain a "holidays" array.' });
  }
  try {
    await writeJsonFile(HOLIDAYS_FILE, { holidays });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to write holidays file.' });
  }
});

module.exports = router;