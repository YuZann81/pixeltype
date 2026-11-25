/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure finite state machine (FSM) and timing helpers for PixelType Next.
 *
 * State sequence:
 * countdown (3s) -> active (30s) -> intermission (2s)
 * -> countdown (3s) -> active (30s) -> intermission (2s)
 * -> countdown (3s) -> active (30s) -> finished
 *
 * Transition phases (countdown, intermission) are strictly excluded from
 * active typing duration (30s per round, 90s total).
 */

export const TOTAL_ROUNDS = 3;
export const ACTIVE_ROUND_SECONDS = 30;
export const ACTIVE_ROUND_MS = ACTIVE_ROUND_SECONDS * 1000;
export const COUNTDOWN_SECONDS = 3;
export const COUNTDOWN_MS = COUNTDOWN_SECONDS * 1000;
export const INTERMISSION_SECONDS = 2;
export const INTERMISSION_MS = INTERMISSION_SECONDS * 1000;

export const ENGINE_PHASES = {
  COUNTDOWN: "countdown",
  ACTIVE: "active",
  INTERMISSION: "intermission",
  FINISHED: "finished",
};

/**
 * Create initial FSM state for a 3-round PixelType match.
 */
export function createInitialEngineState(nowMs = 0) {
  return {
    phase: ENGINE_PHASES.COUNTDOWN,
    round: 1,
    totalRounds: TOTAL_ROUNDS,
    phaseStartedAtMs: nowMs,
    phaseDurationMs: COUNTDOWN_MS,
    /** @type {Array<{ round: number, duration: number, characters_typed: number, correct_characters: number, incorrect_characters: number }>} */
    completedRounds: [],
  };
}

/**
 * Compute remaining seconds for the current phase from performance.now() delta.
 * Handles negative/stalled deltas safely.
 */
export function computeRemainingSeconds(nowMs, phaseStartedAtMs, phaseDurationMs) {
  const elapsedMs = Math.max(0, nowMs - phaseStartedAtMs);
  const remainingMs = Math.max(0, phaseDurationMs - elapsedMs);
  return Math.ceil(remainingMs / 1000);
}

/**
 * Compute active elapsed seconds within the current 30s active round (clamped 1..30).
 */
export function computeActiveElapsedSeconds(nowMs, phaseStartedAtMs) {
  const elapsedMs = Math.max(0, nowMs - phaseStartedAtMs);
  const clampedMs = Math.min(ACTIVE_ROUND_MS, elapsedMs);
  return Math.max(1, Math.floor(clampedMs / 1000));
}

/**
 * Pure FSM transition function when the current phase timer expires.
 * Does not mutate input state.
 * @param {ReturnType<typeof createInitialEngineState>} state
 * @param {number} nowMs
 * @param {{ characters_typed?: number, correct_characters?: number } | null} [roundTelemetry]
 */
export function advanceEnginePhase(state, nowMs, roundTelemetry = null) {
  if (state.phase === ENGINE_PHASES.COUNTDOWN) {
    return {
      ...state,
      phase: ENGINE_PHASES.ACTIVE,
      phaseStartedAtMs: nowMs,
      phaseDurationMs: ACTIVE_ROUND_MS,
    };
  }

  if (state.phase === ENGINE_PHASES.ACTIVE) {
    const typed = Math.max(0, Math.floor(roundTelemetry?.characters_typed ?? 0));
    const correct = Math.min(typed, Math.max(0, Math.floor(roundTelemetry?.correct_characters ?? 0)));
    const incorrect = typed - correct;

    const recorded = {
      round: state.round,
      duration: ACTIVE_ROUND_SECONDS,
      characters_typed: typed,
      correct_characters: correct,
      incorrect_characters: incorrect,
    };

    const nextCompletedRounds = [...state.completedRounds, recorded];

    // No extra intermission after Round 3: transition directly to finished
    if (state.round >= state.totalRounds) {
      return {
        ...state,
        phase: ENGINE_PHASES.FINISHED,
        phaseStartedAtMs: nowMs,
        phaseDurationMs: 0,
        completedRounds: nextCompletedRounds,
      };
    }

    return {
      ...state,
      phase: ENGINE_PHASES.INTERMISSION,
      phaseStartedAtMs: nowMs,
      phaseDurationMs: INTERMISSION_MS,
      completedRounds: nextCompletedRounds,
    };
  }

  if (state.phase === ENGINE_PHASES.INTERMISSION) {
    return {
      ...state,
      phase: ENGINE_PHASES.COUNTDOWN,
      round: state.round + 1,
      phaseStartedAtMs: nowMs,
      phaseDurationMs: COUNTDOWN_MS,
    };
  }

  // FINISHED is terminal
  return state;
}
