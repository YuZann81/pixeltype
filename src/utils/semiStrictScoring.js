/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Isolated Semi-Strict Scoring Utility for PixelType Next (Candidate Formula).
 *
 * Per round:
 *   G = min(WPM / 20, 1)
 *   R = 45 * min(WPM / 120, 1) + 55 * (ACC / 100)^2 * G
 *
 * Final score:
 *   FinalScore = Math.round(R1 + R2 + R3)   (Max: 300)
 *
 * NOTE: Kept isolated from P2R production score submission until a dedicated
 * P2R event is approved for the 0-300 scale (historical scores use 500-1200+ scale).
 */

export const MAX_ROUND_SCORE = 100;
export const MAX_FINAL_SCORE = 300;
export const WPM_SPEED_CAP = 120;
export const WPM_PARTICIPATION_FLOOR = 20;

function sanitizeFiniteNonNegative(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

/**
 * Calculate unrounded per-round semi-strict score (0..100).
 * Keeps full floating-point precision for intermediate aggregation.
 */
export function calculateSemiStrictRoundScore(wpm, acc) {
  const safeWpm = sanitizeFiniteNonNegative(wpm);
  const safeAcc = Math.min(100, sanitizeFiniteNonNegative(acc));

  if (safeWpm <= 0) {
    return 0;
  }

  const participationGate = Math.min(safeWpm / WPM_PARTICIPATION_FLOOR, 1);
  const speedComponent = 45 * Math.min(safeWpm / WPM_SPEED_CAP, 1);
  const accuracyRatio = safeAcc / 100;
  const accuracyComponent = 55 * (accuracyRatio * accuracyRatio) * participationGate;

  return Math.min(MAX_ROUND_SCORE, Math.max(0, speedComponent + accuracyComponent));
}

/**
 * Calculate aggregate final score across up to 3 rounds.
 * Keeps decimal precision during per-round calculations and rounds ONLY the final aggregate.
 */
export function calculateSemiStrictFinalScore(rounds = []) {
  if (!Array.isArray(rounds) || rounds.length === 0) {
    return {
      roundScores: [0, 0, 0],
      rawTotal: 0,
      finalScore: 0,
    };
  }

  const roundScores = [];
  for (let i = 0; i < 3; i++) {
    const r = rounds[i];
    if (!r || typeof r !== "object") {
      roundScores.push(0);
      continue;
    }
    roundScores.push(calculateSemiStrictRoundScore(r.wpm, r.acc));
  }

  const rawTotal = roundScores[0] + roundScores[1] + roundScores[2];
  const finalScore = Math.min(MAX_FINAL_SCORE, Math.max(0, Math.round(rawTotal)));

  return {
    roundScores,
    rawTotal,
    finalScore,
  };
}
