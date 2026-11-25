/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

/**
 * StatsBar component
 * 3 stat kotak: WPM, ACC, Total Character
 */
export default function StatsBar({ wpm = 0, acc = 100, totalCharacters = 0 }) {
  const stats = [
    {
      id: "stat-wpm",
      label: "WPM",
      value: wpm,
      unit: "wpm",
      color: "text-[#7C6BF5]",
    },
    {
      id: "stat-acc",
      label: "ACC",
      value: `${acc}%`,
      unit: "akurasi",
      color: "text-[#86CFA4]",
    },
    {
      id: "stat-total-char",
      label: "TOTAL CHARACTER",
      value: totalCharacters,
      unit: "karakter",
      color: "text-[#E5E7F0]",
    },
  ];

  return (
    <div
      id="stats-bar"
      className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl mx-auto select-none"
    >
      {stats.map((stat) => (
        <div
          key={stat.id}
          id={stat.id}
          className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl bg-[#121528]/80 border border-[#2A2F4F] transition-colors"
        >
          <span className="font-pixel font-normal text-[8px] sm:text-[9px] text-[#8E93A8] tracking-wider mb-1.5">
            {stat.label}
          </span>
          <span
            className={`font-pixel font-normal text-base sm:text-xl tabular-nums ${stat.color}`}
          >
            {stat.value}
          </span>
          <span className="text-[11px] text-[#8E93A8]/70 mt-1 capitalize hidden sm:inline">
            {stat.unit}
          </span>
        </div>
      ))}
    </div>
  );
}
