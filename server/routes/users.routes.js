const express = require('express');
const { readJsonFile, writeJsonFile } = require('../utils/fileStore');

const router = express.Router();
const USERS_FILE = 'users.json';

router.get('/', async (req, res) => {
    try {
        const data = await readJsonFile(USERS_FILE, { users: [] });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read users file.' });
    }
});

router.put('/', async (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
        return res
            .status(400)
            .json({ error: 'Request body must contain a "users" array.' });
    }
    try {
        await writeJsonFile(USERS_FILE, { users });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to write users file.' });
    }
});

module.exports = router;
