/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SpaceBackground from "../components/SpaceBackground.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import { useGame } from "../context/GameContext.jsx";

export default function Overview() {
  const navigate = useNavigate();
  const { state, resetGame, completeP2RSession, spendCoins } = useGame();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [p2rResult, setP2rResult] = useState(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState(null);

  // Submit score to P2R on mount
  useEffect(() => {
    if (state.isFinished && !p2rResult && !submitting && state.session) {
      submitToP2R();
    }
  }, [state.isFinished, state.session]);

  const submitToP2R = async () => {
    if (!state.session || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const finalScore = state.bestScore || state.score || 0;
      const telemetryData = {
        rounds: state.roundData || [],
        language: state.language || "IND",
        score: finalScore,
        best_score: finalScore,
        overall_score: finalScore,
        accuracy: state.acc || 0,
        net_wpm: state.wpm || 0,
        total_characters: state.charCount || 0,
        completion_time_ms: state.roundData?.reduce((sum, r) => sum + (r.duration * 1000), 0) || 0,
      };

      const result = await completeP2RSession(finalScore, telemetryData);
      setP2rResult(result);
    } catch (err) {
      setSubmitError(err.message || "Gagal mengirim skor ke P2R");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setRetryLoading(true);
    setRetryError(null);

    try {
      await spendCoins("retry");
      // After successful retry spend, reset game and go to guide for new session
      resetGame();
      navigate("/select-language");
    } catch (err) {
      setRetryError(err.message || "Gagal memulai ulang");
    } finally {
      setRetryLoading(false);
    }
  };

  const handleBackToMenu = () => {
    resetGame();
    navigate("/");
  };

  const handleToLeaderboard = () => {
    resetGame();
    navigate("/leaderboard");
  };

  const nick = state.user?.nick || "Guest";
  const wpm = state.wpm || 0;
  const acc = state.acc || 100;
  const charCount = state.charCount || 0;
  const score = state.score || 0;
  const bestScore = state.bestScore || score;

  const p2rDisplayScore = p2rResult?.display_score || score;
  const p2rScoreScale = p2rResult?.score_scale || 100;
  const p2rFormulaVersion = p2rResult?.formula_version || "v1.0";

  const statItems = [
    { label: "NICK", value: nick, isPixel: false, color: "text-[#E5E7EB]" },
    { label: "WPM", value: wpm, isPixel: true, color: "text-[#7C6BF5]" },
    { label: "ACC", value: `${acc}%`, isPixel: true, color: "text-[#4ADE80]" },
    { label: "CHAR", value: charCount, isPixel: true, color: "text-[#E5E7EB]" },
    { label: "SCORE", value: p2rDisplayScore, isPixel: true, color: "text-[#EC4899]" },
    { label: "BEST SCORE", value: bestScore, isPixel: true, color: "text-[#FBBF24]" },
  ];

  const displayScore = p2rDisplayScore || score;

  return (
    <div
      id="overview-page"
      className="relative min-h-screen flex flex-col justify-between p-6 sm:p-10 select-none overflow-x-hidden"
    >
      <SpaceBackground variant="dim" />

      {/* Atas kiri: PixelType (font pixel, kecil) */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-start pt-2 z-10">
        <span
          id="overview-logo"
          className="font-pixel text-xs sm:text-sm text-[#E5E7EB] tracking-widest"
        >
          PixelType
        </span>
      </header>

      {/* Tengah: Card dengan Judul Overview & Statistik Permainan */}
      <main className="w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center my-6 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <Card className="p-6 sm:p-8">
            {/* Judul: Overview */}
            <div className="text-center mb-6 pb-4 border-b border-[#3A2B5C]">
              <h1
                id="overview-title"
                className="font-pixel text-xl sm:text-2xl text-[#E5E7EB] tracking-wider"
              >
                Overview
              </h1>
              <p className="text-xs text-[#9CA3AF] mt-1.5 font-body">
                Game Session Summary
              </p>
            </div>

            {/* P2R Result Status */}
            {(submitting || p2rResult) && (
              <div className="mb-4 p-3 rounded-lg bg-[#7C6BF5]/10 border border-[#7C6BF5]/30 text-center">
                {submitting ? (
                  <div className="flex items-center justify-center gap-2 text-[#7C6BF5]">
                    <div className="w-4 h-4 border-2 border-[#7C6BF5] border-t-transparent rounded-full animate-spin" />
                    <span className="font-pixel text-xs text-[#7C6BF5]">Mengirim skor ke P2R...</span>
                  </div>
                ) : p2rResult ? (
                  <div className="text-[#4ADE80] font-pixel text-xs">
                    ✓ Skor dikirim ke P2R (Display: {p2rDisplayScore.toFixed(2)})
                  </div>
                ) : submitError && (
                  <div className="text-[#F87171] font-pixel text-xs">
                    ✗ {submitError}
                  </div>
                )}
              </div>
            )}

            {/* Isi Card: Statistik Permainan (NICK, WPM, ACC, CHAR, SCORE, BEST SCORE) */}
            <div
              id="overview-stats-grid"
              className="grid grid-cols-2 gap-3.5 sm:gap-4 mb-6"
            >
              {statItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#0B0B1F]/60 border border-[#3A2B5C] flex flex-col items-center justify-center text-center"
                >
                  <span className="font-pixel text-[10px] text-[#9CA3AF] tracking-wider mb-1">
                    {item.label}
                  </span>
                  <span
                    className={`text-base sm:text-lg font-bold truncate max-w-full ${
                      item.isPixel ? "font-pixel" : "font-sans"
                    } ${item.color}`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* P2R Score Details */}
            {p2rResult && (
              <div className="mb-4 p-3 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/30 text-xs text-[#EC4899]">
                <div className="font-pixel text-[#EC4899] mb-1">P2R RESULT</div>
                <div>Display Score: {p2rDisplayScore.toFixed(2)}</div>
                <div>Raw Score: {p2rResult.score} / {p2rScoreScale}</div>
                <div>Formula: {p2rFormulaVersion}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <Button
                id="btn-overview-retry"
                variant="primary"
                onClick={handleRetry}
                disabled={retryLoading}
                className="w-full font-pixel text-xs py-3"
              >
                {retryLoading ? "Memproses Retry..." : "Main Lagi (Retry)"}
              </Button>
              {retryError && (
                <p className="text-center text-xs text-[#F87171]">{retryError}</p>
              )}
              <Button
                id="btn-overview-leaderboard"
                variant="outline"
                onClick={handleToLeaderboard}
                className="w-full font-pixel text-xs py-3"
              >
                Lihat Leaderboard
              </Button>
              <Button
                id="btn-overview-menu"
                variant="outline"
                onClick={handleBackToMenu}
                className="w-full font-pixel text-xs py-3"
              >
                Kembali ke Menu
              </Button>
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Footer subtle note */}
      <footer className="w-full max-w-2xl mx-auto text-center text-[11px] text-[#9CA3AF]/60 z-10">
        {p2rResult ? "SKOR TELAH DIKIRIM KE P2R" : "SKOR TELAH DISIMPAN LOKAL"}
      </footer>
    </div>
  );
}