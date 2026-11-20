// ============================================================
//  Leaderboard - top 50 players by Elo.
//  Top 3 stand on a podium, everyone else is a rounded row.
// ============================================================
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getErrorMessage } from '../api/client';
import Enso from '../components/Enso';
import Icon from '../components/Icon';
import { rankFor } from '../utils/rank';

// Ring colour + podium height per place.
const PODIUM = {
  1: { color: '#f5c66b', label: 'text-gold', block: 'h-28 sm:h-36', ring: 'h-20 w-20 sm:h-28 sm:w-28' },
  2: { color: '#cbd5e1', label: 'text-slate-200', block: 'h-20 sm:h-24', ring: 'h-16 w-16 sm:h-20 sm:w-20' },
  3: { color: '#d9845a', label: 'text-orange-300', block: 'h-14 sm:h-16', ring: 'h-16 w-16 sm:h-20 sm:w-20' },
};

const winRate = (r) => {
  const games = r.wins + r.losses;
  return games ? Math.round((r.wins / games) * 100) : 0;
};

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null); // null = loading
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/users/leaderboard?limit=50')
      .then(({ data }) => setRows(data.leaderboard))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const me = rows?.find((r) => r.id === user.id);
  const top = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  // podium order on screen: 2nd, 1st, 3rd
  const podium = [top[1], top[0], top[2]].filter(Boolean);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 fade-up">
      {/* ---------- Header ---------- */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-gold">Season ranking</p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">Leaderboard</h1>
          <p className="mt-1 text-mist">Top 50 slayers by Elo rating.</p>
        </div>
        {me && (
          <div className="rounded-2xl border border-crimson/40 bg-crimson/10 px-5 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-mist">Your place</p>
            <p className="font-display text-2xl font-bold">
              #{me.rank} <span className="text-base text-gold">· {me.elo}</span>
            </p>
          </div>
        )}
      </div>

      {error && <p className="rounded-xl border border-crimson/40 bg-crimson/10 px-4 py-3 text-crimson-light">{error}</p>}

      {/* loading skeleton */}
      {!rows && !error && (
        <div className="space-y-3" aria-label="Loading leaderboard">
          <div className="h-56 animate-pulse rounded-2xl bg-panel-2" />
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-panel-2" />)}
        </div>
      )}

      {rows?.length === 0 && (
        <div className="grid place-items-center gap-3 rounded-2xl border border-line bg-panel py-14 text-center">
          <Icon name="trophy" className="h-8 w-8 text-mist" />
          <p className="font-semibold">No players yet</p>
          <p className="text-sm text-mist">Be the first to win a match and claim the top spot.</p>
        </div>
      )}

      {/* ---------- Podium (top 3) ---------- */}
      {podium.length > 0 && (
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-panel px-3 pt-8 sm:px-8">
          <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-[70%] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative grid grid-cols-3 items-end gap-2 sm:gap-6">
            {podium.map((r) => {
              const p = PODIUM[r.rank];
              const isMe = r.id === user.id;
              return (
                <div key={r.id} className="flex min-w-0 flex-col items-center text-center">
                  {r.rank === 1 && <Icon name="crown" className="mb-1 h-6 w-6 text-gold" />}
                  <div className={`relative ${p.ring}`}>
                    <Enso color={p.color} className="h-full w-full" />
                    <span className="absolute inset-0 grid place-items-center font-display text-xl font-bold sm:text-3xl">
                      {r.username[0].toUpperCase()}
                    </span>
                  </div>
                  <p className={`mt-2 max-w-full truncate font-semibold ${isMe ? 'text-crimson-light' : 'text-ink'}`}>
                    {r.username}
                    {isMe && <span className="ml-1 text-xs">(you)</span>}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mist">{rankFor(r.elo).name}</p>
                  <p className={`mt-1 font-display text-xl font-bold sm:text-2xl ${p.label}`}>{r.elo}</p>
                  {/* the podium step */}
                  <div
                    className={`mt-3 w-full rounded-t-2xl border border-b-0 border-line ${p.block} grid place-items-start justify-center pt-2`}
                    style={{ background: `linear-gradient(180deg, ${p.color}33, transparent)` }}
                  >
                    <span className={`font-display text-2xl font-bold sm:text-3xl ${p.label}`}>{r.rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- Everyone else ---------- */}
      {rest.length > 0 && (
        <ul className="space-y-2.5">
          {rest.map((r) => {
            const isMe = r.id === user.id;
            const rate = winRate(r);
            return (
              <li
                key={r.id}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition sm:gap-4 sm:px-5 ${
                  isMe ? 'border-crimson/50 bg-crimson/10' : 'border-line bg-panel hover:border-gold/30'
                }`}
              >
                <span className="w-8 shrink-0 text-center font-display text-lg font-bold text-mist">{r.rank}</span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-panel-2 font-display font-bold">
                  {r.username[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {r.username}
                    {isMe && <span className="ml-2 rounded-full bg-crimson px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">You</span>}
                  </p>
                  <p className="text-xs text-mist">
                    {rankFor(r.elo).name} · <span className="text-gold">{r.wins}W</span> / <span className="text-crimson-light">{r.losses}L</span>
                  </p>
                </div>
                {/* win rate bar (hidden on small phones) */}
                <div className="hidden w-32 sm:block">
                  <div className="mb-1 flex justify-between text-[11px] text-mist">
                    <span>Win rate</span>
                    <span>{rate}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-crimson to-gold" style={{ width: `${rate}%` }} />
                  </div>
                </div>
                <span className="w-16 shrink-0 text-right font-display text-xl font-bold text-gold">{r.elo}</span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
