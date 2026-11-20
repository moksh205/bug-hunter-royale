// ============================================================
//  JWT helpers - used by BOTH the REST API and Socket.io,
//  so token logic lives in one place.
// ============================================================
import jwt from 'jsonwebtoken';

// Create a signed token that says "this is user <id>".
// The frontend stores it and sends it back on every request.
export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Check a token is genuine and not expired.
// Returns the payload ({ id }) or THROWS if the token is bad.
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
