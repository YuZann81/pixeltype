/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SpaceBackground from "../components/SpaceBackground.jsx";
import RoundIndicator from "../components/RoundIndicator.jsx";
import Timer from "../components/Timer.jsx";
import TypingArea from "../components/TypingArea.jsx";
import ComboCounter from "../components/ComboCounter.jsx";
import StatsBar from "../components/StatsBar.jsx";
import { useGame } from "../context/GameContext.jsx";
import { useTypingEngine } from "../hooks/useTypingEngine.js";
import { ENGINE_PHASES } from "../utils/typingEngineCore.js";

export default function Gameplay() {
  const navigate = useNavigate();
  const {
    state,
    nextRound,
    incrementCombo,
    resetCombo,
    updateTypingStats,
    endGame,
    recordRound,
  } = useGame();

  const inputRef = useRef(null);

  // Protect gameplay route: redirect if not playing or finished
  useEffect(() => {
    if (state.isFinished) {
      navigate("/overview");
    } else if (!state.isPlaying) {
      navigate("/guide");
    }
  }, [state.isPlaying, state.isFinished, navigate]);

  const handleFinishGame = useCallback(() => {
    endGame();
    navigate("/overview");
  }, [endGame, navigate]);

  const {
    phase,
    round,
    totalRounds,
    timeLeft,
    targetText,
    userInput,
    totalDisplayedChars,
    lastRoundSummary,
    isActive,
    handleInputChange,
  } = useTypingEngine({
    language: state.language,
    isPlaying: state.isPlaying,
    isFinished: state.isFinished,
    onIncrementCombo: incrementCombo,
    onResetCombo: resetCombo,
    onUpdateStats: updateTypingStats,
    onRecordRound: recordRound,
    onNextRound: nextRound,
    onFinishGame: handleFinishGame,
  });

  const nick = state.user?.nick || "Player";
  const bestScore = state.bestScore || 0;
  const coins = state.coins ?? 0;

  return (
    <div
      id="gameplay-page"
      className="relative min-h-screen flex flex-col justify-between p-4 sm:p-6 select-none overflow-y-auto overflow-x-hidden"
    >
      <SpaceBackground variant="gameplay" />

      {/* Clean Arcade Pixel Galaxy Frame */}
      <div
        id="ai-frame-border"
        className="fixed inset-2 sm:inset-3 border border-[#7C6BF5]/40 rounded-2xl pointer-events-none z-30 shadow-[0_0_20px_rgba(124,107,245,0.12)]"
      >
        <div className="absolute top-1.5 left-4 px-2 bg-[#0B0B1F] text-[10px] font-mono-typing text-[#4ADE80] tracking-widest uppercase">
          PIXEL GALAXY // {phase === ENGINE_PHASES.ACTIVE ? "LIVE ROUND" : phase.toUpperCase()}
        </div>
      </div>

      {/* Header Bar */}
      <header className="w-full max-w-4xl mx-auto flex items-start justify-between pt-3 px-2 z-10">
        <div id="gameplay-logo" className="pt-1">
          <span className="font-pixel text-xs sm:text-sm text-[#E5E7EB] tracking-widest">
            PixelType
          </span>
        </div>

        <div
          id="gameplay-player-stats"
          className="flex flex-col items-end text-right space-y-0.5"
        >
          <span className="font-semibold text-xs text-[#E5E7EB]">{nick}</span>
          <span className="font-pixel text-[10px] text-[#7C6BF5]">
            BEST: {bestScore}
          </span>
          <span className="font-pixel text-[10px] text-[#FBBF24]">
            COIN: {coins}
          </span>
        </div>
      </header>

      {/* Main Play Area */}
      <main className="w-full max-w-3xl mx-auto flex-1 flex flex-col items-center justify-center my-2 z-10 relative">
        {/* 3-Round Galaxy Progress */}
        <div className="mb-2 flex flex-col items-center gap-1">
          <RoundIndicator
            currentRound={Math.min(round, totalRounds)}
            totalRounds={totalRounds}
          />
          <span className="font-pixel text-[10px] text-[#9CA3AF] tracking-widest">
            ROUND {Math.min(round, totalRounds)} / {totalRounds}
          </span>
        </div>

        {/* Timer */}
        <Timer seconds={phase === ENGINE_PHASES.ACTIVE ? timeLeft : 30} />

        {/* Combo Counter Badge */}
        <div className="my-1">
          <ComboCounter combo={state.combo} />
        </div>

        {/* Typing Area (Visual Focal Point) */}
        <div className="w-full relative">
          <TypingArea
            targetText={targetText}
            userInput={userInput}
            onInputChange={handleInputChange}
            inputRef={inputRef}
            disabled={!isActive}
          />

          {/* 3-2-1 Countdown Overlay */}
          {phase === ENGINE_PHASES.COUNTDOWN && (
            <div
              id="round-countdown-overlay"
              className="absolute inset-0 my-4 rounded-xl bg-[#0B0B1F]/85 backdrop-blur-sm border border-[#7C6BF5]/60 flex flex-col items-center justify-center z-20"
            >
              <span className="font-pixel text-xs text-[#7C6BF5] tracking-widest mb-3">
                GET READY — ROUND {round}
              </span>
              <span className="font-pixel text-5xl sm:text-6xl text-[#FBBF24] tabular-nums">
                {Math.max(1, timeLeft)}
              </span>
            </div>
          )}

          {/* 2-Second Intermission Summary Overlay (after Round 1 & 2) */}
          {phase === ENGINE_PHASES.INTERMISSION && lastRoundSummary && (
            <div
              id="round-intermission-overlay"
              className="absolute inset-0 my-4 rounded-xl bg-[#160D30]/92 backdrop-blur-sm border border-[#4ADE80]/50 flex flex-col items-center justify-center z-20 p-4 text-center"
            >
              <span className="font-pixel text-xs text-[#4ADE80] tracking-widest mb-2">
                ROUND {lastRoundSummary.round} COMPLETE
              </span>
              <div className="flex items-center gap-6 font-mono-typing text-sm sm:text-base text-[#E5E7EB]">
                <span>
                  <strong className="text-[#7C6BF5]">{lastRoundSummary.wpm}</strong> WPM
                </span>
                <span>
                  <strong className="text-[#4ADE80]">{lastRoundSummary.acc}%</strong> ACC
                </span>
                <span>
                  <strong className="text-[#FBBF24]">{lastRoundSummary.charactersTyped}</strong> CHARS
                </span>
              </div>
              <span className="text-xs text-[#9CA3AF] mt-2">
                Preparing Round {round + 1}...
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Stats Dock */}
      <footer className="w-full max-w-3xl mx-auto pb-4 px-2 z-10">
        <StatsBar
          wpm={state.wpm}
          acc={state.acc}
          totalCharacters={totalDisplayedChars}
        />
      </footer>
    </div>
  );
}
