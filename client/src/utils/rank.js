// ============================================================
//  Rank title from Elo - just a label for the profile banner,
//  named after the Demon Slayer Corps ranks (lowest -> highest).
//  Purely visual: the server and matchmaking only use Elo.
// ============================================================
const RANKS = [
  [1800, 'Hashira'],
  [1600, 'Kinoe'],
  [1500, 'Kinoto'],
  [1400, 'Hinoe'],
  [1300, 'Hinoto'],
  [1250, 'Tsuchinoe'],
  [1200, 'Tsuchinoto'], // everyone starts here (1200)
  [1150, 'Kanoe'],
  [1100, 'Kanoto'],
  [1050, 'Mizunoe'],
  [0, 'Mizunoto'],
];

export function rankFor(elo) {
  const i = RANKS.findIndex(([min]) => elo >= min);
  const [min, name] = RANKS[i];
  const next = RANKS[i - 1]; // undefined when already Hashira
  return {
    name,
    next: next ? next[1] : null,
    // progress (0-1) from this rank's floor to the next rank
    progress: next ? Math.min(1, (elo - min) / (next[0] - min)) : 1,
    toNext: next ? next[0] - elo : 0,
  };
}
