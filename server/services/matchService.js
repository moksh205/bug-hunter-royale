// ============================================================
//  Match service - the ONLY place where a match is closed and
//  Elo ratings are changed. Called by the Socket.io engine.
// ============================================================
import Match from '../models/Match.js';
import User from '../models/User.js';
import { calculateElo } from '../utils/elo.js';

/**
 * Close a match, update both players' Elo and win/loss counts.
 * @param {object} p
 * @param {string} p.matchId
 * @param {string} p.winnerId
 * @param {string} p.loserId
 * @param {'solved'|'forfeit'} p.reason
 * @param {Record<string, number>} p.testsPassed  best score per userId
 * @returns {Promise<null | { change: number, players: Array }>}
 *          null if the match was already finished.
 */
export async function finishMatch({ matchId, winnerId, loserId, reason, testsPassed = {} }) {
  // Step 1: flip status from in_progress -> finished in ONE atomic step.
  // If two "I won!" events arrive at the same moment, only the first
  // one finds status 'in_progress'; the second gets null and stops here.
  const match = await Match.findOneAndUpdate(
    { _id: matchId, status: 'in_progress' },
    { status: 'finished', winner: winnerId, endReason: reason, endedAt: new Date() },
    { returnDocument: 'after' }
  );
  if (!match) return null;

  // Step 2: calculate new ratings from the players' CURRENT Elo.
  const [winner, loser] = await Promise.all([User.findById(winnerId), User.findById(loserId)]);
  const { change, winnerElo, loserElo } = calculateElo(winner.elo, loser.elo);

  // Step 3: save both users. $inc adds to the number safely.
  await Promise.all([
    User.updateOne({ _id: winnerId }, { $set: { elo: winnerElo }, $inc: { wins: 1 } }),
    User.updateOne({ _id: loserId }, { $set: { elo: loserElo }, $inc: { losses: 1 } }),
  ]);

  // Step 4: record the result in the match history.
  const newElo = { [String(winnerId)]: winnerElo, [String(loserId)]: loserElo };
  match.players.forEach((p) => {
    const id = String(p.user);
    p.eloBefore = id === String(winnerId) ? winner.elo : loser.elo;
    p.eloAfter = newElo[id];
    p.testsPassed = testsPassed[id] ?? p.testsPassed;
  });
  await match.save();

  return {
    change,
    players: match.players.map((p) => ({
      id: String(p.user),
      username: p.username,
      eloBefore: p.eloBefore,
      eloAfter: p.eloAfter,
    })),
  };
}

// On server start, any match still "in_progress" was interrupted by a
// restart/crash. Close it with no winner so it doesn't hang around forever.
export async function closeAbandonedMatches() {
  const { modifiedCount } = await Match.updateMany(
    { status: 'in_progress' },
    { status: 'finished', endReason: 'abandoned', endedAt: new Date() }
  );
  if (modifiedCount) console.log(`🧹 Closed ${modifiedCount} abandoned match(es)`);
}
