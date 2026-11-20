// ============================================================
//  `protect` middleware - put it in front of any route that
//  needs a logged-in user. It reads the header:
//     Authorization: Bearer <token>
//  and, if valid, attaches the user to `req.user`.
// ============================================================
import User from '../models/User.js';
import { verifyToken } from '../utils/token.js';

export async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  try {
    const { id } = verifyToken(token);
    const user = await User.findById(id);

    // Token was fine, but the account was deleted since.
    if (!user) return res.status(401).json({ message: 'User no longer exists' });

    req.user = user;
    next(); // let the request continue to the actual route
  } catch {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }
}
