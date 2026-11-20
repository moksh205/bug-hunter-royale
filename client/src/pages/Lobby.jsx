// ============================================================
//  Lobby - profile banner, the "Find Match" battle card, stats
//  and the recent-matches timeline.
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api, { getErrorMessage } from '../api/client';
import Enso from '../components/Enso';
import Icon from '../components/Icon';
import { rankFor } from '../utils/rank';

// "3 min ago", "2 days ago"...
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function timeAgo(date) {
  const diff = (new Date(date) - Date.now()) / 1000; // seconds (negative = past)
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, secs] of units) if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  return 'just now';
}
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Lobby() {
  const { user, refreshUser } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [searching, setSearching] = useState(false);
  const [seconds, setSeconds] = useState(0); // how long we've been searching
  const [error, setError] = useState('');
  const [history, setHistory] = useState(null); // null = still loading

  // Load fresh stats + match history when the lobby opens.
  useEffect(() => {
    refreshUser();
    api
      .get('/matches/me')
      .then(({ data }) => setHistory(data.matches))
      .catch((err) => {
        setHistory([]);
        setError(getErrorMessage(err));
      });
  }, [refreshUser]);

  // Listen to matchmaking events from the server.
  useEffect(() => {
    if (!socket) return;

    const onWaiting = () => setSearching(true);
    const onFound = ({ matchId }) => navigate(`/battle/${matchId}`);
    const onError = ({ message }) => {
      setSearching(false);
      setError(message);
    };

    socket.on('queue:waiting', onWaiting);
    socket.on('match:found', onFound);
    socket.on('app:error', onError);

    // Cleanup: remove listeners when leaving the page, otherwise they'd pile up.
    return () => {
      socket.off('queue:waiting', onWaiting);
      socket.off('match:found', onFound);
      socket.off('app:error', onError);
    };
  }, [socket, navigate]);

  // Leaving the lobby while searching? Leave the queue too.
  useEffect(() => {
    if (!socket || !searching) return;
    return () => socket.emit('queue:leave');
  }, [socket, searching]);

  // Search timer: tick every second while searching.
  useEffect(() => {
    if (!searching) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [searching]);

  const findMatch = () => {
    setError('');
    setSeconds(0);
    setSearching(true);
    socket.emit('queue:join');
  };

  const cancel = () => setSearching(false); // the effect above emits queue:leave

  const games = user.wins + user.losses;
  const winRate = games ? Math.round((user.wins / games) * 100) : 0;
  const rank = rankFor(user.elo);
  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 fade-up">
      {/* ---------- Profile banner ---------- */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-panel p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-crimson/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* avatar: first letter inside a gold brush ring */}
          <div className="relative h-24 w-24 shrink-0">
            <Enso color="#f5c66b" className="h-full w-full" />
            <span className="absolute inset-0 grid place-items-center font-display text-4xl font-bold text-ink">
              {user.username[0].toUpperCase()}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.4em] text-mist">Welcome back</p>
            <h1 className="truncate font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">{user.username}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-semibold text-gold">
                Rank · {rank.name}
              </span>
              {joined && <span className="text-mist">Joined {joined}</span>}
            </div>
            {rank.next && (
              <div className="mt-4 max-w-sm">
                <div className="mb-1 flex justify-between text-xs text-mist">
                  <span>Next rank: {rank.next}</span>
                  <span>{rank.toNext} Elo to go</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
                  <div className="h-full rounded-full bg-gradient-to-r from-crimson to-gold" style={{ width: `${rank.progress * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-[0.4em] text-mist">Elo rating</p>
            <p className="font-display text-5xl font-bold text-gold">{user.elo}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          {/* ---------- Battle card ---------- */}
          <section className="relative overflow-hidden rounded-2xl border border-line bg-panel p-6 sm:p-8">
            <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[120%] -translate-x-1/2 rounded-full bg-crimson/20 blur-3xl" />
            <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gold">Ranked duel</p>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">Enter the arena</h2>
                <p className="mt-2 max-w-md text-mist">
                  Get matched with a player of similar Elo. Same buggy code, first to pass every test wins.
                </p>
              </div>

              {/* crossed swords inside a crimson brush ring; rings pulse while searching */}
              <div className="relative mx-auto h-32 w-32">
                {searching && (
                  <>
                    <span className="pulse-ring absolute inset-0 rounded-full border-2 border-crimson/60" />
                    <span className="pulse-ring absolute inset-0 rounded-full border-2 border-crimson/60 [animation-delay:0.8s]" />
                  </>
                )}
                <Enso className={`h-full w-full ${searching ? 'enso-spin' : ''}`} />
                <span className="absolute inset-0 grid place-items-center text-ink">
                  <Icon name="swords" className="h-12 w-12" strokeWidth={1.4} />
                </span>
              </div>
            </div>

            {error && (
              <p role="alert" className="relative mt-5 rounded-xl border border-crimson/40 bg-crimson/10 px-4 py-3 text-sm text-crimson-light">
                {error}
              </p>
            )}

            <div className="relative mt-6">
              {searching ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-night/60 p-5 sm:flex-row sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
                    <div>
                      <p className="font-semibold">Searching for an opponent…</p>
                      <p className="text-xs text-mist">Tip: open a second browser to play yourself.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-lg text-gold">{mmss(seconds)}</span>
                    <button onClick={cancel} className="rounded-lg border border-line px-4 py-2 text-sm text-mist transition hover:border-crimson/60 hover:text-crimson-light">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={findMatch}
                  disabled={!socket}
                  className="group flex w-full items-center justify-center gap-3 rounded-xl bg-crimson py-4 text-lg font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  <Icon name="swords" className="h-6 w-6" />
                  {socket ? 'Find match' : 'Connecting…'}
                  <Icon name="arrow" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </div>
          </section>

          {/* ---------- Stats ---------- */}
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat icon="trophy" label="Wins" value={user.wins} color="text-gold" />
            <Stat icon="skull" label="Losses" value={user.losses} color="text-crimson-light" />
            <Stat icon="target" label="Matches" value={games} color="text-ink" />
            <Stat icon="chart" label="Win rate" value={`${winRate}%`} color="text-sky-300" bar={winRate} />
          </section>
        </div>

        {/* ---------- Recent matches timeline ---------- */}
        <section className="rounded-2xl border border-line bg-panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold uppercase tracking-wider">Recent matches</h2>
            {history?.length > 0 && <span className="text-xs text-mist">{history.length} shown</span>}
          </div>

          {history === null && (
            <ul className="space-y-3" aria-label="Loading matches">
              {[0, 1, 2].map((i) => <li key={i} className="h-16 animate-pulse rounded-xl bg-panel-2" />)}
            </ul>
          )}

          {history?.length === 0 && (
            <div className="grid place-items-center gap-3 py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full border border-line text-mist">
                <Icon name="bug" className="h-7 w-7" />
              </span>
              <p className="font-semibold">No battles yet</p>
              <p className="max-w-xs text-sm text-mist">Find a match to start your record. Your wins and losses will show up here.</p>
            </div>
          )}

          <ul className="space-y-3">
            {history?.map((m) => (
              <li key={m.id} className={`relative overflow-hidden rounded-xl border border-line bg-night/50 py-3 pl-5 pr-4 ${RESULT[m.result].edge}`}>
                <div className="flex items-center gap-3">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${RESULT[m.result].badge}`}>
                    {m.result}
                  </span>
                  <p className="min-w-0 flex-1 truncate font-medium">{m.challenge?.title ?? 'Deleted challenge'}</p>
                  <span className={`text-sm font-bold ${m.eloChange >= 0 ? 'text-gold' : 'text-crimson-light'}`}>
                    {m.eloChange >= 0 ? '+' : ''}
                    {m.eloChange}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-mist">
                  vs <span className="text-ink/85">{m.opponent}</span> · {m.endReason} · <Icon name="clock" className="h-3.5 w-3.5" /> {timeAgo(m.playedAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

const RESULT = {
  win: { badge: 'bg-gold/15 text-gold', edge: 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-gold' },
  loss: { badge: 'bg-crimson/15 text-crimson-light', edge: 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-crimson' },
  draw: { badge: 'bg-panel-2 text-ink/85', edge: 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-mist/40' },
};

function Stat({ icon, label, value, color, bar }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center justify-between text-mist">
        <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <p className={`mt-2 font-display text-3xl font-bold ${color}`}>{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-panel-2">
          <div className="h-full rounded-full bg-sky-400" style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
