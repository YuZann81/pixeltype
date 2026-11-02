/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SpaceBackground from "../components/SpaceBackground.jsx";
import Button from "../components/Button.jsx";
import { useGame } from "../context/GameContext.jsx";

export default function Guide() {
  const navigate = useNavigate();
  const { state, startGame } = useGame();
  const [showDetailedTips, setShowDetailedTips] = useState(false);

  const handleStart = () => {
    startGame();
    navigate("/gameplay");
  };

  const nick = state.user?.nick || "Player";
  const bestScore = state.bestScore || 0;

  return (
    <div
      id="guide-page"
      className="relative min-h-screen flex flex-col justify-between p-6 sm:p-10 select-none overflow-x-hidden"
    >
      <SpaceBackground variant="dim" />

      {/* Atas: PixelType (kiri) + nama account & best score (kanan, teks kecil) */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between pt-2 pb-4 z-10">
        <span
          id="guide-logo"
          className="font-pixel text-xs sm:text-sm text-[#E5E7EB] tracking-widest"
        >
          PixelType
        </span>
        <div id="guide-account-info" className="text-right">
          <span className="block text-xs font-semibold text-[#E5E7EB]">
            {nick}
          </span>
          <span className="block text-[11px] text-[#7C6BF5] font-pixel">
            BEST: {bestScore}
          </span>
        </div>
      </header>

      {/* Tengah: Card Biru (#1E3A5F atau biru gelap) */}
      <main className="w-full max-w-xl mx-auto flex-1 flex flex-col items-center justify-center my-4 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          id="guide-blue-card"
          className="w-full rounded-2xl bg-[#0f2444]/90 border border-[#1E3A5F] shadow-xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-md"
        >
          {/* Judul: Guide Singkat */}
          <div className="text-center mb-5">
            <h2
              id="guide-title"
              className="font-pixel text-lg sm:text-xl text-[#E5E7EB] tracking-wide"
            >
              Guide Singkat
            </h2>
          </div>

          {/* Kotak di bawah judul (Area Penjelasan) */}
          <div
            id="guide-content-box"
            className="w-full rounded-xl bg-[#0b172a]/80 border border-[#1E3A5F]/70 p-4 sm:p-5 text-sm text-[#E5E7EB]/90 space-y-3 font-body"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-[#4ADE80] font-pixel text-xs mt-0.5">01</span>
              <p className="text-xs sm:text-sm leading-relaxed">
                Permainan terdiri dari <strong className="text-white">3 Ronde</strong>. Setiap ronde memiliki batas waktu <strong className="text-white">30 detik</strong>.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-[#7C6BF5] font-pixel text-xs mt-0.5">02</span>
              <p className="text-xs sm:text-sm leading-relaxed">
                Ketik teks target secepat dan seakurat mungkin. Huruf benar (<span className="text-[#4ADE80]">hijau</span>), salah (<span className="text-[#F87171]">merah</span>).
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-[#EC4899] font-pixel text-xs mt-0.5">03</span>
              <p className="text-xs sm:text-sm leading-relaxed">
                Pertahankan <strong className="text-white">Combo</strong> tanpa salah untuk melipatgandakan perolehan poin akhirmu!
              </p>
            </div>

            {showDetailedTips && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="pt-3 border-t border-[#1E3A5F] text-xs text-[#9CA3AF] space-y-1.5"
              >
                <p>• Bahasa aktif: <strong className="text-[#7C6BF5]">{state.language === "ENG" ? "English" : "Bahasa Indonesia"}</strong></p>
                <p>• Gunakan tombol <kbd className="px-1 py-0.5 bg-[#1A1B2E] rounded border border-[#3A2B5C] text-[#E5E7EB]">Backspace</kbd> jika terjadi salah ketik sebelum melanjutkan.</p>
                <p>• Poin dihitung dari kombinasi WPM, Akurasi %, dan Max Combo tercapai.</p>
              </motion.div>
            )}
          </div>

          {/* Tombol Penjelasan di bawah kotak */}
          <div className="mt-4 flex justify-center">
            <button
              id="btn-guide-details"
              type="button"
              onClick={() => setShowDetailedTips((prev) => !prev)}
              className="text-xs font-pixel text-[#7C6BF5] hover:text-[#EC4899] transition cursor-pointer underline-offset-4 hover:underline"
            >
              {showDetailedTips ? "[- Sembunyikan Detail]" : "[+ Penjelasan Tambahan]"}
            </button>
          </div>

          {/* Tombol Understood di bawah */}
          <div className="mt-6 flex justify-center">
            <Button
              id="btn-guide-understood"
              variant="primary"
              onClick={handleStart}
              className="w-full sm:w-64 font-pixel text-xs py-3"
            >
              Understood
            </Button>
          </div>

          {/* Label AI Frame di kiri bawah card */}
          <div className="mt-4 flex items-center justify-between text-[10px] text-[#9CA3AF]/60 font-mono">
            <span id="guide-label-ai-frame">AI Frame</span>
            <span>SECURE SYSTEM</span>
          </div>
        </motion.div>
      </main>

      {/* Footer subtle tag */}
      <footer className="w-full max-w-2xl mx-auto text-center text-[11px] text-[#9CA3AF]/60 z-10">
        SIAPKAN JARIMU UNTUK RONDE PERTAMA
      </footer>
    </div>
  );
}
