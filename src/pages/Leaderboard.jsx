/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SpaceBackground from "../components/SpaceBackground.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import { useGame } from "../context/GameContext.jsx";

export default function Leaderboard() {
  const navigate = useNavigate();
  const { state, fetchLeaderboard } = useGame();
  const [p2rLeaderboard, setP2rLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLeaderboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLeaderboard();
      setP2rLeaderboard(data);
    } catch (err) {
      console.error("[Leaderboard] P2R fetch failed:", err);
      setError(err.message || "Gagal memuat leaderboard dari P2R");
    } finally {
      setLoading(false);
    }
  }, [fetchLeaderboard]);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  // Real P2R data without dummy fallbacks
  const scores = (p2rLeaderboard?.leaderboard || []).map((entry) => ({
    rank: entry.rank,
    nick: entry.player?.name || "Player",
    score: entry.score,
    wpm: entry.data?.net_wpm ?? entry.data?.wpm ?? 0,
    acc: entry.data?.accuracy ?? 0,
  }));

  const firstPlace = scores[0] || null;
  const secondPlace = scores[1] || null;
  const thirdPlace = scores[2] || null;
  const restScores = scores.slice(3, 10);

  const direction = p2rLeaderboard?.direction || "higher_is_better";
  const totalPlayers = p2rLeaderboard?.total_players || 0;
  const myRank = p2rLeaderboard?.my_rank;

  return (
    <div
      id="leaderboard-page"
      className="relative min-h-screen flex flex-col justify-between p-6 sm:p-10 select-none overflow-x-hidden"
    >
      <SpaceBackground variant="full" />

      {/* Header with Title & Event Info */}
      <header className="w-full max-w-2xl mx-auto text-center pt-2 pb-4 z-10">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          id="leaderboard-title"
          className="font-pixel text-xl sm:text-2xl text-[#E5E7EB] tracking-wider"
        >
          Top Typing Leaderboard
        </motion.h1>

        {p2rLeaderboard && (
          <p className="mt-2 text-xs text-[#9CA3AF]">
            {p2rLeaderboard.event?.name
              ? `Event: ${p2rLeaderboard.event.name} | `
              : "Global Leaderboard | "}
            {totalPlayers} pemain terdaftar |{" "}
            {direction === "higher_is_better" ? "Skor Tertinggi" : "Waktu Tercepat"}
          </p>
        )}

        {/* Player's Own Rank Badge if authenticated */}
        {myRank && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-2.5 rounded-lg bg-[#7C6BF5]/15 border border-[#7C6BF5]/40 inline-flex items-center gap-3"
          >
            <span className="font-pixel text-xs text-[#7C6BF5]">
              PERINGKAT ANDA: #{myRank.rank}
            </span>
            <span className="font-pixel text-xs text-[#E5E7EB]">
              Skor: {myRank.score}
            </span>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-3 rounded-lg bg-[#F87171]/15 border border-[#F87171]/30 text-xs text-[#F87171] flex items-center justify-center gap-3">
            <span>{error}</span>
            <button
              onClick={loadLeaderboardData}
              className="text-[#7C6BF5] underline font-pixel cursor-pointer hover:text-[#9CA3AF]"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </header>

      {/* Main Content: Loading, Empty, or Real Podium & List */}
      <main className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center gap-6 z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#7C6BF5] border-t-transparent animate-spin" />
            <p className="font-pixel text-xs text-[#9CA3AF] tracking-wider uppercase">
              Memuat Papan Klasemen P2R...
            </p>
          </div>
        ) : scores.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <div className="text-3xl">🏆</div>
            <h3 className="font-pixel text-base text-[#E5E7EB]">
              Belum Ada Skor Tercatat
            </h3>
            <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto leading-relaxed">
              Papan klasemen PixelType saat ini masih kosong. Mainkan gamenya sekarang dan jadilah pemain pertama yang tercatat di leaderboard!
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => navigate("/select-language")}
                className="font-pixel text-xs"
              >
                Mulai Main
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Podium: 2 (Kiri), 1 (Tengah - Lebih Tinggi), 3 (Kanan) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              id="leaderboard-podium"
              className="flex items-end justify-center gap-3 sm:gap-4 pt-6 pb-2"
            >
              {/* Rank 2 (Kiri) */}
              <div className="flex-1 flex flex-col items-center">
                <div className="text-center mb-2">
                  <span className="font-semibold text-sm sm:text-base text-[#E5E7EB] block truncate max-w-[100px] sm:max-w-[130px]">
                    {secondPlace ? secondPlace.nick : "-"}
                  </span>
                  <span className="text-xs text-[#7C6BF5] font-pixel block">
                    {secondPlace ? `${secondPlace.score} PTS` : "-"}
                  </span>
                </div>
                <div
                  className={`w-full h-24 sm:h-28 rounded-t-xl border-t border-l border-r flex items-center justify-center ${
                    secondPlace
                      ? "bg-[rgba(26,27,46,0.85)] border-[#3A2B5C]"
                      : "bg-[rgba(26,27,46,0.3)] border-[#3A2B5C]/30 opacity-40"
                  }`}
                >
                  <span className="font-pixel text-2xl text-[#9CA3AF]">2</span>
                </div>
              </div>

              {/* Rank 1 (Tengah, Lebih Tinggi) */}
              <div className="flex-1 flex flex-col items-center">
                <div className="text-center mb-2">
                  <span className="font-bold text-base sm:text-lg text-[#E5E7EB] block truncate max-w-[110px] sm:max-w-[150px]">
                    {firstPlace ? firstPlace.nick : "-"}
                  </span>
                  {firstPlace && (
                    <span className="text-[11px] text-[#4ADE80] block font-mono">
                      {firstPlace.wpm} WPM · {firstPlace.acc}%
                    </span>
                  )}
                  <span className="text-xs text-[#EC4899] font-pixel block mt-0.5">
                    {firstPlace ? `${firstPlace.score} PTS` : "-"}
                  </span>
                </div>
                <div
                  className={`w-full h-32 sm:h-36 rounded-t-xl border-t-2 border-l border-r flex items-center justify-center ${
                    firstPlace
                      ? "bg-[rgba(35,32,65,0.9)] border-[#7C6BF5] shadow-lg shadow-[#7C6BF5]/20"
                      : "bg-[rgba(26,27,46,0.3)] border-[#3A2B5C]/30 opacity-40"
                  }`}
                >
                  <span className="font-pixel text-3xl text-[#7C6BF5]">1</span>
                </div>
              </div>

              {/* Rank 3 (Kanan) */}
              <div className="flex-1 flex flex-col items-center">
                <div className="text-center mb-2">
                  <span className="font-semibold text-sm sm:text-base text-[#E5E7EB] block truncate max-w-[100px] sm:max-w-[130px]">
                    {thirdPlace ? thirdPlace.nick : "-"}
                  </span>
                  <span className="text-xs text-[#7C6BF5] font-pixel block">
                    {thirdPlace ? `${thirdPlace.score} PTS` : "-"}
                  </span>
                </div>
                <div
                  className={`w-full h-20 sm:h-24 rounded-t-xl border-t border-l border-r flex items-center justify-center ${
                    thirdPlace
                      ? "bg-[rgba(26,27,46,0.85)] border-[#3A2B5C]"
                      : "bg-[rgba(26,27,46,0.3)] border-[#3A2B5C]/30 opacity-40"
                  }`}
                >
                  <span className="font-pixel text-2xl text-[#9CA3AF]">3</span>
                </div>
              </div>
            </motion.div>

            {/* List 4 through 10 (Rendered only if entries exist) */}
            {restScores.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="p-4 sm:p-5">
                  <div className="divide-y divide-[#3A2B5C]/50 space-y-1">
                    {restScores.map((item) => (
                      <div
                        key={item.rank}
                        id={`leaderboard-row-${item.rank}`}
                        className="flex items-center justify-between py-2 text-sm sm:text-base"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-pixel text-xs text-[#9CA3AF] w-6">
                            {item.rank}.
                          </span>
                          <span className="font-medium text-[#E5E7EB]">
                            {item.nick}
                          </span>
                        </div>
                        <span className="font-pixel text-xs text-[#7C6BF5]">
                          {item.score} PTS
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Bawah: Tombol Kembali ke Menu */}
      <footer className="w-full max-w-2xl mx-auto pt-6 flex items-center justify-start z-10">
        <Button
          id="btn-to-main"
          variant="outline"
          onClick={() => navigate("/")}
          className="font-pixel text-xs"
        >
          Kembali ke Menu
        </Button>
      </footer>
    </div>
  );
}
