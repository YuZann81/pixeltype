/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SpaceBackground from "../components/SpaceBackground.jsx";
import RoundIndicator from "../components/RoundIndicator.jsx";
import Timer from "../components/Timer.jsx";
import TypingArea from "../components/TypingArea.jsx";
import ComboCounter from "../components/ComboCounter.jsx";
import StatsBar from "../components/StatsBar.jsx";
import { useGame } from "../context/GameContext.jsx";
import { sampleTextID, sampleTextEN, generateTypingSentence } from "../data/words.js";

export default function Gameplay() {
  const navigate = useNavigate();
  const {
    state,
    tick,
    nextRound,
    incrementCombo,
    resetCombo,
    updateTypingStats,
    endGame,
    recordRound,
  } = useGame();

  const [userInput, setUserInput] = useState("");
  const [targetText, setTargetText] = useState("");
  const [roundStartTime, setRoundStartTime] = useState(Date.now());

  // Per-round typed and correct chars
  const [roundCorrectChars, setRoundCorrectChars] = useState(0);
  const [roundTypedChars, setRoundTypedChars] = useState(0);

  // Cumulative correct and total chars across completed rounds
  const [cumulativeCorrectChars, setCumulativeCorrectChars] = useState(0);
  const [cumulativeTypedChars, setCumulativeTypedChars] = useState(0);

  const inputRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const roundRef = useRef(state.round);
  roundRef.current = state.round;

  // Protect gameplay route: redirect if not playing or finished
  useEffect(() => {
    if (state.isFinished) {
      navigate("/overview");
    } else if (!state.isPlaying) {
      navigate("/guide");
    }
  }, [state.isPlaying, state.isFinished, navigate]);

  // Prepare sentence for current round
  const getSentenceForRound = useCallback(
    (roundNum) => {
      const isInd = state.language === "IND";
      if (roundNum === 1) {
        return isInd ? sampleTextID : sampleTextEN;
      }
      return generateTypingSentence(state.language, 12 + roundNum * 2);
    },
    [state.language]
  );

  // Initialize sentence whenever round changes (never initialize beyond totalRounds)
  useEffect(() => {
    if (state.round > state.totalRounds || !state.isPlaying || state.isFinished) {
      return;
    }
    const text = getSentenceForRound(state.round);
    setTargetText(text);
    setUserInput("");
    setRoundStartTime(Date.now());
  }, [state.round, state.totalRounds, state.isPlaying, state.isFinished, getSentenceForRound]);

  // Authoritative round completion handler (timer expiration or sentence finished)
  const completeCurrentRound = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const currentRoundNum = roundRef.current;

    // Build authoritative round telemetry for P2R
    const roundData = {
      round: currentRoundNum,
      duration: 30, // P2R PixelType scoring requirement: exactly 30 seconds
      characters_typed: roundTypedChars,
      correct_characters: roundCorrectChars,
      incorrect_characters: Math.max(0, roundTypedChars - roundCorrectChars),
    };

    recordRound(roundData);

    setCumulativeCorrectChars((prev) => prev + roundCorrectChars);
    setCumulativeTypedChars((prev) => prev + roundTypedChars);

    if (currentRoundNum < state.totalRounds) {
      nextRound();
      setRoundCorrectChars(0);
      setRoundTypedChars(0);
      setUserInput("");
      setRoundStartTime(Date.now());
      isTransitioningRef.current = false;
    } else {
      endGame();
      navigate("/overview");
    }
  }, [
    state.totalRounds,
    roundTypedChars,
    roundCorrectChars,
    recordRound,
    nextRound,
    endGame,
    navigate,
  ]);

  // Main countdown timer interval (1s)
  useEffect(() => {
    if (!state.isPlaying || state.isFinished) return;

    const timerInterval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [state.isPlaying, state.isFinished, tick]);

  // Handle timer reaching zero
  useEffect(() => {
    if (!state.isPlaying || state.isFinished) return;

    if (state.timer <= 0) {
      completeCurrentRound();
    }
  }, [state.timer, state.isPlaying, state.isFinished, completeCurrentRound]);

  // Keep stats in sync as time passes
  useEffect(() => {
    if (!state.isPlaying || state.isFinished) return;

    const roundElapsed = Math.max(1, 30 - state.timer);
    const totalElapsed = (roundRef.current - 1) * 30 + roundElapsed;

    const totalCorrect = cumulativeCorrectChars + roundCorrectChars;
    const totalTyped = cumulativeTypedChars + roundTypedChars;

    updateTypingStats({
      correctChars: totalCorrect,
      totalChars: totalTyped,
      elapsedSeconds: Math.max(1, totalElapsed),
    });
  }, [
    state.timer,
    state.isPlaying,
    state.isFinished,
    cumulativeCorrectChars,
    cumulativeTypedChars,
    roundCorrectChars,
    roundTypedChars,
    updateTypingStats,
  ]);

  const nick = state.user?.nick || "Player";
  const bestScore = state.bestScore || 0;
  const coins = state.coins || 120;
  const currentDisplayedCharacters = cumulativeTypedChars + roundTypedChars;

  // Keyboard input handler
  const handleInputChange = (newVal) => {
    if (!state.isPlaying || state.isFinished || isTransitioningRef.current) return;

    const prevLen = userInput.length;
    const newLen = newVal.length;

    // Handle backspace / deletion
    if (newLen < prevLen) {
      setUserInput(newVal);
      return;
    }

    // Process new typed character(s)
    const charIndex = newLen - 1;
    if (charIndex >= targetText.length) return;

    const typedChar = newVal[charIndex];
    const expectedChar = targetText[charIndex];

    const isMatch = typedChar === expectedChar;

    if (isMatch) {
      incrementCombo();
      setRoundCorrectChars((prev) => prev + 1);
    } else {
      resetCombo();
    }

    setRoundTypedChars((prev) => prev + 1);
    setUserInput(newVal);

    // If target sentence is fully completed, transition round immediately
    if (newVal.length === targetText.length) {
      completeCurrentRound();
    }
  };

  return (
    <div
      id="gameplay-page"
      className="relative min-h-screen flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden"
    >
      <SpaceBackground variant="gameplay" />

      {/* Border Hijau di sekeliling halaman gameplay ("AI Frame") */}
      <div
        id="ai-frame-border"
        className="fixed inset-2 sm:inset-3 border-2 border-[#4ADE80]/80 rounded-2xl pointer-events-none z-30 shadow-[0_0_15px_rgba(74,222,128,0.15)]"
      >
        <div className="absolute top-1.5 left-4 px-2 bg-[#0B0B1F] text-[10px] font-mono text-[#4ADE80] tracking-widest uppercase">
          AI Frame // LIVE SESSION
        </div>
      </div>

      {/* Header Bar: Kiri (PixelType) + Kanan (Account info vertikal) */}
      <header className="w-full max-w-4xl mx-auto flex items-start justify-between pt-3 px-2 z-10">
        {/* Atas kiri: PixelType (font pixel, kecil) */}
        <div id="gameplay-logo" className="pt-1">
          <span className="font-pixel text-xs sm:text-sm text-[#E5E7EB] tracking-widest">
            PixelType
          </span>
        </div>

        {/* Atas kanan: nama account, best score, coin (vertikal, teks kecil) */}
        <div
          id="gameplay-player-stats"
          className="flex flex-col items-end text-right space-y-0.5"
        >
          <span className="font-semibold text-xs text-[#E5E7EB]">
            {nick}
          </span>
          <span className="font-pixel text-[10px] text-[#7C6BF5]">
            BEST: {bestScore}
          </span>
          <span className="font-pixel text-[10px] text-[#FBBF24]">
            COIN: {coins}
          </span>
        </div>
      </header>

      {/* Main Play Area */}
      <main className="w-full max-w-3xl mx-auto flex-1 flex flex-col items-center justify-center my-2 z-10">
        {/* Tengah atas: ◇◇◇ (3 indikator ronde) */}
        <div className="mb-2">
          <RoundIndicator
            currentRound={Math.min(state.round, state.totalRounds)}
            totalRounds={state.totalRounds}
          />
        </div>

        {/* Tengah: Timer besar 30 */}
        <Timer seconds={state.timer} />

        {/* Combo Counter Badge */}
        <div className="my-1">
          <ComboCounter combo={state.combo} />
        </div>

        {/* Tengah bawah: Teks yang harus diketik */}
        <TypingArea
          targetText={targetText}
          userInput={userInput}
          onInputChange={handleInputChange}
          inputRef={inputRef}
          disabled={!state.isPlaying || state.isFinished}
        />
      </main>

      {/* Bawah: 3 stat kotak: WPM, ACC, Total Character */}
      <footer className="w-full max-w-3xl mx-auto pb-4 px-2 z-10">
        <StatsBar
          wpm={state.wpm}
          acc={state.acc}
          totalCharacters={currentDisplayedCharacters}
        />
      </footer>
    </div>
  );
}
