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
      color: "text-[#4ADE80]",
    },
    {
      id: "stat-total-char",
      label: "TOTAL CHARACTER",
      value: totalCharacters,
      unit: "karakter",
      color: "text-[#E5E7EB]",
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
          className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl bg-[#1A1B2E]/60 border border-[#3A2B5C] transition-colors"
        >
          <span className="font-pixel text-[10px] sm:text-xs text-[#9CA3AF] tracking-wider mb-1">
            {stat.label}
          </span>
          <span
            className={`font-pixel text-lg sm:text-2xl font-bold tabular-nums ${stat.color}`}
          >
            {stat.value}
          </span>
          <span className="text-[11px] text-[#9CA3AF]/70 mt-0.5 capitalize hidden sm:inline">
            {stat.unit}
          </span>
        </div>
      ))}
    </div>
  );
}
