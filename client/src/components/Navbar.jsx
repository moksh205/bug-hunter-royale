// ============================================================
//  Floating, rounded top bar shown on every logged-in page.
// ============================================================
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Enso from './Enso';
import Icon from './Icon';

// NavLink gives us `isActive`, so the current page's pill is highlighted.
const linkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-full px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
    isActive
      ? 'bg-crimson/15 text-white ring-1 ring-crimson/40'
      : 'text-ink/60 hover:bg-white/5 hover:text-white'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-20 px-3 pt-3">
        <nav className="mx-auto flex h-14 max-w-3xl items-center gap-1 rounded-full border border-line bg-night/75 pl-2 pr-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {/* brand: small brush ring + name */}
          <span className="mr-1 flex items-center gap-2 pl-1 sm:mr-3">
            <span className="relative h-9 w-9">
              <Enso className="h-full w-full" />
              <span className="absolute inset-0 grid place-items-center font-display text-xs font-bold">BH</span>
            </span>
            <span className="hidden font-display text-sm font-bold uppercase tracking-[0.12em] md:inline">
              Bug Hunter <span className="text-crimson-light">Royale</span>
            </span>
          </span>

          <NavLink to="/" end className={linkClass} aria-label="Lobby">
            <Icon name="home" className="h-4 w-4" />
            <span className="hidden sm:inline">Lobby</span>
          </NavLink>
          <NavLink to="/leaderboard" className={linkClass} aria-label="Leaderboard">
            <Icon name="trophy" className="h-4 w-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </NavLink>

          <div className="ml-auto flex items-center gap-1.5">
            {/* user chip: initial + Elo (name hidden on small screens) */}
            <span className="flex items-center gap-2 rounded-full bg-panel-2 py-1 pl-1 pr-3 text-sm">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-crimson to-ember font-bold text-white">
                {user.username[0].toUpperCase()}
              </span>
              <span className="hidden max-w-[7rem] truncate text-ink/85 lg:inline">{user.username}</span>
              <span className="font-semibold text-gold">{user.elo}</span>
            </span>
            <button
              onClick={logout}
              aria-label="Log out"
              title="Log out"
              className="grid h-10 w-10 place-items-center rounded-full text-mist transition hover:bg-crimson/15 hover:text-crimson-light"
            >
              <Icon name="logout" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </nav>
      </header>

      {/* The current page renders here */}
      <Outlet />
    </>
  );
}
