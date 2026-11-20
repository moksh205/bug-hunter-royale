// ============================================================
//  /api/challenges  -> browse the buggy code challenges
// ============================================================
import { Router } from 'express';
import Challenge from '../models/Challenge.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect); // every route below needs a logged-in user

// GET /api/challenges  -> short list (no code, keeps the response small)
router.get('/', async (req, res) => {
  const challenges = await Challenge.find()
    .select('title description difficulty functionName testCases')
    .sort({ difficulty: 1, title: 1 })
    .lean(); // .lean() = plain JS objects, faster when we don't need to save

  res.json({
    challenges: challenges.map(({ testCases, ...c }) => ({ ...c, testCount: testCases.length })),
  });
});

// GET /api/challenges/:id  -> full challenge, including the buggy code
router.get('/:id', async (req, res) => {
  const challenge = await Challenge.findById(req.params.id).lean();
  if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
  res.json({ challenge });
});

export default router;
