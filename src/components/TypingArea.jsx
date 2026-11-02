/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from "react";

/**
 * TypingArea component
 * Highlight per huruf:
 * - benar: #4ADE80 (hijau)
 * - salah: #F87171 (merah)
 * - belum diketik: #9CA3AF (abu)
 */
export default function TypingArea({
  targetText = "",
  userInput = "",
  onInputChange,
  disabled = false,
  inputRef,
}) {
  const containerRef = useRef(null);
  const fallbackInputRef = useRef(null);
  const activeInputRef = inputRef || fallbackInputRef;

  // Auto focus input when area clicked or enabled
  useEffect(() => {
    if (!disabled && activeInputRef.current) {
      activeInputRef.current.focus();
    }
  }, [disabled, activeInputRef]);

  const handleContainerClick = () => {
    if (activeInputRef.current && !disabled) {
      activeInputRef.current.focus();
    }
  };

  const characters = targetText.split("");

  return (
    <div
      id="typing-area-container"
      onClick={handleContainerClick}
      className="relative w-full max-w-2xl mx-auto my-4 p-6 sm:p-8 bg-[#1A1B2E]/60 border border-[#3A2B5C] rounded-xl cursor-text transition-all duration-150"
    >
      {/* Hidden real input for keyboard focus and mobile compatibility */}
      <input
        id="typing-hidden-input"
        ref={activeInputRef}
        type="text"
        value={userInput}
        onChange={(e) => onInputChange && onInputChange(e.target.value)}
        disabled={disabled}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className="absolute opacity-0 inset-0 w-full h-full cursor-default pointer-events-auto -z-10"
        aria-label="Ketik teks di sini"
      />

      {/* Rendered Text with Letter-by-Letter Highlighting */}
      <div
        id="typing-text-display"
        className="font-mono text-lg sm:text-xl leading-relaxed tracking-normal select-none break-words min-h-[5.5rem] flex flex-wrap items-baseline gap-y-1"
      >
        {characters.map((char, index) => {
          let charColor = "text-[#9CA3AF]/70"; // belum diketik
          let isCurrentCursor = index === userInput.length;
          let isSpace = char === " ";

          if (index < userInput.length) {
            const userChar = userInput[index];
            const isCorrect = userChar === char;
            if (isCorrect) {
              charColor = "text-[#4ADE80] font-medium";
            } else {
              charColor = "text-[#F87171] underline decoration-[#F87171] font-medium bg-[#F87171]/10 rounded-xs";
            }
          }

          return (
            <span
              key={index}
              className={`relative inline-block ${charColor} transition-colors duration-75`}
            >
              {/* Blinking cursor at the next expected letter */}
              {isCurrentCursor && !disabled && (
                <span
                  aria-hidden="true"
                  className="absolute -left-[1px] top-0 bottom-0 w-[2px] bg-[#7C6BF5] animate-pulse"
                />
              )}
              {isSpace ? "\u00A0" : char}
            </span>
          );
        })}
      </div>

      {/* Subtitle helper if unfocused */}
      <div className="mt-4 pt-3 border-t border-[#3A2B5C]/40 flex items-center justify-between text-xs text-[#9CA3AF]">
        <span>Ketik sesuai urutan karakter</span>
        <span className="text-[11px] text-[#7C6BF5]/80">
          {userInput.length} / {targetText.length} Karakter
        </span>
      </div>
    </div>
  );
}
