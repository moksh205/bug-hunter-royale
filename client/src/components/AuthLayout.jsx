// ============================================================
//  Shared frame + inputs for the Login and Register pages.
//  Desktop: brand panel on the left, form on the right.
//  Phone:   small brand header above the form.
// ============================================================
import { useState } from 'react';
import Enso from './Enso';
import Icon from './Icon';

const FEATURES = [
  ['swords', 'Live 1 vs 1 battles', 'Same broken code, first to pass every test wins.'],
  ['bolt', 'Real-time progress', "Watch your rival's progress bar move as they fix it."],
  ['trophy', 'Climb the ranks', 'Win to gain Elo and rise up the leaderboard.'],
];

export function AuthCard({ title, subtitle, children }) {
  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* ---------- Brand panel (desktop) ---------- */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-line p-12 xl:p-16">
        {/* soft crimson light + big brush ring with the "hunt" kanji */}
        <div className="pointer-events-none absolute -right-24 top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full bg-crimson/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-[42%] h-[380px] w-[380px] -translate-y-1/2 opacity-90 xl:-right-6">
          <Enso className="h-full w-full" />
          <span className="absolute inset-0 grid place-items-center font-serif text-[8rem] leading-none text-ink/90 drop-shadow-[0_0_30px_rgba(225,29,72,0.5)]">
            狩
          </span>
        </div>

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.5em] text-gold">Bug Slayer Corps</p>
          <h1 className="mt-4 font-display text-5xl xl:text-6xl font-bold uppercase leading-[1.05] tracking-wide">
            Bug Hunter
            <br />
            <span className="bg-gradient-to-r from-crimson via-ember to-gold bg-clip-text text-transparent">Royale</span>
          </h1>
          <p className="mt-5 max-w-sm text-mist">Debug faster than your rival. The arena is waiting.</p>
        </div>

        <ul className="relative max-w-[300px] space-y-5 xl:max-w-xs">
          {FEATURES.map(([icon, head, text]) => (
            <li key={head} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-panel text-gold">
                <Icon name={icon} />
              </span>
              <span>
                <b className="block font-semibold text-ink">{head}</b>
                <span className="text-sm text-mist">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="relative text-xs uppercase tracking-[0.3em] text-mist/70">MERN · Socket.io · Judge0</p>
      </aside>

      {/* ---------- Form side ---------- */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md fade-up">
          {/* compact brand for phones / tablets */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Enso className="h-11 w-11" />
            <span className="font-display text-xl font-bold uppercase tracking-wider">
              Bug Hunter <span className="text-crimson-light">Royale</span>
            </span>
          </div>

          <h2 className="font-display text-3xl font-bold uppercase tracking-wide">{title}</h2>
          <p className="mt-2 mb-8 text-mist">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

// Input with an icon and a label that floats up when you type.
// Password fields get a show / hide button.
// `...props` passes everything else (name, value, onChange, required...) through.
export function Field({ label, icon, type = 'text', ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const id = `field-${props.name}`;

  return (
    <div className="group relative mb-5">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist transition-colors group-focus-within:text-gold">
        <Icon name={icon} />
      </span>
      <input
        {...props}
        id={id}
        type={isPassword && show ? 'text' : type}
        placeholder=" " /* needed for the floating-label trick (:placeholder-shown) */
        className="peer h-14 w-full rounded-xl border border-line bg-night/70 pl-12 pr-12 pt-5 pb-1.5 text-ink outline-none transition
                   hover:border-gold/30 focus:border-gold focus:ring-4 focus:ring-gold/10"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-12 top-2.5 text-[11px] uppercase tracking-[0.18em] text-mist transition-all
                   peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px]
                   peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal
                   peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:uppercase
                   peer-focus:tracking-[0.18em] peer-focus:text-gold"
      >
        {label}
      </label>
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-mist transition hover:bg-panel-2 hover:text-ink"
        >
          <Icon name={show ? 'eye-off' : 'eye'} />
        </button>
      )}
    </div>
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-4 py-3 text-sm text-crimson-light">
      <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

// Big call-to-action button with an arrow (or a spinner while busy).
export function SubmitButton({ busy, children, busyText }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-crimson py-3.5 font-bold text-white transition hover:brightness-110 disabled:opacity-60"
    >
      {busy ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {busyText}
        </>
      ) : (
        <>
          {children}
          <Icon name="arrow" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}

// "Already have an account? Log in" row under the form.
export function SwitchLink({ text, children }) {
  return (
    <div className="mt-8">
      <div className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-mist/60">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <p className="text-center text-sm text-mist">
        {text} {children}
      </p>
    </div>
  );
}
