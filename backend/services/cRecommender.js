/*
 * services/cRecommender.js
 * ========================
 * Bridges Node.js → compiled C executable for preference-based recommendations.
 *
 * Spawns ./c-algorithms/room_allocator.exe, pipes JSON on stdin,
 * reads JSON from stdout. No shell string interpolation of user data.
 */

const { spawn } = require('child_process');
const path      = require('path');
const fs        = require('fs');

const C_EXE = path.join(__dirname, '..', '..', 'c-algorithms', 'room_allocator.exe');

/**
 * runCRecommender(rooms, preferences)
 * ------------------------------------
 * @param {Array}  rooms       - array of room objects from SQLite
 * @param {Object} preferences - student preference object
 * @returns {Promise<Array>}   - sorted array of scored room objects
 */
function runCRecommender(rooms, preferences) {
    return new Promise((resolve, reject) => {
        // Check executable exists
        if (!fs.existsSync(C_EXE)) {
            return reject(new Error(`C recommender executable not found at ${C_EXE}. Please compile it first.`));
        }

        const input = JSON.stringify({ preferences, rooms });

        const child = spawn(C_EXE, [], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        child.on('close', (code) => {
            if (code !== 0) {
                console.error('[C-Recommender] stderr:', stderr);
                return reject(new Error(`C recommender exited with code ${code}: ${stderr}`));
            }

            try {
                const result = JSON.parse(stdout.trim());
                if (!Array.isArray(result)) {
                    return reject(new Error('C recommender returned non-array output'));
                }
                resolve(result);
            } catch (parseErr) {
                console.error('[C-Recommender] Invalid JSON output:', stdout.slice(0, 500));
                reject(new Error('C recommender returned invalid JSON'));
            }
        });

        child.on('error', (err) => {
            reject(new Error(`Failed to start C recommender: ${err.message}`));
        });

        // Write input and close stdin
        child.stdin.write(input);
        child.stdin.end();

        // Safety timeout (3 seconds should be more than enough for 192 rooms)
        setTimeout(() => {
            child.kill();
            reject(new Error('C recommender timed out'));
        }, 3000);
    });
}

module.exports = { runCRecommender };
