/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";

/**
 * SpaceBackground
 * @param {'full' | 'dim' | 'gameplay'} variant
 */
export default function SpaceBackground({ variant = "full" }) {
  // Pre-generate static star positions with fixed opacity 0.4 - 0.7
  const stars = useMemo(() => {
    const starList = [];
    const count = variant === "gameplay" ? 30 : 65;
    // Deterministic random points
    for (let i = 0; i < count; i++) {
      const x = ((i * 37 + 13) % 100).toFixed(1);
      const y = ((i * 61 + 29) % 100).toFixed(1);
      const size = i % 4 === 0 ? 2 : 1;
      const opacity = (0.4 + ((i % 4) * 0.1)).toFixed(2);
      starList.push({ id: i, x, y, size, opacity });
    }
    return starList;
  }, [variant]);

  // Variant settings for nebula intensity and overall dimming
  const nebulaClass =
    variant === "full"
      ? "opacity-60"
      : variant === "dim"
      ? "opacity-35"
      : "opacity-15"; // gameplay - sangat redup

  return (
    <div
      id="space-background"
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-gradient-to-b from-[#1A0B2E] to-[#0B0B1F]"
    >
      {/* Nebula Ungu di Kiri Atas (Statis) */}
      <div
        className={`absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#7C6BF5]/20 blur-3xl pointer-events-none transition-opacity duration-500 ${nebulaClass}`}
      />

      {/* Nebula Pink di Kanan Bawah (Statis) */}
      <div
        className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#EC4899]/15 blur-3xl pointer-events-none transition-opacity duration-500 ${nebulaClass}`}
      />

      {/* Nebula Ungu Pusat (Halus) */}
      {variant !== "gameplay" && (
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[30rem] rounded-full bg-[#3A2B5C]/20 blur-3xl pointer-events-none ${nebulaClass}`}
        />
      )}

      {/* Static Stars (Opacity 0.4 - 0.7) */}
      <svg className="absolute inset-0 w-full h-full">
        {stars.map((star) => (
          <rect
            key={star.id}
            x={`${star.x}%`}
            y={`${star.y}%`}
            width={star.size}
            height={star.size}
            fill="#E5E7EB"
            opacity={star.opacity}
          />
        ))}
      </svg>
    </div>
  );
}
