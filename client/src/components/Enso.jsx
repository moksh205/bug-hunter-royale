// ============================================================
//  Ensō - a hand-painted brush circle (Japanese ink style).
//  Several slightly wobbly strokes drawn on top of each other.
//  It "paints itself" in when it appears (see .enso in index.css).
// ============================================================

// Pre-computed once: the same ring every render (no random flicker).
const STROKES = Array.from({ length: 6 }, (_, s) => {
  const r = 76 + (s - 2.5) * 2.4;
  const start = -100 + s * 2;
  const end = 236 - s * 5;
  let d = '';
  for (let a = start; a <= end; a += 5) {
    const rad = (a * Math.PI) / 180;
    const wobble = Math.sin(a / 21 + s) * 1.4;
    const x = 100 + (r + wobble) * Math.cos(rad);
    const y = 100 + (r + wobble) * Math.sin(rad);
    d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return { d, width: [3, 6, 4, 7, 2.5, 5][s], opacity: [0.9, 0.7, 1, 0.55, 0.8, 0.65][s] };
});

export default function Enso({ color = '#e11d48', className = '' }) {
  return (
    <svg viewBox="0 0 200 200" className={`enso ${className}`} style={{ '--enso': color }} aria-hidden="true">
      {STROKES.map((st, i) => (
        <path
          key={i}
          d={st.d}
          strokeWidth={st.width}
          opacity={st.opacity}
          pathLength="1000"
          style={{ animationDelay: `${i * 0.06}s` }}
        />
      ))}
    </svg>
  );
}
