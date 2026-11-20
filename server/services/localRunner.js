// ============================================================
//  Local "test mode" runner - runs player code on THIS computer
//  instead of Judge0. Turn it on with CODE_RUNNER=local in .env.
//
//  ⚠️ For demos on your own PC only - never put this online.
//
//  Safety measures (Node's built-in "permission model"):
//   --permission        -> code may NOT write files, start programs,
//                          or create worker threads
//   --allow-fs-read=... -> it may read ONLY its own script file
//   timeout             -> killed after 2s (stops infinite loops)
//   max-old-space-size  -> max ~64 MB of memory
// ============================================================
import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const TIME_LIMIT_MS = 2000;
const MAX_OUTPUT_BYTES = 1024 * 1024; // 1 MB of console output

// Same status ids as Judge0, so codeRunner.js treats both runners the same way.
const STATUS = { ACCEPTED: 3, TIME_LIMIT: 5, RUNTIME_ERROR: 11 };

export async function runLocally(source) {
  // A fresh temporary folder for every run, deleted afterwards.
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bhr-'));
  const file = path.join(dir, 'solution.js');
  await fs.writeFile(file, source, 'utf8');

  try {
    return await new Promise((resolve) => {
      execFile(
        process.execPath, // the same `node` that runs our server
        ['--permission', `--allow-fs-read=${file}`, '--max-old-space-size=64', file],
        {
          cwd: dir,
          timeout: TIME_LIMIT_MS,
          maxBuffer: MAX_OUTPUT_BYTES,
          env: {}, // don't leak our .env secrets (JWT_SECRET etc.) to player code
          windowsHide: true,
        },
        (err, stdout, stderr) => {
          // Hide the temp folder path from error messages: show "solution.js" instead.
          const clean = (text) => String(text).split(file).join('solution.js');

          if (!err) {
            return resolve({ stdout, stderr: clean(stderr), statusId: STATUS.ACCEPTED, statusText: 'Accepted' });
          }
          if (err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
            return resolve({ stdout: '', stderr: 'Too much console output (max 1 MB)', statusId: STATUS.RUNTIME_ERROR, statusText: 'Runtime Error' });
          }
          if (err.killed) {
            return resolve({ stdout, stderr: '', statusId: STATUS.TIME_LIMIT, statusText: 'Time Limit Exceeded' });
          }
          resolve({ stdout, stderr: clean(stderr || err.message), statusId: STATUS.RUNTIME_ERROR, statusText: 'Runtime Error' });
        }
      );
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
