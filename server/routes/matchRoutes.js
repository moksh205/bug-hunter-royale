// ============================================================
//  /api/matches  -> match history
//
//  NOTE: there is deliberately NO "update my Elo" endpoint.
//  If there were, anyone could call it from the browser console
//  and give themselves 9999 Elo. Elo only changes on the server,
//  inside services/matchService.js, when the Socket.io engine
//  decides a match is over.
// ============================================================
import { Router } from 'express';
import Match from '../models/Match.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

// GET /api/matches/me  -> my last 20 finished matches
router.get('/me', async (req, res) => {
  const matches = await Match.find({ 'players.user': req.user._id, status: 'finished' })
    .populate('challenge', 'title difficulty') // swap the id for { title, difficulty }
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const myId = String(req.user._id);

  res.json({
    matches: matches.map((m) => {
      const me = m.players.find((p) => String(p.user) === myId);
      const opponent = m.players.find((p) => String(p.user) !== myId);
      return {
        id: m._id,
        challenge: m.challenge,
        opponent: opponent?.username,
        result: !m.winner ? 'draw' : String(m.winner) === myId ? 'win' : 'loss',
        endReason: m.endReason,
        eloChange: me?.eloAfter != null ? me.eloAfter - me.eloBefore : 0,
        playedAt: m.createdAt,
      };
    }),
  });
});

export default router;
