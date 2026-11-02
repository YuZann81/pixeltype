/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hitung Words Per Minute (WPM)
 * Rumus standar: (Karakter benar / 5) / (Detik berlalu / 60)
 */
export function calculateWPM(correctChars = 0, elapsedSeconds = 0) {
  if (elapsedSeconds <= 0 || correctChars <= 0) return 0;
  const minutes = elapsedSeconds / 60;
  const words = correctChars / 5;
  const wpm = Math.round(words / minutes);
  return Math.max(0, wpm);
}

/**
 * Hitung Akurasi pengetikan (ACC) dalam persen 0–100%
 */
export function calculateAccuracy(correctChars = 0, totalTyped = 0) {
  if (totalTyped <= 0) return 100;
  const acc = Math.round((correctChars / totalTyped) * 100);
  return Math.min(100, Math.max(0, acc));
}

/**
 * Hitung Total Score berdasarkan WPM, Akurasi, dan Max Combo
 */
export function calculateScore(wpm = 0, accuracy = 100, maxCombo = 0) {
  const baseScore = wpm * 10;
  const accuracyMultiplier = Math.max(0.5, accuracy / 100);
  const comboBonus = maxCombo * 4;
  const finalScore = Math.round(baseScore * accuracyMultiplier + comboBonus);
  return Math.max(0, finalScore);
}
