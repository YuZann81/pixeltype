/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

/**
 * ComboCounter component
 * Menampilkan COMBO Nx
 */
export default function ComboCounter({ combo = 0 }) {
  const isHigh = combo >= 20;
  const isMedium = combo >= 10;

  let colorClass = "text-[#9CA3AF]";
  if (isHigh) {
    colorClass = "text-[#EC4899]";
  } else if (isMedium) {
    colorClass = "text-[#7C6BF5]";
  } else if (combo > 0) {
    colorClass = "text-[#4ADE80]";
  }

  return (
    <div
      id="combo-counter"
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1A1B2E]/60 border border-[#3A2B5C] select-none"
    >
      <span className="font-pixel text-xs tracking-wider text-[#9CA3AF]">
        COMBO
      </span>
      <span
        className={`font-pixel text-sm sm:text-base font-bold transition-colors duration-150 tabular-nums ${colorClass}`}
      >
        {combo}x
      </span>
    </div>
  );
}
