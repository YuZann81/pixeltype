/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo } from "react";

/**
 * TypingArea component
 * Groups characters by word inside non-breaking word wrappers (`whitespace-nowrap`)
 * so words never split across lines while preserving character-level coloring and caret.
 */
export default function TypingArea({
  targetText = "",
  userInput = "",
  onInputChange,
  disabled = false,
  inputRef,
}) {
  const [isFocused, setIsFocused] = useState(false);
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

  // Group characters into word tokens (each word keeps its trailing space attached)
  const wordTokens = useMemo(() => {
    const tokens = [];
    let currentChars = [];
    let tokenStart = 0;

    for (let i = 0; i < targetText.length; i++) {
      const char = targetText[i];
      currentChars.push({ char, index: i });
      if (char === " ") {
        tokens.push({ startIndex: tokenStart, chars: currentChars });
        currentChars = [];
        tokenStart = i + 1;
      }
    }

    if (currentChars.length > 0) {
      tokens.push({ startIndex: tokenStart, chars: currentChars });
    }

    return tokens;
  }, [targetText]);

  return (
    <div
      id="typing-area-container"
      onClick={handleContainerClick}
      className="relative w-full max-w-2xl mx-auto my-4 px-2 py-4 sm:px-4 sm:py-6 bg-transparent border-0 rounded-none shadow-none cursor-text transition-all duration-150"
    >
      {/* Hidden real input for keyboard focus and mobile compatibility */}
      <input
        id="typing-hidden-input"
        ref={activeInputRef}
        type="text"
        value={userInput}
        onChange={(e) => onInputChange && onInputChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPaste={(e) => e.preventDefault()}
        disabled={disabled}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className="absolute opacity-0 inset-0 w-full h-full cursor-default pointer-events-auto -z-10"
        aria-label="Ketik teks di sini"
      />

      {/* Rendered Text: Whole-word non-breaking wrappers directly over galaxy background */}
      <div
        id="typing-text-display"
        className={`font-mono-typing text-xl sm:text-2xl leading-relaxed tracking-normal select-none min-h-[6.5rem] flex flex-wrap content-start gap-y-1.5 transition-all duration-150 ${
          !isFocused && !disabled ? "opacity-45 blur-[1.5px]" : "opacity-100"
        }`}
      >
        {wordTokens.map((token) => (
          <span
            key={token.startIndex}
            className="inline-flex whitespace-nowrap max-w-full"
          >
            {token.chars.map(({ char, index }) => {
              let charColor = "text-[#A6A9BA]"; // untyped
              const isCurrentCursor = index === userInput.length;
              const isSpace = char === " ";

              if (index < userInput.length) {
                const isCorrect = userInput[index] === char;
                if (isCorrect) {
                  charColor = "text-[#86CFA4] font-medium";
                } else {
                  charColor =
                    "text-[#D98A91] underline decoration-[#D98A91] font-medium";
                }
              }

              return (
                <span
                  key={index}
                  className={`relative inline-block ${charColor} transition-colors duration-75`}
                >
                  {isCurrentCursor && !disabled && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-[1px] top-0.5 bottom-0.5 w-[2px] rounded-full bg-[#C2B7FF] animate-pulse"
                    />
                  )}
                  {isSpace ? "\u00A0" : char}
                </span>
              );
            })}
          </span>
        ))}
      </div>

      {/* Clear Focus/Blur Overlay */}
      {!isFocused && !disabled && (
        <div
          id="typing-focus-overlay"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span className="px-4 py-2 rounded-lg bg-[#0B0B1F]/90 border border-[#3A2B5C] font-mono-typing text-xs text-[#FBBF24] tracking-wide">
            Klik area ini untuk melanjutkan mengetik
          </span>
        </div>
      )}

      {/* Subtle character progress footer */}
      <div className="mt-4 pt-2 flex items-center justify-between text-xs text-[#A6A9BA]/80">
        <span className={!isFocused && !disabled ? "text-[#FBBF24] font-medium" : ""}>
          {!isFocused && !disabled
            ? "Klik area ini untuk melanjutkan mengetik"
            : "Ketik sesuai urutan karakter"}
        </span>
        <span className="text-[11px] font-mono-typing text-[#C2B7FF]/90">
          {userInput.length} / {targetText.length} Karakter
        </span>
      </div>
    </div>
  );
}
