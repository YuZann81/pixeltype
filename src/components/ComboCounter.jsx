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

  let colorClass = "text-[#8E93A8]";
  let milestoneLabel = null;
  if (isSuper) {
    colorClass = "text-[#E8C168]";
    milestoneLabel = "COSMIC";
  } else if (isHigh) {
    colorClass = "text-[#C2B7FF]";
    milestoneLabel = "HYPER";
  } else if (isMedium) {
    colorClass = "text-[#7C6BF5]";
    milestoneLabel = "STREAK";
  } else if (combo > 0) {
    colorClass = "text-[#86CFA4]";
  }

  return (
    <div
      id="combo-counter"
      className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-lg bg-[#121528]/80 border border-[#2A2F4F] select-none transition-colors duration-150"
    >
      <span className="font-pixel font-normal text-[8px] tracking-wider text-[#8E93A8]">
        COMBO
      </span>
      <span
        className={`font-mono-typing text-sm sm:text-base font-medium transition-colors duration-150 tabular-nums ${colorClass}`}
      >
        {combo}x
      </span>
      {milestoneLabel && (
        <span className={`font-pixel font-normal text-[8px] tracking-widest ${colorClass}`}>
          {milestoneLabel}
        </span>
      )}
    </div>
  );
}
