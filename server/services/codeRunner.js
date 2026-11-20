// ============================================================
//  Code runner - runs a player's code against a challenge's tests.
//
//  Two modes, picked by CODE_RUNNER in .env:
//   judge0 -> Judge0's cloud sandbox (safe for a public website)
//   local  -> this PC, see localRunner.js (demo / testing only)
//
//  Trick to save API quota: instead of 1 Judge0 call per test,
//  we build ONE program = player's code + a small "test harness"
//  that runs every test and prints the results as JSON.
// ============================================================
import axios from 'axios';
import crypto from 'crypto';
import { runLocally } from './localRunner.js';

// Read at call time (not import time) so it always matches the .env.
export const getRunnerName = () => (process.env.CODE_RUNNER === 'local' ? 'local' : 'judge0');

// 63 = "JavaScript (Node.js 12.14.0)" on Judge0 CE. It's on every Judge0
// install, but it is OLD: no `?.` or `??` in player code.
const LANGUAGE_ID = Number(process.env.JUDGE0_LANGUAGE_ID) || 63;

// Judge0 status ids we care about (full list: GET /statuses)
const STATUS = { ACCEPTED: 3, TIME_LIMIT: 5, COMPILE_ERROR: 6 };

const toBase64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const fromBase64 = (s) => (s ? Buffer.from(s, 'base64').toString('utf8') : '');

/**
 * Builds the program Judge0 will run.
 * `marker` is a random string so the results line can't be confused
 * with the player's own console.log output.
 */
function buildProgram(challenge, code, marker) {
  const tests = challenge.testCases.map((t) => ({ input: t.input, expected: t.expected }));
  const fn = challenge.functionName;

  // NOTE: written in old-style JS on purpose so it works on Judge0's Node 12.
  return `${code}

;(function () {
  var tests = ${JSON.stringify(tests)};
  var results = [];
  var fn = typeof ${fn} === 'function' ? ${fn} : null;

  // Turns any value into comparable text (undefined has no JSON form).
  function show(v) {
    var s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  }

  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var expected = show(JSON.parse(t.expected));
    try {
      if (!fn) throw new Error('Function "${fn}" was not found. Did you rename it?');
      var actual = show(fn.apply(null, JSON.parse(t.input)));
      results.push({ passed: actual === expected, actual: actual });
    } catch (e) {
      results.push({ passed: false, error: String(e && e.message ? e.message : e) });
    }
  }

  console.log(${JSON.stringify(marker)} + JSON.stringify(results));
})();
`;
}

// Sends the program to Judge0 and waits for the answer.
async function runOnJudge0(source) {
  const headers = { 'Content-Type': 'application/json' };
  // RapidAPI-hosted Judge0 needs these two headers. A self-hosted Judge0 doesn't.
  if (process.env.JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = process.env.JUDGE0_HOST;
  }

  // wait=true -> Judge0 replies with the result directly (no polling needed).
  // base64 -> safe transport for any characters in the code/output.
  const { data } = await axios.post(
    `${process.env.JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
    {
      language_id: LANGUAGE_ID,
      source_code: toBase64(source),
      cpu_time_limit: 2, // seconds - stops infinite loops quickly
      wall_time_limit: 5,
    },
    { headers, timeout: 20000 }
  );

  return {
    stdout: fromBase64(data.stdout),
    stderr: fromBase64(data.stderr) || fromBase64(data.compile_output),
    statusId: data.status?.id,
    statusText: data.status?.description,
  };
}

/**
 * Run the player's code against every test of the challenge.
 * @returns {Promise<{ passed:number, total:number, results:Array, logs:string, error:string|null }>}
 */
export async function runTests(challenge, code) {
  const marker = `__BHR_${crypto.randomBytes(8).toString('hex')}__`;
  const total = challenge.testCases.length;
  const source = buildProgram(challenge, code, marker);

  // Run on this PC (test mode) or on Judge0 - both answer in the same shape.
  const { stdout, stderr, statusId, statusText } =
    getRunnerName() === 'local' ? await runLocally(source) : await runOnJudge0(source);

  // Split the player's own console.log lines from our results line.
  const markerAt = stdout.lastIndexOf(marker);
  const logs = (markerAt === -1 ? stdout : stdout.slice(0, markerAt)).trim();

  // Program crashed before printing results (syntax error, infinite loop...)
  if (markerAt === -1 || statusId !== STATUS.ACCEPTED) {
    let error = stderr.trim() || statusText || 'Unknown error';
    if (statusId === STATUS.TIME_LIMIT) error = 'Time limit exceeded - is there an infinite loop?';
    return { passed: 0, total, results: [], logs, error };
  }

  let results;
  try {
    results = JSON.parse(stdout.slice(markerAt + marker.length).split('\n')[0]);
  } catch {
    return { passed: 0, total, results: [], logs, error: 'Could not read test results' };
  }

  // Attach input/expected so the UI can show a full table.
  results = results.map((r, i) => ({
    ...r,
    input: challenge.testCases[i].input,
    expected: challenge.testCases[i].expected,
  }));

  return {
    passed: results.filter((r) => r.passed).length,
    total,
    results,
    logs,
    error: null,
  };
}
