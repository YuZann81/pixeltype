/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

/**
 * RoundIndicator component (◇◇◇)
 * Ronde aktif: #EF4444
 */
export default function RoundIndicator({ currentRound = 1, totalRounds = 3 }) {
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div id="round-indicator" className="flex items-center justify-center gap-3">
      {rounds.map((r) => {
        const isActive = r === currentRound;
        const isCompleted = r < currentRound;

        return (
          <div
            key={r}
            className="flex items-center justify-center transition-colors duration-200"
            title={`Round ${r}`}
          >
            {/* Diamond shape representation */}
            <span
              className={`text-xl font-bold tracking-widest transition-colors duration-200 select-none ${
                isActive
                  ? "text-[#EF4444]"
                  : isCompleted
                  ? "text-[#7C6BF5]"
                  : "text-[#4B5563]"
              }`}
            >
              {isActive ? "◆" : "◇"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
