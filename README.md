# 🐞 Bug Hunter Royale

Real-time 1v1 debugging battles. Two players get the same buggy code;
the first to make every unit test pass wins and takes Elo from the loser.

## Tech
- **Client:** React (Vite), Tailwind CSS v4, Monaco Editor, Socket.io client, React Router
- **Server:** Node.js, Express 5, MongoDB (Mongoose), Socket.io, JWT, bcrypt
- **Code runner:** Judge0 CE (cloud), or a local sandboxed Node runner for demos (`CODE_RUNNER=local`)

## Setup
1. **Server env** – edit `server/.env`:
   - `MONGO_URI` – MongoDB Atlas link or local `mongodb://127.0.0.1:27017/bug-hunter-royale`
   - `CODE_RUNNER` – `local` (default, no key needed, demo only) or `judge0`
   - `JUDGE0_API_KEY` – only for `judge0` mode: free key from RapidAPI ("Judge0 CE")
2. **Install** (once): `cd server && npm install`, then `cd client && npm install`
3. **Seed challenges** (once): `cd server && npm run seed`
4. **Run** in two terminals:
   - `cd server && npm run dev` → http://localhost:5000
   - `cd client && npm run dev` → http://localhost:5173
5. **Try a battle:** register two accounts in two different browsers
   (or one normal + one incognito window) and click **Find Match** in both.

## Project structure
```
server/
  server.js              Express + Socket.io entry point
  models/                User, Challenge, Match (Mongoose schemas)
  routes/                auth, challenges, users (leaderboard), matches (history)
  middleware/            JWT `protect`, error handler
  services/codeRunner.js Builds a test harness, runs it on Judge0 or locally
  services/localRunner   Local test-mode runner (Node permission sandbox, 2s limit)
  services/matchService  Ends matches + updates Elo (server-side only)
  socket/index.js        Matchmaking queue, rooms, live progress, forfeits
  utils/                 elo.js, token.js
  seed/                  Starter challenges + seed script
client/src/
  api/client.js          Axios instance (adds the JWT automatically)
  context/               AuthContext, SocketContext
  components/            Navbar, ProtectedRoute, ProgressBar, ResultModal, AuthLayout
  pages/                 Login, Register, Lobby, Arena, Leaderboard
```

## Socket events
| Direction | Event | Payload |
|---|---|---|
| client → server | `queue:join` / `queue:leave` | – |
| client → server | `match:join` | `matchId` (ack → match state) |
| client → server | `code:run` | `{ matchId, code }` (ack → test results) |
| client → server | `match:forfeit` | `matchId` |
| server → client | `queue:waiting`, `match:found` | `{ matchId }` |
| server → client | `opponent:progress` | `{ passed, total }` |
| server → client | `opponent:status` | `{ connected, graceSeconds }` |
| server → client | `match:over` | `{ winnerId, reason, change, players }` |

## Design decisions
- **Server runs the code, not the browser** – the client can't fake a win.
- **One Judge0 call per run** – all tests run in one harness to save API quota.
- **No "update Elo" endpoint** – Elo only changes inside `finishMatch`.
- **Atomic match finish** – `findOneAndUpdate({ status: 'in_progress' })` stops double wins.
- **30s reconnect grace** – refreshing the page doesn't lose the match.
- **3s run cooldown** per player.

## Known limits / ideas
- Game state lives in server memory → one server instance only (use Redis to scale).
- Tests are visible, so a player could hard-code answers – add hidden tests to fix.
- Judge0 language 63 = Node.js 12 (no `?.` / `??`). Change `JUDGE0_LANGUAGE_ID` if your Judge0 has newer Node.
