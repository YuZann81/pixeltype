/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import SpaceBackground from "../components/SpaceBackground.jsx";
import Card from "../components/Card.jsx";
import { useGame } from "../context/GameContext.jsx";

const REQUIRED_SESSION_COINS = 100;

export default function SelectLanguage() {
  const navigate = useNavigate();
  const { state, setLanguage, startP2RSession, fetchWallet } = useGame();
  const [selected, setSelected] = useState(state.language || "IND");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch latest wallet balance on mount
  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const currentCoins = state.coins ?? 0;
  const hasEnoughCoins = currentCoins >= REQUIRED_SESSION_COINS;

  // Keyboard navigation: Arrow keys to switch, Enter to trigger confirm modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showConfirmModal) {
        if (e.key === "Escape") {
          setShowConfirmModal(false);
        } else if (e.key === "Enter" && hasEnoughCoins && !loading) {
          handleStartSession();
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        setSelected("ENG");
      } else if (e.key === "ArrowRight") {
        setSelected("IND");
      } else if (e.key === "Enter") {
        handleOpenConfirm(selected);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, showConfirmModal, hasEnoughCoins, loading]);

  const handleOpenConfirm = (lang) => {
    setSelected(lang);
    setError(null);
    setShowConfirmModal(true);
  };

  const handleStartSession = async () => {
    if (!hasEnoughCoins) return;

    setLoading(true);
    setError(null);

    try {
      setLanguage(selected);
      // Authoritative start: backend atomically validates quota & debits session entry coin
      await startP2RSession();
      await fetchWallet();
      setShowConfirmModal(false);
      navigate("/guide");
    } catch (err) {
      setError(err.message || "Failed to start game session");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="select-language-page"
      className="relative min-h-screen flex flex-col justify-between items-center px-5 py-6 sm:px-8 sm:py-7 select-none overflow-x-hidden"
    >
      <SpaceBackground variant="gameplay" />

      {/* Subtle atmospheric vignette */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_center,rgba(11,11,31,0.12)_0%,rgba(11,11,31,0.72)_100%)]"
      />

      {/* Minimal Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10">
        <span
          id="select-lang-logo"
          className="font-pixel font-normal text-[10px] sm:text-xs text-[#E5E7F0]/90 tracking-widest"
        >
          PixelType
        </span>
        <div id="select-lang-balance" className="flex items-center gap-2">
          <span className="font-pixel font-normal text-[8px] text-[#8E93A8] tracking-wider">
            BALANCE:
          </span>
          <span className="font-pixel font-normal text-[9px] sm:text-[10px] text-[#E8C168]">
            {currentCoins} COIN
          </span>
        </div>
      </header>

      {/* Main Language Selection */}
      <main className="w-full max-w-lg mx-auto flex-1 flex flex-col items-center justify-center gap-8 my-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <h1
            id="select-lang-title"
            className="font-pixel font-normal text-base sm:text-lg text-[#E5E7F0] tracking-wide leading-relaxed"
          >
            Pick Your Language
          </h1>
          <p className="font-body text-xs sm:text-sm text-[#8E93A8] mt-2">
            Choose the word list language for your 3-round typing session.
          </p>
        </motion.div>

        {/* Language Option Cards: ENG & IND */}
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-2 gap-4 sm:gap-5 w-full max-w-md"
        >
          {/* Card ENG */}
          <div
            id="card-lang-eng"
            onClick={() => setSelected("ENG")}
            onDoubleClick={() => handleOpenConfirm("ENG")}
            className="cursor-pointer transition-all duration-150"
          >
            <Card
              className={`h-36 sm:h-40 flex flex-col items-center justify-center gap-2.5 text-center transition-colors ${
                selected === "ENG"
                  ? "border-[#7C6BF5] bg-[#171B34]"
                  : "border-[#2A2F4F] bg-[#121528]/75 hover:border-[#7C6BF5]/50"
              }`}
            >
              <span className="font-pixel font-normal text-lg sm:text-xl text-[#E5E7F0] tracking-wider">
                ENG
              </span>
              <span className="font-body text-xs text-[#A6A9BA]">
                English
              </span>
              <span
                className={`font-pixel font-normal text-[8px] tracking-wider mt-1 ${
                  selected === "ENG" ? "text-[#7C6BF5]" : "text-transparent"
                }`}
              >
                SELECTED
              </span>
            </Card>
          </div>

          {/* Card IND */}
          <div
            id="card-lang-ind"
            onClick={() => setSelected("IND")}
            onDoubleClick={() => handleOpenConfirm("IND")}
            className="cursor-pointer transition-all duration-150"
          >
            <Card
              className={`h-36 sm:h-40 flex flex-col items-center justify-center gap-2.5 text-center transition-colors ${
                selected === "IND"
                  ? "border-[#7C6BF5] bg-[#171B34]"
                  : "border-[#2A2F4F] bg-[#121528]/75 hover:border-[#7C6BF5]/50"
              }`}
            >
              <span className="font-pixel font-normal text-lg sm:text-xl text-[#E5E7F0] tracking-wider">
                IND
              </span>
              <span className="font-body text-xs text-[#A6A9BA]">
                Indonesian
              </span>
              <span
                className={`font-pixel font-normal text-[8px] tracking-wider mt-1 ${
                  selected === "IND" ? "text-[#7C6BF5]" : "text-transparent"
                }`}
              >
                SELECTED
              </span>
            </Card>
          </div>
        </motion.div>

        {/* Error display */}
        {error && (
          <div className="w-full max-w-md text-xs font-body text-[#D98A91] border-l-2 border-[#D98A91]/70 pl-3 py-1">
            {error}
          </div>
        )}

        {/* Continue Prompt */}
        <div className="text-center">
          <button
            id="select-lang-hint"
            type="button"
            onClick={() => handleOpenConfirm(selected)}
            className="py-3 px-7 rounded-lg bg-[#5A4FC7] hover:bg-[#6A5FD8] active:scale-[0.99] text-[#E5E7F0] font-pixel font-normal text-[9px] sm:text-[10px] leading-relaxed tracking-widest transition-colors cursor-pointer"
          >
            Continue
          </button>
          <p className="font-body text-xs text-[#8E93A8] mt-3">
            Use arrow keys to switch, then press Enter to confirm.
          </p>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center font-pixel font-normal text-[7px] sm:text-[8px] tracking-widest text-[#8E93A8]/50 z-10">
        PixelType Galaxy
      </footer>

      {/* P2R Session Confirmation Modal — Clean Login-Style Button */}
      <AnimatePresence>
        {showConfirmModal && (
          <div
            id="modal-confirm-session-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B1F]/80 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md"
            >
              <Card className="p-6 sm:p-7 border border-[#2A2F4F] bg-[#121528] space-y-5">
                <div className="text-center space-y-2">
                  <span className="font-pixel font-normal text-[8px] text-[#8E93A8] uppercase tracking-widest">
                    P2R Session Confirmation
                  </span>
                  <h2
                    id="modal-confirm-title"
                    className="font-pixel font-normal text-sm sm:text-base text-[#E5E7F0] tracking-wide leading-relaxed"
                  >
                    Start Game Session?
                  </h2>
                  <p className="font-body text-xs text-[#A6A9BA] leading-relaxed">
                    Starting a PixelType session requires {REQUIRED_SESSION_COINS} P2R Coins.
                  </p>
                </div>

                {/* Session Fee & Balance Details */}
                <div
                  id="modal-confirm-details"
                  className="rounded-lg bg-[#0D1020] border border-[#232845] p-4 space-y-3 text-xs font-body"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E93A8]">Selected Language</span>
                    <span className="font-medium text-[#E5E7F0]">
                      {selected === "IND" ? "Indonesian (IND)" : "English (ENG)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#1E233D] pt-2.5">
                    <span className="text-[#8E93A8]">Session Fee</span>
                    <span className="font-pixel font-normal text-[9px] text-[#E8C168]">
                      {REQUIRED_SESSION_COINS} COIN
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#1E233D] pt-2.5">
                    <span className="text-[#8E93A8]">Current Balance</span>
                    <span
                      className={`font-pixel font-normal text-[9px] ${
                        hasEnoughCoins ? "text-[#86CFA4]" : "text-[#D98A91]"
                      }`}
                    >
                      {currentCoins} COIN
                    </span>
                  </div>
                </div>

                {/* Insufficient Balance Warning */}
                {!hasEnoughCoins && (
                  <div
                    id="modal-insufficient-coin-warning"
                    className="border-l-2 border-[#D98A91]/70 pl-3 py-1 text-xs font-body text-[#D98A91] leading-relaxed"
                  >
                    Insufficient P2R Coins (minimum {REQUIRED_SESSION_COINS} coins required). Current balance: {currentCoins} coins.
                  </div>
                )}

                {/* Action Buttons: Secondary Cancel + Login-Style Confirm */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    id="btn-cancel-session"
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg bg-transparent border border-[#2A2F4F] hover:border-[#7C6BF5]/50 hover:bg-[#171B34] text-[#A6A9BA] hover:text-[#E5E7F0] font-pixel font-normal text-[9px] sm:text-[10px] leading-relaxed tracking-wider transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-session"
                    type="button"
                    onClick={handleStartSession}
                    disabled={!hasEnoughCoins || loading}
                    className="w-full py-3 px-4 rounded-lg bg-[#5A4FC7] hover:bg-[#6A5FD8] active:scale-[0.99] text-[#E5E7F0] font-pixel font-normal text-[9px] sm:text-[10px] leading-relaxed tracking-widest transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
