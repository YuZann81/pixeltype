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
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-gradient-to-b from-[#160D30] via-[#0F0B26] to-[#0B0B1F]"
    >
      {/* Subtle Milky Way Band */}
      <div
        className={`absolute -inset-x-24 top-1/4 h-56 -rotate-12 bg-gradient-to-r from-transparent via-[#7C6BF5]/10 to-transparent blur-3xl pointer-events-none transition-opacity duration-500 ${nebulaClass}`}
      />

      {/* Nebula Ungu di Kiri Atas (Statis) */}
      <div
        className={`absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#7C6BF5]/20 blur-3xl pointer-events-none transition-opacity duration-500 ${nebulaClass}`}
      />

      {/* Nebula Pink di Kanan Bawah (Statis) */}
      <div
        className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#EC4899]/15 blur-3xl pointer-events-none transition-opacity duration-500 ${nebulaClass}`}
      />

      {/* Pixel-art Ringed Planet & Astronaut Accents (hidden during active gameplay for focus) */}
      {variant !== "gameplay" && (
        <>
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[30rem] rounded-full bg-[#3A2B5C]/20 blur-3xl pointer-events-none ${nebulaClass}`}
          />
          <svg
            className="absolute top-20 right-10 sm:right-20 w-20 h-20 opacity-25 text-[#7C6BF5]"
            viewBox="0 0 16 16"
            fill="currentColor"
            shapeRendering="crispEdges"
          >
            <rect x="5" y="4" width="6" height="8" />
            <rect x="4" y="5" width="8" height="6" />
            <rect x="1" y="8" width="14" height="1" fill="#EC4899" />
            <rect x="2" y="7" width="2" height="1" fill="#FBBF24" />
            <rect x="12" y="9" width="2" height="1" fill="#FBBF24" />
          </svg>
          <svg
            className="absolute bottom-16 left-8 sm:left-16 w-14 h-14 opacity-20 text-[#E5E7EB]"
            viewBox="0 0 12 12"
            fill="currentColor"
            shapeRendering="crispEdges"
          >
            <rect x="4" y="1" width="4" height="4" />
            <rect x="5" y="2" width="2" height="2" fill="#7C6BF5" />
            <rect x="3" y="5" width="6" height="4" />
            <rect x="2" y="6" width="1" height="2" />
            <rect x="9" y="6" width="1" height="2" />
            <rect x="4" y="9" width="1" height="2" />
            <rect x="7" y="9" width="1" height="2" />
          </svg>
        </>
      )}

      {/* Static Pixel Stars (Opacity 0.4 - 0.7) */}
      <svg className="absolute inset-0 w-full h-full">
        {stars.map((star) => (
          <rect
            key={star.id}
            x={`${star.x}%`}
            y={`${star.y}%`}
            width={star.size}
            height={star.size}
            fill={star.id % 7 === 0 ? "#7C6BF5" : star.id % 11 === 0 ? "#FBBF24" : "#E5E7EB"}
            opacity={star.opacity}
          />
        ))}
      </svg>
    </div>
  );
}
