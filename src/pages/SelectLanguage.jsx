/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import SpaceBackground from "../components/SpaceBackground.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
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
      setError(err.message || "Gagal memulai sesi game");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="select-language-page"
      className="relative min-h-screen flex flex-col justify-between items-center p-6 sm:p-10 select-none overflow-hidden"
    >
      <SpaceBackground variant="dim" />

      {/* Atas: PixelType (font pixel, kecil) */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between pt-2 z-10">
        <span
          id="select-lang-logo"
          className="font-pixel text-xs sm:text-sm text-[#E5E7EB] tracking-widest"
        >
          PixelType
        </span>
        <div id="select-lang-balance" className="flex items-center gap-2">
          <span className="font-pixel text-[11px] text-[#9CA3AF]">SALDO:</span>
          <span className="font-pixel text-xs text-[#FBBF24]">
            {currentCoins} COIN
          </span>
        </div>
      </header>

      {/* Tengah: Judul + 2 Card Kotak */}
      <main className="w-full max-w-xl mx-auto flex-1 flex flex-col items-center justify-center gap-8 my-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h1
            id="select-lang-title"
            className="font-pixel text-xl sm:text-2xl text-[#E5E7EB] tracking-wide"
          >
            Select Your Bahasa
          </h1>
        </motion.div>

        {/* 2 Card Kotak: ENG & IND */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-md"
        >
          {/* Card ENG */}
          <div
            id="card-lang-eng"
            onClick={() => setSelected("ENG")}
            onDoubleClick={() => handleOpenConfirm("ENG")}
            className={`cursor-pointer transition-all duration-200 transform ${
              selected === "ENG"
                ? "scale-[1.03]"
                : "opacity-80 hover:opacity-100"
            }`}
          >
            <Card
              className={`h-36 sm:h-44 flex flex-col items-center justify-center gap-2 text-center transition-colors ${
                selected === "ENG"
                  ? "border-2 border-[#7C6BF5] bg-[rgba(35,32,65,0.7)] shadow-lg"
                  : "border border-[#3A2B5C] hover:border-[#7C6BF5]/40"
              }`}
            >
              <span className="font-pixel text-2xl sm:text-3xl font-bold text-[#E5E7EB]">
                ENG
              </span>
              <span className="text-xs text-[#9CA3AF] tracking-wide">
                English Vocabulary
              </span>
              {selected === "ENG" && (
                <span className="font-pixel text-[10px] text-[#7C6BF5] mt-1">
                  [ SELECTED ]
                </span>
              )}
            </Card>
          </div>

          {/* Card IND */}
          <div
            id="card-lang-ind"
            onClick={() => setSelected("IND")}
            onDoubleClick={() => handleOpenConfirm("IND")}
            className={`cursor-pointer transition-all duration-200 transform ${
              selected === "IND"
                ? "scale-[1.03]"
                : "opacity-80 hover:opacity-100"
            }`}
          >
            <Card
              className={`h-36 sm:h-44 flex flex-col items-center justify-center gap-2 text-center transition-colors ${
                selected === "IND"
                  ? "border-2 border-[#7C6BF5] bg-[rgba(35,32,65,0.7)] shadow-lg"
                  : "border border-[#3A2B5C] hover:border-[#7C6BF5]/40"
              }`}
            >
              <span className="font-pixel text-2xl sm:text-3xl font-bold text-[#E5E7EB]">
                IND
              </span>
              <span className="text-xs text-[#9CA3AF] tracking-wide">
                Bahasa Indonesia
              </span>
              {selected === "IND" && (
                <span className="font-pixel text-[10px] text-[#7C6BF5] mt-1">
                  [ SELECTED ]
                </span>
              )}
            </Card>
          </div>
        </motion.div>

        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center text-xs text-[#F87171] bg-[#F87171]/10 border border-[#F87171]/30 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {/* Bawah card: teks Press enter to pick your bahasa */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-center"
        >
          <p
            id="select-lang-hint"
            onClick={() => handleOpenConfirm(selected)}
            className="text-xs sm:text-sm text-[#9CA3AF] tracking-wide cursor-pointer hover:text-[#E5E7EB] transition"
          >
            Press <span className="text-[#7C6BF5] font-semibold">ENTER</span> or click to pick your bahasa
          </p>
        </motion.div>
      </main>

      {/* Footer subtle tag */}
      <footer className="w-full max-w-2xl mx-auto text-center text-[11px] text-[#9CA3AF]/60 z-10">
        PILIH BAHASA UNTUK KATA-KATA TYPING
      </footer>

      {/* Modal Konfirmasi Biaya Sesi */}
      <AnimatePresence>
        {showConfirmModal && (
          <div
            id="modal-confirm-session-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md"
            >
              <Card className="p-6 sm:p-7 border-2 border-[#7C6BF5]/60 bg-[#0F1026] shadow-2xl space-y-5">
                <div className="text-center space-y-1">
                  <span className="font-pixel text-[10px] text-[#7C6BF5] uppercase tracking-widest">
                    P2R ARCADE CONFIRMATION
                  </span>
                  <h2
                    id="modal-confirm-title"
                    className="font-pixel text-xl sm:text-2xl text-[#E5E7EB] tracking-wide"
                  >
                    Mulai Sesi Permainan?
                  </h2>
                  <p className="text-xs text-[#9CA3AF]">
                    Memulai permainan PixelType akan menggunakan {REQUIRED_SESSION_COINS} P2R Coin.
                  </p>
                </div>

                {/* Info Card Saldo & Biaya */}
                <div
                  id="modal-confirm-details"
                  className="rounded-lg bg-[#0B0B1F]/90 border border-[#3A2B5C] p-4 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Bahasa Dipilih:</span>
                    <span className="font-semibold text-[#E5E7EB]">
                      {selected === "IND" ? "Bahasa Indonesia (IND)" : "English (ENG)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#3A2B5C]/50 pt-2">
                    <span className="text-[#9CA3AF]">Biaya Sesi:</span>
                    <span className="font-pixel text-[#FBBF24]">
                      {REQUIRED_SESSION_COINS} P2R COIN
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#3A2B5C]/50 pt-2">
                    <span className="text-[#9CA3AF]">Saldo Aktual Anda:</span>
                    <span
                      className={`font-pixel font-bold ${
                        hasEnoughCoins ? "text-[#4ADE80]" : "text-[#F87171]"
                      }`}
                    >
                      {currentCoins} P2R COIN
                    </span>
                  </div>
                </div>

                {/* Pesan Error Saldo Tidak Cukup */}
                {!hasEnoughCoins && (
                  <div
                    id="modal-insufficient-coin-warning"
                    className="p-3 rounded-lg bg-[#F87171]/15 border border-[#F87171]/40 text-xs text-[#F87171] leading-relaxed text-center"
                  >
                    Saldo P2R Coin Anda tidak mencukupi (Minimal {REQUIRED_SESSION_COINS} Coin).
                    Saldo saat ini: {currentCoins} Coin.
                  </div>
                )}

                {/* Tombol Aksi: Batal & Lanjutkan */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    id="btn-cancel-session"
                    variant="outline"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={loading}
                    className="w-full font-pixel text-xs py-2.5"
                  >
                    Batal
                  </Button>
                  <Button
                    id="btn-confirm-session"
                    variant="primary"
                    onClick={handleStartSession}
                    disabled={!hasEnoughCoins || loading}
                    className="w-full font-pixel text-xs py-2.5"
                  >
                    {loading ? "Memproses..." : "Lanjutkan"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
