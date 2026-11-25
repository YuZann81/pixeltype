/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SpaceBackground from "../components/SpaceBackground.jsx";
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
      <SpaceBackground variant="gameplay" />

      {/* Header */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between pt-1 pb-4 z-10">
        <span
          id="guide-logo"
          className="font-pixel text-xs text-[#D1D5DB] tracking-widest"
        >
          PixelType
        </span>
        <div id="guide-account-info" className="text-right">
          <span className="block text-sm font-medium text-[#E5E7EB]">
            {nick}
          </span>
          <span className="block text-[11px] text-[#9CA3AF] font-mono-typing">
            BEST {bestScore}
          </span>
        </div>
      </header>

      {/* Main Guide Card */}
      <main className="w-full max-w-xl mx-auto flex-1 flex flex-col items-center justify-center my-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          id="guide-blue-card"
          className="w-full rounded-2xl bg-[#121528]/95 border border-[#2A2F4F] shadow-xl p-6 sm:p-8"
        >
          {/* Heading */}
          <div className="mb-6">
            <span className="inline-block font-mono-typing text-[11px] uppercase tracking-widest text-[#94A3B8] mb-1.5">
              Mission Briefing • 3 Rounds × 30s
            </span>
            <h1
              id="guide-title"
              className="font-body text-2xl sm:text-3xl font-semibold text-[#F3F4F6] tracking-tight"
            >
              Guide Singkat
            </h1>
            <p className="text-sm text-[#9CA3AF] mt-1 font-body">
              Pahami aturan singkat sebelum memulai sesi mengetik.
            </p>
          </div>

          {/* Rules List */}
          <div
            id="guide-content-box"
            className="w-full rounded-xl bg-[#0D1020] border border-[#232845] divide-y divide-[#1E233D] font-body"
          >
            <div className="flex items-start gap-3.5 p-4">
              <span className="font-mono-typing text-xs font-semibold text-[#94A3B8] bg-[#1A1F38] px-2 py-0.5 rounded mt-0.5">
                01
              </span>
              <p className="text-sm text-[#D1D5DB] leading-relaxed">
                Permainan terdiri dari <strong className="text-[#F9FAFB] font-medium">3 Ronde</strong>, masing-masing berdurasi <strong className="text-[#F9FAFB] font-medium">30 detik</strong> dengan hitung mundur 3 detik sebelum mulai.
              </p>
            </div>

            <div className="flex items-start gap-3.5 p-4">
              <span className="font-mono-typing text-xs font-semibold text-[#94A3B8] bg-[#1A1F38] px-2 py-0.5 rounded mt-0.5">
                02
              </span>
              <p className="text-sm text-[#D1D5DB] leading-relaxed">
                Ketik teks secepat dan seakurat mungkin. Huruf benar ditandai <span className="text-[#4ADE80] font-medium">hijau</span> dan huruf salah ditandai <span className="text-[#F87171] font-medium">merah</span>.
              </p>
            </div>

            <div className="flex items-start gap-3.5 p-4">
              <span className="font-mono-typing text-xs font-semibold text-[#94A3B8] bg-[#1A1F38] px-2 py-0.5 rounded mt-0.5">
                03
              </span>
              <p className="text-sm text-[#D1D5DB] leading-relaxed">
                Jaga ritme ketikan tanpa kesalahan untuk membangun <strong className="text-[#F9FAFB] font-medium">Combo</strong> dan memaksimalkan WPM serta akurasi.
              </p>
            </div>

            {showDetailedTips && (
              <div className="p-4 bg-[#101427] text-xs text-[#9CA3AF] space-y-2 font-body">
                <p>
                  • Bahasa aktif:{" "}
                  <strong className="text-[#E5E7EB] font-mono-typing">
                    {state.language === "ENG" ? "ENG (English)" : "IND (Bahasa Indonesia)"}
                  </strong>
                </p>
                <p>
                  • Gunakan{" "}
                  <kbd className="px-1.5 py-0.5 bg-[#1A1F38] rounded border border-[#2E3559] text-[#E5E7EB] font-mono-typing text-[11px]">
                    Backspace
                  </kbd>{" "}
                  untuk memperbaiki salah ketik pada kata yang sedang diketik.
                </p>
                <p>
                  • Kalimat baru akan otomatis muncul jika teks selesai sebelum waktu 30 detik habis.
                </p>
              </div>
            )}
          </div>

          {/* Secondary Details Toggle */}
          <div className="mt-4 flex justify-center">
            <button
              id="btn-guide-details"
              type="button"
              onClick={() => setShowDetailedTips((prev) => !prev)}
              className="text-xs font-mono-typing text-[#94A3B8] hover:text-[#E5E7EB] transition cursor-pointer"
            >
              {showDetailedTips ? "− Sembunyikan detail" : "+ Lihat detail tambahan"}
            </button>
          </div>

          {/* Primary CTA */}
          <div className="mt-6">
            <button
              id="btn-guide-understood"
              type="button"
              onClick={handleStart}
              className="w-full py-3.5 px-6 rounded-xl bg-[#5B52C7] hover:bg-[#6A61DB] active:scale-[0.99] text-white font-body font-semibold text-sm tracking-wide transition cursor-pointer"
            >
              Understood — Mulai Ronde 1
            </button>
          </div>

          {/* Subtle Technical Footer */}
          <div className="mt-5 pt-4 border-t border-[#1E233D] flex items-center justify-between text-[11px] text-[#64748B] font-mono-typing">
            <span id="guide-label-ai-frame">PIXEL GALAXY</span>
            <span>READY</span>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl mx-auto text-center text-xs text-[#64748B] font-mono-typing z-10">
        SIAPKAN JARI UNTUK RONDE PERTAMA
      </footer>
    </div>
  );
}
