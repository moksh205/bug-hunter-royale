// ============================================================
//  /api/users  -> leaderboard
// ============================================================
import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

// GET /api/users/leaderboard?limit=50   (public - anyone can see the rankings)
router.get('/leaderboard', async (req, res) => {
  // Clamp the limit between 1 and 100 so nobody can request a million rows.
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

  const users = await User.find()
    .select('username elo wins losses') // never send emails publicly
    .sort({ elo: -1, wins: -1, createdAt: 1 }) // ties: more wins, then older account
    .limit(limit)
    .lean();

  res.json({
    leaderboard: users.map((u, i) => ({
      rank: i + 1,
      id: u._id,
      username: u.username,
      elo: u.elo,
      wins: u.wins,
      losses: u.losses,
    })),
  });
});

export default router;
