import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ENGINE_PHASES,
  ACTIVE_ROUND_SECONDS,
  COUNTDOWN_MS,
  ACTIVE_ROUND_MS,
  INTERMISSION_MS,
  createInitialEngineState,
  computeRemainingSeconds,
  computeActiveElapsedSeconds,
  advanceEnginePhase,
} from "../typingEngineCore.js";
import {
  calculateSemiStrictRoundScore,
  calculateSemiStrictFinalScore,
  MAX_FINAL_SCORE,
} from "../semiStrictScoring.js";
import {
  formatPixelTypeTelemetry,
  validatePixelTypeTelemetry,
} from "../../lib/api/scoringAdapter.ts";

describe("PixelType Next — Typing Engine FSM", () => {
  test("executes exact 3-round state sequence without extra intermission after Round 3", () => {
    let t = 1000;
    let state = createInitialEngineState(t);

    assert.equal(state.phase, ENGINE_PHASES.COUNTDOWN);
    assert.equal(state.round, 1);
    assert.equal(state.phaseDurationMs, COUNTDOWN_MS);

    // Round 1: countdown -> active -> intermission
    t += COUNTDOWN_MS;
    state = advanceEnginePhase(state, t);
    assert.equal(state.phase, ENGINE_PHASES.ACTIVE);
    assert.equal(state.round, 1);
    assert.equal(state.phaseDurationMs, ACTIVE_ROUND_MS);

    t += ACTIVE_ROUND_MS;
    state = advanceEnginePhase(state, t, { characters_typed: 120, correct_characters: 115 });
    assert.equal(state.phase, ENGINE_PHASES.INTERMISSION);
    assert.equal(state.round, 1);
    assert.equal(state.phaseDurationMs, INTERMISSION_MS);
    assert.equal(state.completedRounds.length, 1);

    // Round 2: intermission -> countdown -> active -> intermission
    t += INTERMISSION_MS;
    state = advanceEnginePhase(state, t);
    assert.equal(state.phase, ENGINE_PHASES.COUNTDOWN);
    assert.equal(state.round, 2);

    t += COUNTDOWN_MS;
    state = advanceEnginePhase(state, t);
    assert.equal(state.phase, ENGINE_PHASES.ACTIVE);
    assert.equal(state.round, 2);

    t += ACTIVE_ROUND_MS;
    state = advanceEnginePhase(state, t, { characters_typed: 140, correct_characters: 130 });
    assert.equal(state.phase, ENGINE_PHASES.INTERMISSION);
    assert.equal(state.completedRounds.length, 2);

    // Round 3: intermission -> countdown -> active -> finished (NO intermission)
    t += INTERMISSION_MS;
    state = advanceEnginePhase(state, t);
    assert.equal(state.phase, ENGINE_PHASES.COUNTDOWN);
    assert.equal(state.round, 3);

    t += COUNTDOWN_MS;
    state = advanceEnginePhase(state, t);
    assert.equal(state.phase, ENGINE_PHASES.ACTIVE);
    assert.equal(state.round, 3);

    t += ACTIVE_ROUND_MS;
    state = advanceEnginePhase(state, t, { characters_typed: 150, correct_characters: 145 });
    assert.equal(state.phase, ENGINE_PHASES.FINISHED);
    assert.equal(state.completedRounds.length, 3);

    // Terminal state remains finished
    const afterFinished = advanceEnginePhase(state, t + 5000);
    assert.equal(afterFinished.phase, ENGINE_PHASES.FINISHED);

    // Verify P2R adapter invariants (countdown & intermission excluded: exactly 3 x 30s)
    const telemetry = formatPixelTypeTelemetry(state.completedRounds, {
      language: "IND",
      finalScore: 250,
    });
    assert.doesNotThrow(() => validatePixelTypeTelemetry(telemetry));
    assert.equal(telemetry.completion_time_ms, 90000);
    for (const r of telemetry.rounds) {
      assert.equal(r.duration, ACTIVE_ROUND_SECONDS);
      assert.equal(r.characters_typed, r.correct_characters + r.incorrect_characters);
    }
  });

  test("handles timer drift, tab stalls, and zero-activity rounds safely", () => {
    // Tab stall beyond 30s clamps remaining to 0 and active elapsed to 30
    assert.equal(computeRemainingSeconds(45000, 1000, ACTIVE_ROUND_MS), 0);
    assert.equal(computeActiveElapsedSeconds(45000, 1000), ACTIVE_ROUND_SECONDS);

    // Zero activity round satisfies P2R invariant
    let s = createInitialEngineState(0);
    s = advanceEnginePhase(s, COUNTDOWN_MS);
    s = advanceEnginePhase(s, COUNTDOWN_MS + ACTIVE_ROUND_MS, {
      characters_typed: 0,
      correct_characters: 0,
    });
    assert.equal(s.completedRounds[0].characters_typed, 0);
    assert.equal(s.completedRounds[0].correct_characters, 0);
    assert.equal(s.completedRounds[0].incorrect_characters, 0);
  });
});

describe("PixelType Next — Isolated Semi-Strict Scoring", () => {
  test("prevents 1-character AFK accuracy exploit", () => {
    // 0.4 WPM, 100% ACC -> G = 0.02 -> R = 0.15 + 1.1 = 1.25 -> Final = 4 / 300
    const afk = calculateSemiStrictFinalScore([
      { wpm: 0.4, acc: 100 },
      { wpm: 0.4, acc: 100 },
      { wpm: 0.4, acc: 100 },
    ]);
    assert.ok(afk.finalScore <= 5, `AFK score too high: ${afk.finalScore}`);
  });

  test("handles zero activity, negative, NaN, and Infinity safely", () => {
    assert.equal(calculateSemiStrictRoundScore(0, 100), 0);
    assert.equal(calculateSemiStrictRoundScore(-50, 100), 0);
    assert.equal(calculateSemiStrictRoundScore(NaN, 100), 0);
    assert.equal(calculateSemiStrictRoundScore(Infinity, 100), 0);
    assert.equal(calculateSemiStrictRoundScore(60, NaN), 22.5);

    const empty = calculateSemiStrictFinalScore([]);
    assert.equal(empty.finalScore, 0);
  });

  test("caps at 300 for 120+ WPM and 100% ACC and rounds only final aggregate", () => {
    const perfect = calculateSemiStrictFinalScore([
      { wpm: 150, acc: 100 },
      { wpm: 120, acc: 100 },
      { wpm: 130, acc: 100 },
    ]);
    assert.equal(perfect.finalScore, MAX_FINAL_SCORE);

    // Consistent 70 WPM / 95% ACC across 3 rounds -> R = 26.25 + 49.6375 = 75.8875 -> 227.6625 -> 228
    const consistent = calculateSemiStrictFinalScore([
      { wpm: 70, acc: 95 },
      { wpm: 70, acc: 95 },
      { wpm: 70, acc: 95 },
    ]);
    assert.equal(consistent.finalScore, 228);

    // High WPM / poor ACC (95 WPM, 65% ACC) vs Low WPM / high ACC (35 WPM, 99% ACC)
    const sloppy = calculateSemiStrictFinalScore([
      { wpm: 95, acc: 65 },
      { wpm: 95, acc: 65 },
      { wpm: 95, acc: 65 },
    ]);
    const accurate = calculateSemiStrictFinalScore([
      { wpm: 35, acc: 99 },
      { wpm: 35, acc: 99 },
      { wpm: 35, acc: 99 },
    ]);
    assert.ok(accurate.finalScore > sloppy.finalScore);
  });
});
