// ============================================================
//  Central error handler. Express 5 automatically sends any error
//  thrown inside a route (even in async code) here, so routes
//  don't need try/catch everywhere.
// ============================================================

// 404 for unknown /api routes
export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express knows this is an error handler because it has 4 arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Mongoose validation failed (e.g. username too short)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(400).json({ message });
  }

  // Duplicate value in a `unique` field (code 11000 from MongoDB)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `That ${field} is already taken` });
  }

  // A malformed id like /api/challenges/not-an-id
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id' });
  }

  // Anything else is a bug on our side: log it, hide details from users.
  console.error('💥', err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong' });
}
