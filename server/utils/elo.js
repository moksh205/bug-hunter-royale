// ============================================================
//  Elo rating maths (the same idea chess uses).
//
//  1. Work out how LIKELY the winner was to win:
//       expected = 1 / (1 + 10^((loserElo - winnerElo) / 400))
//  2. Points gained = K * (1 - expected)
//     - Beat a stronger player  -> expected is low  -> big gain
//     - Beat a weaker player    -> expected is high -> small gain
//  The loser loses exactly what the winner gains.
// ============================================================

const K_FACTOR = 32; // max points that can change hands in one match

export function calculateElo(winnerElo, loserElo) {
  const expectedWin = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));

  // Always move at least 1 point, so every win counts.
  const change = Math.max(1, Math.round(K_FACTOR * (1 - expectedWin)));

  return {
    change,
    winnerElo: winnerElo + change,
    loserElo: Math.max(0, loserElo - change), // never go below 0
  };
}
