// ============================================================
//  /api/auth  -> register, login, "who am I?"
// ============================================================
import { Router } from 'express';
import User from '../models/User.js';
import { signToken } from '../utils/token.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register   body: { username, email, password }
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Only pick the fields we expect - a sneaky client can't send { elo: 9999 }.
  // The User model validates the rest and hashes the password.
  const user = await User.create({ username, email, password });

  res.status(201).json({ token: signToken(user._id), user });
});

// POST /api/auth/login   body: { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // .select('+password') because the schema hides it by default.
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');

  // Same message for "no such user" and "wrong password", so attackers
  // can't use this form to discover which emails are registered.
  if (!user || !(await user.comparePassword(String(password)))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  res.json({ token: signToken(user._id), user });
});

// GET /api/auth/me   -> the logged-in user (used when the app reloads)
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

export default router;
