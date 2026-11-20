// ============================================================
//  Battle Arena - where the match happens.
//
//  Flow:
//   1. Ask the server for the match (challenge, opponent...) via "match:join".
//   2. Player edits code in Monaco. It's auto-saved to localStorage,
//      so a page refresh doesn't wipe their work.
//   3. "Run" sends the code to the SERVER ("code:run"), which runs it
//      on Judge0. (The browser never decides who wins - no cheating.)
//   4. Server pushes "opponent:progress" -> opponent's bar moves live.
//   5. Server pushes "match:over" -> show the win/loss popup.
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Enso from '../components/Enso';
import Icon from '../components/Icon';
import ResultModal from '../components/ResultModal';

const RUN_TIMEOUT_MS = 30000; // give up waiting for the server after 30s

// ---------- Save code per match in localStorage ----------
const codeKey = (matchId) => `bhr_code_${matchId}`;
const storage = {
  load: (id) => {
    try {
      return localStorage.getItem(codeKey(id));
    } catch {
      return null;
    }
  },
  save: (id, code) => {
    try {
      localStorage.setItem(codeKey(id), code);
    } catch {
      /* storage full/blocked - not critical */
    }
  },
  clear: (id) => {
    try {
      localStorage.removeItem(codeKey(id));
    } catch {
      /* ignore */
    }
  },
};

// Test input is a JSON array of arguments: '[[3,1,2]]' -> '[3,1,2]'
function formatArgs(input) {
  try {
    return JSON.parse(input)
      .map((arg) => JSON.stringify(arg))
      .join(', ');
  } catch {
    return input;
  }
}

const DIFFICULTY_STYLES = {
  easy: 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/30',
  medium: 'bg-gold/10 text-gold border border-gold/30',
  hard: 'bg-crimson/15 text-crimson-light border border-crimson/40',
};

// Code editor colours matching the Crimson Night theme.
function defineCrimsonTheme(monaco) {
  monaco.editor.defineTheme('crimson-night', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7d7480', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f5c66b' },
      { token: 'string', foreground: 'fda4af' },
      { token: 'number', foreground: 'fdba74' },
      { token: 'identifier', foreground: 'f5f1ea' },
      { token: 'delimiter', foreground: 'b3aca3' },
    ],
    colors: {
      'editor.background': '#0e0c12',
      'editor.foreground': '#f5f1ea',
      'editor.lineHighlightBackground': '#1a1720',
      'editorLineNumber.foreground': '#5c5560',
      'editorLineNumber.activeForeground': '#f5c66b',
      'editorCursor.foreground': '#f5c66b',
      'editor.selectionBackground': '#e11d4844',
      'editorIndentGuide.background1': '#24202b',
    },
  });
}

export default function Arena() {
  const { matchId } = useParams();
  const socket = useSocket();
  const { user, refreshUser } = useAuth();

  const [match, setMatch] = useState(null); // everything from "match:join"
  const [loadError, setLoadError] = useState('');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null); // latest Judge0 result
  const [notice, setNotice] = useState(''); // e.g. "Slow down!"
  const [myPassed, setMyPassed] = useState(0);
  const [opponent, setOpponent] = useState({ passed: 0, connected: true });
  const [graceLeft, setGraceLeft] = useState(0); // seconds until opponent forfeits
  const [result, setResult] = useState(null); // set when "match:over" arrives
  const [startedAt] = useState(() => Date.now()); // for the match timer
  const [now, setNow] = useState(() => Date.now());

  // ---------- 1. Load the match (and reload after a reconnect) ----------
  // useRef holds a value that survives re-renders WITHOUT causing one.
  const resultRef = useRef(null);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  const loadMatch = useCallback(async () => {
    if (!socket) return;
    const res = await socket.emitWithAck('match:join', matchId);
    if (resultRef.current) return; // match already ended, keep the popup

    if (!res.ok) {
      setLoadError(res.message);
      return;
    }
    const m = res.match;
    setMatch(m);
    // Keep the player's saved edits if they refreshed; otherwise start from the buggy code.
    setCode((current) => current || storage.load(matchId) || m.challenge.buggyCode);
    setMyPassed(m.me.passed);
    setOpponent({ passed: m.opponent.passed, connected: m.opponent.connected });
  }, [socket, matchId]);

  useEffect(() => {
    if (!socket) return;
    loadMatch();
    // If the connection drops and comes back, re-sync with the server.
    socket.io.on('reconnect', loadMatch);
    return () => socket.io.off('reconnect', loadMatch);
  }, [socket, loadMatch]);

  // ---------- 2. Live events from the server ----------
  useEffect(() => {
    if (!socket) return;

    const onProgress = ({ passed }) => setOpponent((o) => ({ ...o, passed }));

    const onStatus = ({ connected, graceSeconds }) => {
      setOpponent((o) => ({ ...o, connected }));
      setGraceLeft(connected ? 0 : graceSeconds);
    };

    const onOver = (payload) => {
      if (payload.matchId !== matchId) return;
      setResult(payload);
      storage.clear(matchId);
      refreshUser(); // update the Elo shown in the navbar
    };

    socket.on('opponent:progress', onProgress);
    socket.on('opponent:status', onStatus);
    socket.on('match:over', onOver);
    return () => {
      socket.off('opponent:progress', onProgress);
      socket.off('opponent:status', onStatus);
      socket.off('match:over', onOver);
    };
  }, [socket, matchId, refreshUser]);

  // Countdown shown while the opponent is disconnected.
  useEffect(() => {
    if (graceLeft <= 0) return;
    const t = setTimeout(() => setGraceLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [graceLeft]);

  // Match timer: tick every second until the match ends.
  useEffect(() => {
    if (result) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [result]);
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));

  // ---------- 3. Run code ----------
  const runCode = async () => {
    if (running || result || !socket) return;
    setRunning(true);
    setNotice('');
    try {
      // .timeout() makes emitWithAck throw if the server never answers.
      const res = await socket.timeout(RUN_TIMEOUT_MS).emitWithAck('code:run', { matchId, code });
      if (!res.ok) {
        setNotice(res.message);
      } else {
        setLastRun(res.result);
        setMyPassed(res.result.passed);
      }
    } catch {
      setNotice('The server did not answer. Try again.');
    } finally {
      setRunning(false);
    }
  };

  // Monaco keeps the FIRST function we give its shortcut, so we point the
  // shortcut at a ref that always holds the latest runCode.
  const runRef = useRef(runCode);
  useEffect(() => {
    runRef.current = runCode;
  });

  const onEditorMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
  };

  const onCodeChange = (value = '') => {
    setCode(value);
    storage.save(matchId, value);
  };

  const resetCode = () => {
    if (window.confirm('Reset to the original buggy code? Your changes will be lost.')) {
      onCodeChange(match.challenge.buggyCode);
    }
  };

  const forfeit = () => {
    if (window.confirm('Give up this match? You will lose Elo.')) socket.emit('match:forfeit', matchId);
  };

  // ---------- Render ----------
  if (result && !match) {
    // Match ended before we even loaded it (rare) - just show the result.
    return <ResultModal result={result} myId={user.id} />;
  }

  if (loadError) {
    return (
      <main className="mx-auto grid max-w-md place-items-center gap-4 px-4 py-20 text-center fade-up">
        <span className="grid h-16 w-16 place-items-center rounded-full border border-line bg-panel text-mist">
          <Icon name="swords" className="h-8 w-8" />
        </span>
        <p className="text-lg">{loadError}</p>
        <Link to="/" className="rounded-xl bg-crimson px-5 py-2.5 font-bold text-white">
          Back to lobby
        </Link>
      </main>
    );
  }

  if (!match) {
    return (
      <div className="grid place-items-center gap-4 py-24 text-mist">
        <Enso className="enso-spin h-20 w-20" />
        Entering the arena…
      </div>
    );
  }

  const { challenge, total } = match;
  const runState = running
    ? 'running'
    : !lastRun
      ? 'idle'
      : lastRun.error
        ? 'error'
        : lastRun.passed === lastRun.total
          ? 'pass'
          : 'partial';

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 fade-up">
      {/* ---------- Versus header ---------- */}
      <section className="relative mb-5 overflow-hidden rounded-3xl border border-line bg-panel p-4 sm:p-6">
        <div className="pointer-events-none absolute -left-20 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-crimson/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-sky-500/15 blur-3xl" />

        <button
          onClick={forfeit}
          disabled={Boolean(result)}
          title="Forfeit this match"
          className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-mist transition hover:border-crimson/50 hover:text-crimson-light disabled:opacity-40"
        >
          <Icon name="flag" className="h-3.5 w-3.5" />
          Forfeit
        </button>

        <div className="relative grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
          <Fighter label="You" name={match.me.username} elo={match.me.elo} passed={myPassed} total={total} tone="crimson" />

          {/* centre: challenge + VS emblem + timer */}
          <div className="order-first flex flex-col items-center text-center md:order-none">
            <span className={`rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${DIFFICULTY_STYLES[challenge.difficulty]}`}>
              {challenge.difficulty}
            </span>
            <h1 className="mt-2 font-display text-xl font-bold uppercase tracking-wide sm:text-2xl">{challenge.title}</h1>
            <div className="relative mt-3 h-16 w-16">
              <Enso color="#f5c66b" className="h-full w-full" />
              <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold text-gold">VS</span>
            </div>
            <span className="mt-2 flex items-center gap-1.5 font-mono text-sm text-mist">
              <Icon name="clock" className="h-4 w-4" />
              {mmss(elapsed)}
            </span>
          </div>

          <Fighter
            align="right"
            label="Opponent"
            name={match.opponent.username}
            elo={match.opponent.elo}
            passed={opponent.passed}
            total={total}
            tone="sky"
          />
        </div>

        {!opponent.connected && (
          <p role="status" className="relative mt-4 flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-gold">
            <Icon name="wifi" className="h-4 w-4" />
            Opponent disconnected — they forfeit in {graceLeft}s unless they return.
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]">
        {/* ---------- Left: mission + tests ---------- */}
        <div className="grid content-start gap-5">
          <section className="rounded-2xl border border-line bg-panel p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-gold">Mission</p>
            <p className="mt-2 leading-relaxed text-ink/90">{challenge.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg border border-line bg-night/60 px-2.5 py-1 font-mono text-gold">{challenge.functionName}()</span>
              <span className="rounded-lg border border-line bg-night/60 px-2.5 py-1 text-mist">Keep this name</span>
              <span className="rounded-lg border border-line bg-night/60 px-2.5 py-1 text-mist">Node.js 12: no ?. or ??</span>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.35em] text-gold">Tests</p>
              <span className="rounded-full bg-panel-2 px-3 py-1 text-xs font-semibold">
                <span className={myPassed === total ? 'text-emerald-300' : 'text-ink'}>{myPassed}</span>
                <span className="text-mist"> / {total} passed</span>
              </span>
            </div>
            <ul className="grid gap-2.5">
              {challenge.testCases.map((t, i) => (
                <TestItem key={i} index={i} fn={challenge.functionName} test={t} result={lastRun?.results[i]} />
              ))}
            </ul>
          </section>
        </div>

        {/* ---------- Right: editor + output ---------- */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="flex items-center gap-2 border-b border-line bg-night/40 px-3 py-2">
            <span className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm">
              <Icon name="file" className="h-4 w-4 text-gold" />
              solution.js
            </span>
            <span className="hidden rounded-md bg-gold/10 px-2 py-0.5 text-[11px] font-bold text-gold sm:inline">JS</span>
            <button
              onClick={resetCode}
              title="Reset to the original buggy code"
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-mist transition hover:bg-white/5 hover:text-white"
            >
              <Icon name="reset" className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={runCode}
              disabled={running || Boolean(result)}
              title="Ctrl + Enter"
              className="flex items-center gap-2 rounded-lg bg-crimson px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {running ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Icon name="play" className="h-4 w-4" />
              )}
              {running ? 'Running…' : 'Run code'}
              <kbd className="hidden rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] font-normal md:inline">Ctrl ↵</kbd>
            </button>
          </div>

          <div className="h-[56vh] min-h-80">
            <Editor
              language="javascript"
              theme="crimson-night"
              beforeMount={defineCrimsonTheme}
              value={code}
              onChange={onCodeChange}
              onMount={onEditorMount}
              loading={<span className="text-mist">Loading editor…</span>}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true, // resize with the window
                tabSize: 2,
                padding: { top: 12 },
                readOnly: Boolean(result),
              }}
            />
          </div>

          {/* Output console */}
          <div className="border-t border-line bg-night/70">
            <div className="flex items-center justify-between border-b border-line px-4 py-2">
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-mist">
                <Icon name="terminal" className="h-4 w-4" />
                Output
              </span>
              <StatusPill state={runState} passed={lastRun?.passed} total={lastRun?.total} />
            </div>
            <div className="max-h-48 min-h-24 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs">
              {notice && <p className="mb-1 text-gold">{notice}</p>}
              {!lastRun && !notice && <p className="text-mist/70">Press Run code (or Ctrl + Enter) to test your fix.</p>}
              {lastRun && (
                <>
                  <p className={lastRun.passed === lastRun.total ? 'text-emerald-300' : 'text-ink/85'}>
                    {lastRun.passed === lastRun.total ? 'All tests passed!' : `Passed ${lastRun.passed} of ${lastRun.total} tests.`}
                  </p>
                  {lastRun.error && <p className="mt-1 text-crimson-light">{lastRun.error}</p>}
                  {lastRun.logs && <p className="mt-1 text-mist">{lastRun.logs}</p>}
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {result && <ResultModal result={result} myId={user.id} />}
    </main>
  );
}

// ---------- Small pieces of the arena ----------
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const TONES = {
  crimson: { ring: '#e11d48', fill: 'bg-gradient-to-r from-crimson to-ember shadow-[0_0_10px_rgba(225,29,72,0.6)]', text: 'text-crimson-light' },
  sky: { ring: '#38bdf8', fill: 'bg-gradient-to-r from-sky-400 to-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.6)]', text: 'text-sky-300' },
};

// One player's side of the versus header.
function Fighter({ align = 'left', label, name, elo, passed, total, tone }) {
  const t = TONES[tone];
  const right = align === 'right';
  return (
    <div className={`flex items-center gap-4 ${right ? 'md:flex-row-reverse md:text-right' : ''}`}>
      <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
        <Enso color={t.ring} className="h-full w-full" />
        <span className="absolute inset-0 grid place-items-center font-display text-2xl font-bold">{name[0].toUpperCase()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] uppercase tracking-[0.3em] ${t.text}`}>{label}</p>
        <p className="truncate font-display text-lg font-bold uppercase tracking-wide sm:text-xl">{name}</p>
        <p className="text-xs text-mist">Elo {elo}</p>
        {/* one block per test, filling from the outside in */}
        <div
          className={`mt-2 flex gap-1 ${right ? 'md:flex-row-reverse' : ''}`}
          role="progressbar"
          aria-label={`${label} progress`}
          aria-valuenow={passed}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className="h-2.5 flex-1 overflow-hidden rounded-full bg-panel-2">
              <span className={`block h-full rounded-full transition-all duration-700 ${i < passed ? `w-full ${t.fill}` : 'w-0'}`} />
            </span>
          ))}
        </div>
        <p className="mt-1 text-xs text-mist">
          <b className="text-ink">{passed}</b> / {total} tests
        </p>
      </div>
    </div>
  );
}

// One test case: grey before running, green tick when passing, red cross when failing.
function TestItem({ index, fn, test, result }) {
  const state = !result ? 'idle' : result.passed ? 'pass' : 'fail';
  const box = {
    idle: 'border-line bg-night/50',
    pass: 'border-emerald-400/30 bg-emerald-400/5',
    fail: 'border-crimson/40 bg-crimson/5',
  }[state];
  const badge = {
    idle: 'border border-line text-mist',
    pass: 'bg-emerald-400/15 text-emerald-300',
    fail: 'bg-crimson/20 text-crimson-light',
  }[state];
  return (
    <li className={`flex gap-3 rounded-xl border p-3 transition ${box}`}>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${badge}`}>
        {state === 'pass' ? <Icon name="check" className="h-4 w-4" /> : state === 'fail' ? <Icon name="x" className="h-4 w-4" /> : index + 1}
      </span>
      <div className="min-w-0 break-all font-mono text-xs leading-relaxed">
        <p className="text-ink">
          {fn}({formatArgs(test.input)})
        </p>
        <p className="text-mist">expected {test.expected}</p>
        {state === 'fail' && <p className="text-crimson-light">{result.error ? `error: ${result.error}` : `got ${result.actual}`}</p>}
      </div>
    </li>
  );
}

// Small status chip in the output console header.
function StatusPill({ state, passed, total }) {
  const map = {
    idle: ['Ready', 'bg-panel-2 text-mist'],
    running: ['Running…', 'bg-gold/15 text-gold'],
    pass: ['All passed', 'bg-emerald-400/15 text-emerald-300'],
    partial: [`${passed} / ${total} passed`, 'bg-gold/15 text-gold'],
    error: ['Error', 'bg-crimson/20 text-crimson-light'],
  };
  const [text, cls] = map[state];
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{text}</span>;
}
