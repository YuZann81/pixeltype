/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

/**
 * Button component
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
    "inline-flex items-center justify-center font-medium transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none text-sm tracking-wide";

  const variantClasses =
    variant === "primary"
      ? "bg-gradient-to-r from-[#7C6BF5] to-[#EC4899] text-white px-6 py-2.5 rounded-lg hover:opacity-90 active:scale-[0.98]"
      : "border border-[#7C6BF5] text-[#E5E7EB] bg-[#7C6BF5]/10 hover:bg-[#7C6BF5]/20 px-5 py-2 rounded-lg active:scale-[0.98]";

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
