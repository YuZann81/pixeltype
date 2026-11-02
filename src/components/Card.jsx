/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

/**
 * Card component with standard PixelType styling
 */
export default function Card({ children, className = "", id, ...props }) {
  return (
    <div
      id={id}
      className={`bg-[rgba(26,27,46,0.6)] backdrop-blur-sm border border-[#3A2B5C] rounded-xl shadow-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
