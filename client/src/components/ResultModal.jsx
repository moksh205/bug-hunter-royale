// ============================================================
//  Win / loss popup shown when the match ends.
//  Counts down and then sends the player to the Leaderboard.
// ============================================================
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const REDIRECT_SECONDS = 10;

export default function ResultModal({ result, myId }) {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  // Every second: count down by 1. At 0: go to the leaderboard.
  useEffect(() => {
    if (secondsLeft <= 0) {
      navigate('/leaderboard');
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, navigate]);

  const won = result.winnerId === myId;
  const me = result.players.find((p) => p.id === myId);

  let reason;
  if (result.reason === 'solved') reason = won ? 'You squashed every bug first!' : 'Your opponent fixed it first.';
  else reason = won ? 'Your opponent left the battle.' : 'You left the battle.';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-night/80 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm bg-panel border border-line rounded-2xl p-8 text-center shadow-2xl">
        <p className="text-6xl mb-2">{won ? '🏆' : '💀'}</p>
        <h2 className={`font-display uppercase tracking-wider text-3xl font-bold ${won ? 'text-gold' : 'text-crimson-light'}`}>
          {won ? 'Victory!' : 'Defeat'}
        </h2>
        <p className="text-mist mt-1">{reason}</p>

        {me && (
          <p className="mt-6 text-lg">
            Elo: {me.eloBefore} → <span className="font-bold text-gold">{me.eloAfter}</span>{' '}
            <span className={won ? 'text-gold' : 'text-crimson-light'}>
              ({won ? '+' : '-'}
              {result.change})
            </span>
          </p>
        )}

        <div className="mt-8 grid gap-2">
          <Link
            to="/leaderboard"
            className="rounded-md bg-crimson hover:brightness-110 text-white font-bold py-2"
          >
            View leaderboard ({secondsLeft})
          </Link>
          <Link to="/" className="text-sm text-mist hover:text-white py-1">
            Back to lobby
          </Link>
        </div>
      </div>
    </div>
  );
}
