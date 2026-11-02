/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import SpaceBackground from "../components/SpaceBackground.jsx";

export default function Home() {
  const navigate = useNavigate();

  // Global keydown listener to trigger play navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is clicking or inspecting
      if (e.key === "Tab") return;
      navigate("/login");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div
      id="home-page"
      className="relative min-h-screen flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden"
    >
      <SpaceBackground variant="full" />

      {/* Header Bar */}
      <header className="flex items-start justify-between w-full max-w-6xl mx-auto z-10">
        {/* Kiri atas: teks PIXEL TYPE (font pixel, kecil) */}
        <div id="home-logo" className="pt-2">
          <span className="font-pixel text-xs sm:text-sm tracking-widest text-[#E5E7EB]">
            PIXEL TYPE
          </span>
        </div>

        {/* Kanan atas: 3 tombol kecil 1, 2, 3 & to Leaderboard link */}
        <div className="flex flex-col items-end gap-2">
          <div id="debug-buttons" className="flex items-center gap-2">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                id={`btn-debug-${num}`}
                type="button"
                onClick={() => {
                  // Debug navigation shortcuts
                  if (num === 1) navigate("/login");
                  if (num === 2) navigate("/select-language");
                  if (num === 3) navigate("/gameplay");
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#1A1B2E]/80 border border-[#3A2B5C] font-pixel text-xs text-[#9CA3AF] hover:text-[#E5E7EB] hover:border-[#7C6BF5] transition cursor-pointer flex items-center justify-center"
                title={`Testing mode ${num}`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Kanan atas di bawah tombol: teks to Leaderboard */}
          <Link
            id="link-to-leaderboard"
            to="/leaderboard"
            className="text-xs text-[#9CA3AF] hover:text-[#7C6BF5] tracking-wide transition underline-offset-4 hover:underline"
          >
            to Leaderboard
          </Link>
        </div>
      </header>

      {/* Tengah: Press any Button to Play (Inter italic, abu lembut) */}
      <main className="flex-1 flex flex-col items-center justify-center my-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <p
            id="home-prompt-text"
            className="font-body italic text-[#9CA3AF] text-lg sm:text-xl tracking-wide cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Press any Button to Play
          </p>
        </motion.div>

        {/* Bawah: kotak besar kosong (area utama dengan border tipis & ilustrasi retro) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          id="home-main-box"
          onClick={() => navigate("/login")}
          className="w-full max-w-3xl h-64 sm:h-80 rounded-2xl bg-[#1A1B2E]/40 border border-[#3A2B5C] backdrop-blur-sm flex flex-col items-center justify-center p-6 cursor-pointer hover:border-[#7C6BF5]/50 transition group relative overflow-hidden"
        >
          {/* Subtle Retro Astronaut / Pixel Grid Graphic in center */}
          <div className="relative flex flex-col items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity duration-300">
            {/* Retro spaceship pixel silhouette SVG */}
            <svg
              className="w-16 h-16 sm:w-20 sm:h-20 text-[#7C6BF5]/80 mb-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L9 8H15L12 2Z" />
              <path d="M7 10L11 9V14H6L7 10Z" />
              <path d="M17 10L13 9V14H18L17 10Z" />
              <path d="M10 15H14V19H10V15Z" />
              <path d="M8 20H11V22H8V20Z" fill="#EC4899" />
              <path d="M13 20H16V22H13V20Z" fill="#EC4899" />
            </svg>
            <span className="font-pixel text-[11px] sm:text-xs text-[#9CA3AF] tracking-wider text-center">
              [ CLICK OR PRESS ANY KEY TO INITIALIZE ]
            </span>
          </div>

          {/* Corner pixel markers */}
          <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-[#7C6BF5]/60" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-[#7C6BF5]/60" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-[#7C6BF5]/60" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-[#7C6BF5]/60" />
        </motion.div>
      </main>

      {/* Footer subtle tag */}
      <footer className="w-full max-w-6xl mx-auto text-center text-[11px] text-[#9CA3AF]/60 z-10">
        PIXELTYPE SYSTEM v1.0 • 3 ROUNDS TYPING CHALLENGE
      </footer>
    </div>
  );
}
