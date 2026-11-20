// ============================================================
//  Socket.io engine - matchmaking, battle rooms, live progress.
//
//  EVENTS  (client -> server)
//    queue:join                 put me in the waiting queue
//    queue:leave                take me out
//    match:join  (matchId, ack) give me the match state (arena page load)
//    code:run    ({matchId, code}, ack)  run my code on Judge0
//    match:forfeit (matchId)    I give up
//
//  EVENTS  (server -> client)
//    queue:waiting        you're in the queue
//    match:found          { matchId } - go to the arena!
//    opponent:progress    { passed, total }
//    opponent:status      { connected, graceSeconds? }
//    match:over           { winnerId, reason, change, players }
//    app:error            { message }
//
//  Every socket joins a personal room "user:<id>". Sending to that room
//  reaches the player even if they refreshed (new socket) or have 2 tabs.
// ============================================================
import User from '../models/User.js';
import Challenge from '../models/Challenge.js';
import Match from '../models/Match.js';
import { verifyToken } from '../utils/token.js';
import { runTests } from '../services/codeRunner.js';
import { finishMatch } from '../services/matchService.js';

const RUN_COOLDOWN_MS = 3000; // min gap between runs (protects Judge0 quota)
const RECONNECT_GRACE_MS = 30000; // time to come back before losing by forfeit
const MAX_CODE_LENGTH = 20000; // characters

// ---------- In-memory game state ----------
// (Lives in RAM: fast, but lost on restart. Fine for one server.)
const queue = []; // [{ userId, username, elo }]
const matches = new Map(); // matchId -> match state (see createMatch)
const userToMatch = new Map(); // userId -> matchId
const graceTimers = new Map(); // userId -> setTimeout handle

const userRoom = (userId) => `user:${userId}`;

export default function initSocket(io) {
  // ---------- 1. Authenticate every connection ----------
  // The client sends its JWT in `io(url, { auth: { token } })`.
  io.use(async (socket, next) => {
    try {
      const { id } = verifyToken(socket.handshake.auth?.token);
      const user = await User.findById(id).lean();
      if (!user) return next(new Error('Unauthorized'));
      socket.data.user = { id: String(user._id), username: user.username };
      next();
    } catch {
      next(new Error('Unauthorized')); // client sees this as "connect_error"
    }
  });

  // ---------- 2. Handle a connected player ----------
  io.on('connection', (socket) => {
    const { id: userId } = socket.data.user;
    socket.join(userRoom(userId));

    // Back from a refresh/disconnect while in a match? Cancel the forfeit timer.
    if (graceTimers.has(userId)) {
      clearTimeout(graceTimers.get(userId));
      graceTimers.delete(userId);
      const match = matches.get(userToMatch.get(userId));
      if (match) io.to(userRoom(opponentOf(match, userId))).emit('opponent:status', { connected: true });
    }

    // Small helper: run an async handler and turn crashes into a message.
    const safe = (handler) => async (...args) => {
      try {
        await handler(...args);
      } catch (err) {
        console.error('💥 socket handler error:', err);
        socket.emit('app:error', { message: 'Server error, please try again' });
      }
    };

    socket.on('queue:join', safe(() => joinQueue(io, socket)));
    socket.on('queue:leave', () => removeFromQueue(userId));
    socket.on('match:join', safe((matchId, ack) => joinMatch(socket, matchId, ack)));
    socket.on('code:run', safe((payload, ack) => runCode(io, socket, payload, ack)));
    socket.on('match:forfeit', safe((matchId) => forfeit(io, userId, matchId)));
    socket.on('disconnect', safe(() => handleDisconnect(io, userId)));
  });
}

// ============================================================
//  Matchmaking
// ============================================================
async function joinQueue(io, socket) {
  const { id: userId, username } = socket.data.user;

  // Already in a match? Send them back to it instead of queueing.
  if (userToMatch.has(userId)) {
    return socket.emit('match:found', { matchId: userToMatch.get(userId) });
  }

  // Fresh Elo from the DB (it may have changed since login).
  const { elo } = await User.findById(userId).select('elo').lean();

  // (Checked AFTER the await: things may have changed while we waited.)
  if (queue.some((p) => p.userId === userId)) return socket.emit('queue:waiting');
  if (userToMatch.has(userId)) return socket.emit('match:found', { matchId: userToMatch.get(userId) });

  // Pick the waiting player with the CLOSEST Elo for a fair fight.
  let bestIndex = -1;
  queue.forEach((p, i) => {
    if (bestIndex === -1 || Math.abs(p.elo - elo) < Math.abs(queue[bestIndex].elo - elo)) bestIndex = i;
  });

  if (bestIndex === -1) {
    queue.push({ userId, username, elo });
    return socket.emit('queue:waiting');
  }

  // Found someone: remove them from the queue NOW (synchronously), so a
  // third player can't grab the same opponent.
  const [opponent] = queue.splice(bestIndex, 1);
  await createMatch(io, opponent, { userId, username, elo });
}

function removeFromQueue(userId) {
  const i = queue.findIndex((p) => p.userId === userId);
  if (i !== -1) queue.splice(i, 1);
}

async function createMatch(io, a, b) {
  // Pick a random challenge.
  const [challenge] = await Challenge.aggregate([{ $sample: { size: 1 } }]);
  if (!challenge) {
    const message = 'No challenges in the database yet. Run "npm run seed" in the server folder.';
    [a, b].forEach((p) => io.to(userRoom(p.userId)).emit('app:error', { message }));
    return;
  }

  const doc = await Match.create({
    challenge: challenge._id,
    players: [a, b].map((p) => ({ user: p.userId, username: p.username, eloBefore: p.elo })),
  });
  const matchId = String(doc._id);
  const total = challenge.testCases.length;

  // The live state of this battle, kept in memory.
  const makePlayer = (p) => ({
    userId: p.userId,
    username: p.username,
    elo: p.elo,
    passed: 0, // latest score
    best: 0, // best score (saved in history)
    lastRunAt: 0,
    running: false,
  });
  matches.set(matchId, {
    id: matchId,
    challenge,
    total,
    finished: false,
    players: { [a.userId]: makePlayer(a), [b.userId]: makePlayer(b) },
  });
  userToMatch.set(a.userId, matchId);
  userToMatch.set(b.userId, matchId);

  console.log(`⚔️  Match ${matchId}: ${a.username} vs ${b.username} on "${challenge.title}"`);

  for (const p of [a, b]) {
    io.to(userRoom(p.userId)).emit('match:found', { matchId });
    // Someone may have closed the tab while we were creating the match.
    const sockets = await io.in(userRoom(p.userId)).fetchSockets();
    if (sockets.length === 0) startGraceTimer(io, p.userId);
  }
}

// ============================================================
//  Inside a match
// ============================================================
function opponentOf(match, userId) {
  return Object.keys(match.players).find((id) => id !== userId);
}

// Look up a match and make sure this user is really in it.
function getPlayerMatch(userId, matchId) {
  const match = matches.get(String(matchId));
  if (!match || match.finished || !match.players[userId]) return null;
  return match;
}

// The arena page calls this on load to get everything it needs to draw.
async function joinMatch(socket, matchId, ack) {
  if (typeof ack !== 'function') return;
  const userId = socket.data.user.id;
  const match = getPlayerMatch(userId, matchId);
  if (!match) return ack({ ok: false, message: 'This match is over or does not exist.' });

  const me = match.players[userId];
  const opp = match.players[opponentOf(match, userId)];
  const { challenge } = match;

  ack({
    ok: true,
    match: {
      id: match.id,
      challenge: {
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        functionName: challenge.functionName,
        buggyCode: challenge.buggyCode,
        testCases: challenge.testCases,
      },
      total: match.total,
      me: { id: userId, username: me.username, elo: me.elo, passed: me.passed },
      opponent: {
        id: opp.userId,
        username: opp.username,
        elo: opp.elo,
        passed: opp.passed,
        connected: !graceTimers.has(opp.userId),
      },
    },
  });
}

async function runCode(io, socket, payload, ack) {
  if (typeof ack !== 'function') return;
  const userId = socket.data.user.id;
  const { matchId, code } = payload || {};

  const match = getPlayerMatch(userId, matchId);
  if (!match) return ack({ ok: false, message: 'This match is over.' });
  if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) {
    return ack({ ok: false, message: `Code must be text under ${MAX_CODE_LENGTH} characters.` });
  }

  const player = match.players[userId];
  if (player.running) return ack({ ok: false, message: 'Your code is already running...' });
  const wait = player.lastRunAt + RUN_COOLDOWN_MS - Date.now();
  if (wait > 0) return ack({ ok: false, message: `Slow down! Try again in ${Math.ceil(wait / 1000)}s.` });

  player.running = true;
  player.lastRunAt = Date.now();
  let result;
  try {
    result = await runTests(match.challenge, code);
  } catch (err) {
    console.error('💥 Code runner error:', err.response?.status, err.response?.data || err.message);
    return ack({ ok: false, message: 'Code runner is unavailable right now. Check the server terminal for details.' });
  } finally {
    player.running = false;
  }

  ack({ ok: true, result });

  // The match may have ended while Judge0 was working (opponent won first).
  if (match.finished) return;

  player.passed = result.passed;
  player.best = Math.max(player.best, result.passed);

  // Live update for the opponent's progress bar.
  io.to(userRoom(opponentOf(match, userId))).emit('opponent:progress', {
    passed: result.passed,
    total: match.total,
  });

  if (result.passed === match.total) {
    await endMatch(io, match, userId, 'solved');
  }
}

async function forfeit(io, userId, matchId) {
  const match = getPlayerMatch(userId, matchId);
  if (match) await endMatch(io, match, opponentOf(match, userId), 'forfeit');
}

async function endMatch(io, match, winnerId, reason) {
  // Set this FIRST (no await before it) so the match can only end once.
  if (match.finished) return;
  match.finished = true;

  const loserId = opponentOf(match, winnerId);
  for (const id of [winnerId, loserId]) {
    clearTimeout(graceTimers.get(id));
    graceTimers.delete(id);
    userToMatch.delete(id);
  }
  matches.delete(match.id);

  let summary = null;
  try {
    summary = await finishMatch({
      matchId: match.id,
      winnerId,
      loserId,
      reason,
      testsPassed: { [winnerId]: match.players[winnerId].best, [loserId]: match.players[loserId].best },
    });
  } catch (err) {
    console.error('💥 Failed to save match result:', err);
  }

  console.log(`🏆 Match ${match.id}: ${match.players[winnerId].username} wins (${reason})`);

  const payload = {
    matchId: match.id,
    winnerId,
    reason,
    change: summary?.change ?? 0,
    players: summary?.players ?? [],
  };
  io.to(userRoom(winnerId)).to(userRoom(loserId)).emit('match:over', payload);
}

// ============================================================
//  Disconnects
// ============================================================
async function handleDisconnect(io, userId) {
  // Still has another tab open? Then they haven't really left.
  const sockets = await io.in(userRoom(userId)).fetchSockets();
  if (sockets.length > 0) return;

  removeFromQueue(userId);
  if (userToMatch.has(userId)) startGraceTimer(io, userId);
}

// Give a disconnected player time to come back before they forfeit.
function startGraceTimer(io, userId) {
  const match = matches.get(userToMatch.get(userId));
  if (!match || graceTimers.has(userId)) return;

  const opponentId = opponentOf(match, userId);
  io.to(userRoom(opponentId)).emit('opponent:status', {
    connected: false,
    graceSeconds: RECONNECT_GRACE_MS / 1000,
  });

  const timer = setTimeout(() => {
    graceTimers.delete(userId);
    endMatch(io, match, opponentId, 'forfeit').catch((err) => console.error(err));
  }, RECONNECT_GRACE_MS);
  graceTimers.set(userId, timer);
}
