/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SpaceBackground from "../components/SpaceBackground.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import { useGame } from "../context/GameContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useGame();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [typedAnimationText, setTypedAnimationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const targetTransitionText = `> Mengautentikasi... Menyiapkan sistem...`;

  // Animasi typing teks huruf per huruf setelah login sebelum navigasi
  useEffect(() => {
    if (!isTransitioning) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex++;
      setTypedAnimationText(targetTransitionText.slice(0, currentIndex));

      if (currentIndex >= targetTransitionText.length) {
        clearInterval(interval);
        setTimeout(() => {
          navigate("/select-language");
        }, 350);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [isTransitioning, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Harap isi email dan password!");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        setIsTransitioning(true);
      } else {
        setError(result.error || "Login gagal");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="login-page"
      className="relative min-h-screen flex flex-col items-center justify-center p-6 select-none"
    >
      <SpaceBackground variant="dim" />

      <div className="w-full max-w-md z-10">
        {/* Atas: PIXEL TYPE + subtitle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <h1
            id="login-brand-title"
            className="font-pixel text-2xl sm:text-3xl text-[#E5E7EB] tracking-wider mb-2"
          >
            PIXEL TYPE
          </h1>
          <p
            id="login-subtitle"
            className="text-xs sm:text-sm text-[#9CA3AF] tracking-wide"
          >
            The futuristic typing game
          </p>
        </motion.div>

        {/* Card Form atau Animasi Typing Perpindahan */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="p-6 sm:p-8">
            {isTransitioning ? (
              <div
                id="login-typing-transition"
                className="py-8 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-8 h-8 rounded-full border-2 border-[#7C6BF5] border-t-transparent animate-spin mb-2" />
                <p className="font-mono text-sm sm:text-base text-[#4ADE80] break-all leading-relaxed">
                  {typedAnimationText}
                  <span className="inline-block w-2 h-4 bg-[#4ADE80] ml-1 animate-pulse" />
                </p>
                <span className="font-pixel text-[10px] text-[#9CA3AF] tracking-widest uppercase">
                  TRANSMITTING PROTOCOL
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Input 1 (Email) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-email"
                    className="block text-xs font-pixel text-[#9CA3AF]"
                  >
                    EMAIL
                  </label>
                  <input
                    id="input-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan Email"
                    autoFocus
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0B0B1F]/80 border border-[#3A2B5C] text-[#E5E7EB] placeholder-[#9CA3AF]/40 focus:outline-none focus:border-[#7C6BF5] transition text-sm"
                  />
                </div>

                {/* Input 2 (Password) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-password"
                    className="block text-xs font-pixel text-[#9CA3AF]"
                  >
                    PASSWORD
                  </label>
                  <input
                    id="input-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan Password"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0B0B1F]/80 border border-[#3A2B5C] text-[#E5E7EB] placeholder-[#9CA3AF]/40 focus:outline-none focus:border-[#7C6BF5] transition text-sm"
                  />
                </div>

                {/* Error message if any */}
                {error && (
                  <p className="text-xs text-[#F87171] font-medium">{error}</p>
                )}

                {/* Teks kecil info */}
                <p
                  id="login-helper-text"
                  className="text-xs text-[#9CA3AF]/80 leading-relaxed pt-1"
                >
                  Masukkan email dan password untuk masuk ke PixelType.
                </p>

                {/* Tombol Masuk */}
                <div className="pt-2">
                  <Button
                    id="btn-login-submit"
                    type="submit"
                    variant="primary"
                    className="w-full font-pixel text-xs py-3"
                    disabled={isLoading}
                  >
                    {isLoading ? "Memproses..." : "Masuk"}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
