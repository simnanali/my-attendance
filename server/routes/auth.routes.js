const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();
const SALT_ROUNDS = 10;

/**
 * Password hashing/verification only — no user lookup, no business
 * rules. AuthService (Angular) owns all of that; this keeps the
 * server's only non-file-I/O responsibility narrowly scoped to a
 * cryptographic primitive, matching what the future .NET API would
 * do server-side as well (BCrypt.Net instead of bcryptjs).
 */
router.post('/hash', async (req, res) => {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: 'password is required.' });
    }
    try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        res.json({ hash });
    } catch (err) {
        res.status(500).json({ error: 'Failed to hash password.' });
    }
});

router.post('/verify', async (req, res) => {
    const { password, hash } = req.body;
    if (!password || !hash) {
        return res.status(400).json({ error: 'password and hash are required.' });
    }
    try {
        const valid = await bcrypt.compare(password, hash);
        res.json({ valid });
    } catch (err) {
        res.status(500).json({ error: 'Failed to verify password.' });
    }
});

module.exports = router;
