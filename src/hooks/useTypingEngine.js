/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { sampleTextID, sampleTextEN, generateTypingSentence } from "../data/words.js";
import { evaluateSegmentInput, calculateWPM, calculateAccuracy } from "../utils/stats.js";
import {
  ENGINE_PHASES,
  TOTAL_ROUNDS,
  ACTIVE_ROUND_SECONDS,
  ACTIVE_ROUND_MS,
  COUNTDOWN_SECONDS,
  COUNTDOWN_MS,
  INTERMISSION_SECONDS,
  INTERMISSION_MS,
  createInitialEngineState,
  computeRemainingSeconds,
  computeActiveElapsedSeconds,
  advanceEnginePhase,
} from "../utils/typingEngineCore.js";

/**
 * Dedicated typing engine hook for PixelType Next.
 *
 * Manages:
 * - Explicit FSM: countdown (3s) -> active (30s) -> intermission (2s) -> ... -> finished
 * - High-resolution performance.now() timing resistant to timer drift & tab stalls
 * - Ref-backed character accounting (zero stale React state on final keystroke)
 * - Continuous word-segment generation within each 30s active round
 */
export function useTypingEngine({
  language = "IND",
  isPlaying = false,
  isFinished = false,
  onIncrementCombo,
  onResetCombo,
  onUpdateStats,
  onRecordRound,
  onNextRound,
  onFinishGame,
}) {
  const [engineState, setEngineState] = useState(() =>
    createInitialEngineState(performance.now())
  );
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const [targetText, setTargetText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [roundCorrectChars, setRoundCorrectChars] = useState(0);
  const [roundTypedChars, setRoundTypedChars] = useState(0);
  const [cumulativeCorrectChars, setCumulativeCorrectChars] = useState(0);
  const [cumulativeTypedChars, setCumulativeTypedChars] = useState(0);
  const [lastRoundSummary, setLastRoundSummary] = useState(null);

  // Authoritative refs to prevent stale closures and duplicate transitions
  const engineStateRef = useRef(engineState);
  engineStateRef.current = engineState;

  const transitionLockRef = useRef(false);
  const segmentCorrectRef = useRef(0);
  const segmentTypedRef = useRef(0);
  const currentCorrectRef = useRef(0);
  const currentTypedRef = useRef(0);
  const cumulativeCorrectRef = useRef(0);
  const cumulativeTypedRef = useRef(0);
  const userInputRef = useRef("");
  const targetTextRef = useRef("");

  const getInitialSentence = useCallback(
    (roundNum) => {
      if (roundNum === 1) {
        return language === "ENG" ? sampleTextEN : sampleTextID;
      }
      return generateTypingSentence(language, 12 + roundNum * 2);
    },
    [language]
  );

  // Reset engine when a new match begins
  useEffect(() => {
    if (!isPlaying || isFinished) return;

    const now = performance.now();
    const initial = createInitialEngineState(now);
    engineStateRef.current = initial;
    setEngineState(initial);
    setTimeLeft(COUNTDOWN_SECONDS);

    const firstText = getInitialSentence(1);
    targetTextRef.current = firstText;
    userInputRef.current = "";
    setTargetText(firstText);
    setUserInput("");

    segmentCorrectRef.current = 0;
    segmentTypedRef.current = 0;
    currentCorrectRef.current = 0;
    currentTypedRef.current = 0;
    cumulativeCorrectRef.current = 0;
    cumulativeTypedRef.current = 0;
    setRoundCorrectChars(0);
    setRoundTypedChars(0);
    setCumulativeCorrectChars(0);
    setCumulativeTypedChars(0);
    setLastRoundSummary(null);
    transitionLockRef.current = false;
  }, [isPlaying, isFinished, getInitialSentence]);

  // Phase expiration & transition handler
  const handlePhaseComplete = useCallback(
    (nowMs) => {
      if (transitionLockRef.current) return;
      transitionLockRef.current = true;

      const current = engineStateRef.current;

      if (current.phase === ENGINE_PHASES.COUNTDOWN) {
        const next = advanceEnginePhase(current, nowMs);
        engineStateRef.current = next;
        setEngineState(next);
        setTimeLeft(ACTIVE_ROUND_SECONDS);
        transitionLockRef.current = false;
        return;
      }

      if (current.phase === ENGINE_PHASES.ACTIVE) {
        const finalRoundTyped = segmentTypedRef.current + currentTypedRef.current;
        const finalRoundCorrect = segmentCorrectRef.current + currentCorrectRef.current;
        const finalRoundIncorrect = Math.max(0, finalRoundTyped - finalRoundCorrect);

        const roundTelemetry = {
          round: current.round,
          duration: ACTIVE_ROUND_SECONDS,
          characters_typed: finalRoundTyped,
          correct_characters: finalRoundCorrect,
          incorrect_characters: finalRoundIncorrect,
        };

        onRecordRound?.(roundTelemetry);

        const nextCumCorrect = cumulativeCorrectRef.current + finalRoundCorrect;
        const nextCumTyped = cumulativeTypedRef.current + finalRoundTyped;
        cumulativeCorrectRef.current = nextCumCorrect;
        cumulativeTypedRef.current = nextCumTyped;
        setCumulativeCorrectChars(nextCumCorrect);
        setCumulativeTypedChars(nextCumTyped);

        const roundWpm = calculateWPM(finalRoundCorrect, ACTIVE_ROUND_SECONDS);
        const roundAcc = calculateAccuracy(finalRoundCorrect, finalRoundTyped);
        setLastRoundSummary({
          round: current.round,
          wpm: roundWpm,
          acc: roundAcc,
          charactersTyped: finalRoundTyped,
          correctCharacters: finalRoundCorrect,
        });

        onUpdateStats?.({
          correctChars: nextCumCorrect,
          totalChars: nextCumTyped,
          elapsedSeconds: current.round * ACTIVE_ROUND_SECONDS,
        });

        const next = advanceEnginePhase(current, nowMs, roundTelemetry);
        engineStateRef.current = next;
        setEngineState(next);

        // Reset per-round active buffers
        segmentCorrectRef.current = 0;
        segmentTypedRef.current = 0;
        currentCorrectRef.current = 0;
        currentTypedRef.current = 0;
        userInputRef.current = "";
        setRoundCorrectChars(0);
        setRoundTypedChars(0);
        setUserInput("");

        if (next.phase === ENGINE_PHASES.FINISHED) {
          onFinishGame?.();
          return;
        }

        setTimeLeft(INTERMISSION_SECONDS);
        transitionLockRef.current = false;
        return;
      }

      if (current.phase === ENGINE_PHASES.INTERMISSION) {
        const next = advanceEnginePhase(current, nowMs);
        engineStateRef.current = next;
        setEngineState(next);
        onNextRound?.();

        const nextText = getInitialSentence(next.round);
        targetTextRef.current = nextText;
        userInputRef.current = "";
        setTargetText(nextText);
        setUserInput("");
        setTimeLeft(COUNTDOWN_SECONDS);
        transitionLockRef.current = false;
      }
    },
    [getInitialSentence, onFinishGame, onNextRound, onRecordRound, onUpdateStats]
  );

  // High-resolution performance.now() tick loop (handles tab stalls & drift)
  useEffect(() => {
    if (!isPlaying || isFinished) return;
    if (engineState.phase === ENGINE_PHASES.FINISHED) return;

    const intervalId = setInterval(() => {
      const current = engineStateRef.current;
      if (current.phase === ENGINE_PHASES.FINISHED) return;

      const now = performance.now();
      const elapsedMs = Math.max(0, now - current.phaseStartedAtMs);
      const remaining = computeRemainingSeconds(
        now,
        current.phaseStartedAtMs,
        current.phaseDurationMs
      );
      setTimeLeft(remaining);

      if (current.phase === ENGINE_PHASES.ACTIVE) {
        const activeElapsed = computeActiveElapsedSeconds(now, current.phaseStartedAtMs);
        const totalElapsed = (current.round - 1) * ACTIVE_ROUND_SECONDS + activeElapsed;
        const totalCorrect =
          cumulativeCorrectRef.current + segmentCorrectRef.current + currentCorrectRef.current;
        const totalTyped =
          cumulativeTypedRef.current + segmentTypedRef.current + currentTypedRef.current;

        onUpdateStats?.({
          correctChars: totalCorrect,
          totalChars: totalTyped,
          elapsedSeconds: Math.max(1, totalElapsed),
        });
      }

      if (elapsedMs >= current.phaseDurationMs) {
        handlePhaseComplete(now);
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [isPlaying, isFinished, engineState.phase, handlePhaseComplete, onUpdateStats]);

  // Input handler (only accepts input during ACTIVE phase)
  const handleInputChange = useCallback(
    (newVal) => {
      const current = engineStateRef.current;
      if (!isPlaying || isFinished || current.phase !== ENGINE_PHASES.ACTIVE || transitionLockRef.current) {
        return;
      }

      const prevLen = userInputRef.current.length;
      const evaluation = evaluateSegmentInput(newVal, targetTextRef.current);
      const { clampedInput, typedChars, correctChars, isComplete } = evaluation;

      if (clampedInput.length < prevLen) {
        onResetCombo?.();
      } else if (clampedInput.length > prevLen) {
        for (let i = prevLen; i < clampedInput.length; i++) {
          if (clampedInput[i] === targetTextRef.current[i]) {
            onIncrementCombo?.();
          } else {
            onResetCombo?.();
          }
        }
      }

      if (isComplete) {
        segmentCorrectRef.current += correctChars;
        segmentTypedRef.current += typedChars;
        currentCorrectRef.current = 0;
        currentTypedRef.current = 0;
        userInputRef.current = "";

        const nextSegment = generateTypingSentence(language, 16);
        targetTextRef.current = nextSegment;

        setRoundCorrectChars(segmentCorrectRef.current);
        setRoundTypedChars(segmentTypedRef.current);
        setUserInput("");
        setTargetText(nextSegment);
        return;
      }

      currentCorrectRef.current = correctChars;
      currentTypedRef.current = typedChars;
      userInputRef.current = clampedInput;

      setRoundCorrectChars(segmentCorrectRef.current + correctChars);
      setRoundTypedChars(segmentTypedRef.current + typedChars);
      setUserInput(clampedInput);
    },
    [isPlaying, isFinished, language, onIncrementCombo, onResetCombo]
  );

  return {
    phase: engineState.phase,
    round: engineState.round,
    totalRounds: TOTAL_ROUNDS,
    timeLeft,
    targetText,
    userInput,
    roundCorrectChars,
    roundTypedChars,
    cumulativeCorrectChars,
    cumulativeTypedChars,
    totalDisplayedChars: cumulativeTypedChars + roundTypedChars,
    lastRoundSummary,
    completedRounds: engineState.completedRounds,
    isActive: engineState.phase === ENGINE_PHASES.ACTIVE,
    handleInputChange,
  };
}
