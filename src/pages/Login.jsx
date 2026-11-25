/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import SpaceBackground from "../components/SpaceBackground.jsx";
import { useGame } from "../context/GameContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useGame();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      className="relative min-h-screen flex flex-col justify-between px-5 py-6 sm:px-8 sm:py-7 font-pixel font-normal select-none overflow-x-hidden"
    >
      <SpaceBackground variant="gameplay" />

      {/* Subtle atmospheric vignette for form contrast */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_center,rgba(11,11,31,0.12)_0%,rgba(11,11,31,0.72)_100%)]"
      />

      {/* Minimal Top Navigation */}
      <header className="w-full max-w-5xl mx-auto grid grid-cols-3 items-center gap-2 z-10">
        <div className="flex items-center justify-start min-w-0">
          <Link
            id="link-back-home"
            to="/"
            className="inline-flex items-center gap-1.5 font-pixel font-normal text-[7px] sm:text-[8px] leading-relaxed tracking-wide text-[#8E93A8] hover:text-[#E5E7F0] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">Home</span>
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </div>

        <div className="flex items-center justify-center min-w-0">
          <span
            id="login-brand-title"
            className="font-pixel font-normal text-[8px] sm:text-[10px] leading-relaxed text-[#E5E7F0]/85 tracking-widest whitespace-nowrap"
          >
            PixelType
          </span>
        </div>

        <div className="flex items-center justify-end min-w-0">
          <Link
            id="link-login-leaderboard"
            to="/leaderboard"
            className="font-pixel font-normal text-[7px] sm:text-[8px] leading-relaxed tracking-wide text-[#8E93A8] hover:text-[#E5E7F0] transition-colors whitespace-nowrap"
          >
            Leaderboard
          </Link>
        </div>
      </header>

      {/* Compact Centered Login Form */}
      <main className="w-full max-w-[360px] mx-auto flex-1 flex flex-col items-center justify-center py-10 z-10">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {/* Understated Brand Emblem + Heading */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-[#7C6BF5]/90"
                viewBox="0 0 12 12"
                fill="currentColor"
                shapeRendering="crispEdges"
                aria-hidden="true"
              >
                <rect x="5" y="1" width="2" height="2" />
                <rect x="4" y="3" width="4" height="4" />
                <rect x="3" y="5" width="1" height="3" />
                <rect x="8" y="5" width="1" height="3" />
                <rect x="4" y="7" width="4" height="2" />
                <rect x="4" y="9" width="1" height="2" fill="#8E93A8" />
                <rect x="7" y="9" width="1" height="2" fill="#8E93A8" />
              </svg>
            </div>

            <h1 className="font-pixel font-normal text-[13px] sm:text-[15px] text-[#E5E7F0] leading-relaxed tracking-wide">
              Masuk ke PixelType
            </h1>
            <p
              id="login-subtitle"
              className="font-pixel font-normal text-[8px] sm:text-[9px] text-[#8E93A8] mt-3 leading-loose tracking-wide"
            >
              Gunakan akun P2R Anda untuk melanjutkan.
            </p>
          </div>

          {isTransitioning ? (
            <div
              id="login-typing-transition"
              className="py-10 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-6 h-6 rounded-full border-2 border-[#7C6BF5] border-t-transparent animate-spin" />
              <p className="font-pixel font-normal text-[9px] sm:text-[10px] text-[#86CFA4] break-words leading-loose">
                {typedAnimationText}
                <span className="inline-block w-1.5 h-3 bg-[#86CFA4] ml-1 align-middle animate-pulse" />
              </p>
              <span className="font-pixel font-normal text-[7px] sm:text-[8px] text-[#8E93A8] tracking-widest leading-relaxed">
                Menyiapkan sesi...
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-7">
              {/* Email Input — Minimal Bottom Border */}
              <div className="space-y-2">
                <label
                  htmlFor="input-email"
                  className="block font-pixel font-normal text-[7px] sm:text-[8px] tracking-wider text-[#8E93A8] leading-relaxed"
                >
                  Email
                </label>
                <input
                  id="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoFocus
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  className="w-full px-0.5 py-2.5 bg-transparent border-0 border-b border-[#343952] rounded-none text-[#E5E7F0] placeholder:text-[#6E738A] placeholder:font-pixel placeholder:font-normal placeholder:text-[8px] focus:outline-none focus:border-[#7C6BF5] transition-colors font-pixel font-normal text-[9px] sm:text-[10px] leading-relaxed tracking-wide disabled:opacity-60"
                />
              </div>

              {/* Password Input — Minimal Bottom Border + Visibility Toggle */}
              <div className="space-y-2">
                <label
                  htmlFor="input-password"
                  className="block font-pixel font-normal text-[7px] sm:text-[8px] tracking-wider text-[#8E93A8] leading-relaxed"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="input-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    className="w-full pl-0.5 pr-9 py-2.5 bg-transparent border-0 border-b border-[#343952] rounded-none text-[#E5E7F0] placeholder:text-[#6E738A] placeholder:font-pixel placeholder:font-normal placeholder:text-[8px] focus:outline-none focus:border-[#7C6BF5] transition-colors font-pixel font-normal text-[9px] sm:text-[10px] leading-relaxed tracking-wide disabled:opacity-60"
                  />
                  <button
                    id="btn-toggle-password"
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 font-pixel font-normal text-[#8E93A8] hover:text-[#E5E7F0] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Subtle Error Feedback */}
              {error && (
                <p
                  id="login-error-message"
                  role="alert"
                  className="font-pixel font-normal text-[8px] sm:text-[9px] text-[#D98A91] border-l-2 border-[#D98A91]/70 pl-3 py-1 leading-loose tracking-wide"
                >
                  {error}
                </p>
              )}

              {/* Solid Indigo Login Button (No Glow) */}
              <div className="pt-2">
                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-5 rounded-lg bg-[#5A4FC7] hover:bg-[#6A5FD8] active:scale-[0.99] text-[#E5E7F0] font-pixel font-normal text-[9px] sm:text-[10px] leading-relaxed tracking-widest transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Memproses..." : "Masuk"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </main>

      {/* Subtle Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center font-pixel font-normal text-[7px] leading-relaxed tracking-widest text-[#8E93A8]/45 z-10">
        PixelType Galaxy
      </footer>
    </div>
  );
}
