// ============================================================
//  Bug Hunter Royale - Backend entry point
//  Starts Express (REST API) + Socket.io (real-time) on ONE port.
// ============================================================

// 1. Load variables from the .env file into process.env.
//    Must be the FIRST import so every other file can read them.
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';

import authRoutes from './routes/authRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js';
import userRoutes from './routes/userRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import initSocket from './socket/index.js';
import { closeAbandonedMatches } from './services/matchService.js';
import { getRunnerName } from './services/codeRunner.js';

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Stop early with a clear message if an important setting is missing.
// (Judge0 settings are only needed when we actually use Judge0.)
const requiredKeys = ['MONGO_URI', 'JWT_SECRET'];
if (getRunnerName() === 'judge0') requiredKeys.push('JUDGE0_URL', 'JUDGE0_API_KEY');
for (const key of requiredKeys) {
  if (!process.env[key]) {
    console.error(`💥 Missing ${key} in server/.env`);
    process.exit(1);
  }
}

// 2. Create the Express app (handles normal HTTP requests like /api/login).
const app = express();

// cors -> allows our React app (a different port) to call this API.
app.use(cors({ origin: CLIENT_URL, credentials: true }));
// express.json -> turns JSON request bodies into req.body objects.
// The size limit stops someone from sending a giant body.
app.use(express.json({ limit: '100kb' }));

// 3. A simple "health check" route to prove the server is alive.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bug Hunter Royale API is running 🐞' });
});

// 4. Plug in the route files. Each one handles everything under its prefix.
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);

// 5. These two MUST come last: unknown routes, then errors.
app.use('/api', notFound);
app.use(errorHandler);

// 6. Socket.io needs a raw Node HTTP server, so we wrap Express in one.
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});
initSocket(io); // all the multiplayer logic lives in socket/index.js

// 7. Connect to MongoDB FIRST, then start listening.
//    If the database is down, there's no point accepting requests.
async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    await closeAbandonedMatches();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(
        getRunnerName() === 'local'
          ? '🧪 Code runner: LOCAL test mode (runs on this PC - demo only, do not deploy)'
          : '☁️  Code runner: Judge0'
      );
    });
  } catch (err) {
    console.error('💥 Failed to start server:', err.message);
    process.exit(1); // stop the app with an error code
  }
}

start();
