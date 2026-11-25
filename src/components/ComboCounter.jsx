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
  const isSuper = combo >= 35;
  const isHigh = combo >= 20;
  const isMedium = combo >= 10;

  let colorClass = "text-[#9CA3AF]";
  let milestoneLabel = null;
  if (isSuper) {
    colorClass = "text-[#FBBF24]";
    milestoneLabel = "COSMIC";
  } else if (isHigh) {
    colorClass = "text-[#EC4899]";
    milestoneLabel = "HYPER";
  } else if (isMedium) {
    colorClass = "text-[#7C6BF5]";
    milestoneLabel = "STREAK";
  } else if (combo > 0) {
    colorClass = "text-[#4ADE80]";
  }

  return (
    <div
      id="combo-counter"
      className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-lg bg-[#160D30]/80 border border-[#3A2B5C] select-none transition-colors duration-150"
    >
      <span className="font-pixel text-[10px] tracking-wider text-[#9CA3AF]">
        COMBO
      </span>
      <span
        className={`font-mono-typing text-base sm:text-lg font-bold transition-colors duration-150 tabular-nums ${colorClass}`}
      >
        {combo}x
      </span>
      {milestoneLabel && (
        <span className={`font-pixel text-[9px] tracking-widest ${colorClass}`}>
          {milestoneLabel}
        </span>
      )}
    </div>
  );
}
