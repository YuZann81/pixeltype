/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

/**
 * Card component — Clean Arcade Pixel Galaxy (restrained indigo, no neon glow)
 */
export default function Card({ children, className = "", id, ...props }) {
  return (
    <div
      id={id}
      className={`bg-[#121528]/85 border border-[#2A2F4F] rounded-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
