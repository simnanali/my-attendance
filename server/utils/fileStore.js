const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

/**
 * Reads a JSON file under /data. If the file does not exist yet,
 * returns defaultValue instead of throwing — this is what lets
 * per-month attendance files be created lazily on first save rather
 * than requiring every month to be pre-seeded.
 */
async function readJsonFile(relativePath, defaultValue) {
    const fullPath = path.join(DATA_DIR, relativePath);
    try {
        const raw = await fs.readFile(fullPath, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return defaultValue;
        }
        throw err;
    }
}

async function writeJsonFile(relativePath, data) {
    const fullPath = path.join(DATA_DIR, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { DATA_DIR, readJsonFile, writeJsonFile };
