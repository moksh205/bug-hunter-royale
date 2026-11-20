// A labelled progress bar: "alice  3 / 5 tests".
// `color` is a Tailwind background class, e.g. "bg-crimson".
export default function ProgressBar({ label, passed, total, color, children }) {
  const percent = total ? Math.round((passed / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1 gap-2">
        <span className="font-semibold truncate">{label}</span>
        <span className="text-mist whitespace-nowrap">
          {passed} / {total} tests
        </span>
      </div>
      <div
        className="h-3 rounded-full bg-panel-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* transition-all animates the bar when the width changes */}
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${percent}%` }} />
      </div>
      {children}
    </div>
  );
}
