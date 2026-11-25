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
    const ignoredKeys = new Set([
      "Tab",
      "Shift",
      "Control",
      "Alt",
      "Meta",
      "Escape",
      "CapsLock",
      "NumLock",
      "ScrollLock",
      "ContextMenu",
    ]);

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (ignoredKeys.has(e.key) || /^F\d{1,2}$/.test(e.key)) return;
      navigate("/login");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div
      id="home-page"
      className="relative min-h-screen flex flex-col justify-between px-5 py-6 sm:px-8 sm:py-7 select-none overflow-x-hidden"
    >
      <SpaceBackground variant="gameplay" />

      {/* Subtle atmospheric vignette */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_center,rgba(11,11,31,0.12)_0%,rgba(11,11,31,0.72)_100%)]"
      />

      {/* Minimal Header Bar */}
      <header className="flex items-center justify-between w-full max-w-5xl mx-auto z-10">
        <div id="home-logo">
          <span className="font-pixel font-normal text-[10px] sm:text-xs tracking-widest text-[#E5E7F0]/90">
            PixelType
          </span>
        </div>

        <Link
          id="link-to-leaderboard"
          to="/leaderboard"
          className="font-pixel font-normal text-[8px] sm:text-[9px] text-[#8E93A8] hover:text-[#E5E7F0] tracking-wider transition-colors"
        >
          Leaderboard
        </Link>
      </header>

      {/* Main Interaction Box — Single Play Prompt Only */}
      <main className="flex-1 flex flex-col items-center justify-center my-8 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          id="home-main-box"
          onClick={() => navigate("/login")}
          className="w-full max-w-2xl h-64 sm:h-76 rounded-2xl bg-[#121528]/70 border border-[#2A2F4F] hover:border-[#7C6BF5]/60 flex flex-col items-center justify-center p-6 cursor-pointer transition-colors group relative overflow-hidden"
        >
          <div className="relative flex flex-col items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity duration-200">
            <svg
              className="w-12 h-12 sm:w-14 sm:h-14 text-[#7C6BF5]/90 mb-5"
              viewBox="0 0 12 12"
              fill="currentColor"
              shapeRendering="crispEdges"
              aria-hidden="true"
            >
              <rect x="5" y="1" width="2" height="2" />
              <rect x="4" y="3" width="4" height="4" />
              <rect x="3" y="5" width="1" height="3" />
              <rect x="8" y="5" width="1" height="3" />
              <rect x="4" y="7" width="4" height="2" />
              <rect x="4" y="9" width="1" height="2" fill="#8E93A8" />
              <rect x="7" y="9" width="1" height="2" fill="#8E93A8" />
            </svg>
            <span
              id="home-play-prompt"
              className="font-pixel font-normal text-[10px] sm:text-xs text-[#E5E7F0] tracking-widest text-center leading-relaxed"
            >
              PRESS ANY KEY TO PLAY
            </span>
          </div>

          {/* Subtle corner markers */}
          <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-[#343952]" />
          <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-[#343952]" />
          <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-[#343952]" />
          <div className="absolute bottom-3 right-3 w-2 h-2 border-b border-r border-[#343952]" />
        </motion.div>
      </main>

      {/* Subtle Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center font-pixel font-normal text-[7px] sm:text-[8px] tracking-widest text-[#8E93A8]/50 z-10">
        PixelType • 3 Rounds Typing Challenge
      </footer>
    </div>
  );
}
