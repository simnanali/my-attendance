const express = require('express');
const { readJsonFile, writeJsonFile } = require('../utils/fileStore');

const router = express.Router();
const SETTINGS_FILE = 'settings.json';
const DEFAULT_SETTINGS = { theme: 'light' };

router.get('/', async (req, res) => {
    try {
        const data = await readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read settings file.' });
    }
});

router.put('/', async (req, res) => {
    const { theme } = req.body;
    if (theme !== 'light' && theme !== 'dark') {
        return res.status(400).json({ error: 'theme must be "light" or "dark".' });
    }
    try {
        await writeJsonFile(SETTINGS_FILE, { theme });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to write settings file.' });
    }
});

module.exports = router;
