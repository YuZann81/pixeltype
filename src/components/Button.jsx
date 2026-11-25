/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

/**
 * Button component — Clean Arcade Pixel Galaxy (matches Login Page style)
 * @param {'primary' | 'outline'} variant
 */
export default function Button({
  children,
  variant = "primary",
  onClick,
  className = "",
  disabled = false,
  type = "button",
  id,
  ...props
}) {
  const baseClasses =
    "inline-flex items-center justify-center font-normal transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none text-xs tracking-wide rounded-lg";

  const variantClasses =
    variant === "primary"
      ? "bg-[#5A4FC7] hover:bg-[#6A5FD8] active:scale-[0.99] text-[#E5E7F0] px-6 py-3"
      : "border border-[#2A2F4F] text-[#A6A9BA] hover:text-[#E5E7F0] bg-[#121528]/60 hover:bg-[#121528] hover:border-[#7C6BF5]/60 px-5 py-2.5 active:scale-[0.99]";

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
