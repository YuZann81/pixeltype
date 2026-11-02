/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

/**
 * Timer component - Countdown besar
 */
export default function Timer({ seconds = 30 }) {
  const isUrgent = seconds <= 5;

  return (
    <div
      id="game-timer"
      className="flex flex-col items-center justify-center my-2 select-none"
    >
      <div
        className={`font-pixel text-4xl sm:text-5xl tracking-wider transition-colors duration-200 tabular-nums ${
          isUrgent ? "text-[#EF4444]" : "text-[#E5E7EB]"
        }`}
      >
        {String(seconds).padStart(2, "0")}
      </div>
      <span className="text-xs uppercase tracking-widest text-[#9CA3AF] mt-1">
        SECONDS
      </span>
    </div>
  );
}
