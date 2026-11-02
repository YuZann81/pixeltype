/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import {
  getLanguage,
  setLanguage as saveLangToStorage,
  getHistory,
  addHistory,
} from "../utils/storage.js";
import { calculateWPM, calculateAccuracy, calculateScore } from "../utils/stats.js";
import {
  login,
  logout,
  getMe,
  getGameAccessTokenViaProxy,
  getEventsForGame,
  startSession,
  completeSession,
  spendAction,
  getLeaderboard,
  getWallet,
  isApiError,
} from "../lib/api/p2r.js";
import { ApiError } from "../lib/api/client.js";

const GameContext = createContext(null);

const INITIAL_ROUND_TIME = 30;
const TOTAL_ROUNDS = 3;

const initialState = {
  // Player auth
  user: null,
  authToken: null,
  isAuthenticated: false,

  // Game config
  language: "IND",
  totalRounds: TOTAL_ROUNDS,

  // Gameplay state (unchanged from original)
  round: 1,
  timer: INITIAL_ROUND_TIME,
  combo: 0,
  maxCombo: 0,
  wpm: 0,
  acc: 100,
  charCount: 0,
  correctChars: 0,
  totalChars: 0,
  score: 0,
  bestScore: 0,
  coins: 0,
  isPlaying: false,
  isFinished: false,
  history: [],

  // P2R Integration state
  // Game token (memory only, never persisted)
  gameToken: null,
  gameTokenExpiry: null,

  // Session state
  session: null, // { id, status, sessionToken, eventId, expiresAt }
  sessionStarting: false,
  sessionError: null,

  // Gameplay telemetry (for P2R submission)
  roundData: [], // { round, duration, characters_typed, correct_characters, incorrect_characters }

  // Leaderboard
  leaderboard: null,
  leaderboardLoading: false,
  leaderboardError: null,

  // Economy
  economyLoading: false,
  economyError: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    // Player auth
    case "SET_USER": {
      return { ...state, user: action.payload };
    }

    case "SET_AUTH": {
      const user = action.payload.user;
      return {
        ...state,
        user: { ...user, nick: user.name },
        authToken: action.payload.token,
        isAuthenticated: true,
      };
    }

    case "CLEAR_AUTH": {
      return {
        ...state,
        user: null,
        authToken: null,
        isAuthenticated: false,
        gameToken: null,
        gameTokenExpiry: null,
        session: null,
        leaderboard: null,
      };
    }

    case "SET_LANGUAGE": {
      return { ...state, language: action.payload };
    }

    // Game token management
    case "SET_GAME_TOKEN": {
      return {
        ...state,
        gameToken: action.payload.token,
        gameTokenExpiry: action.payload.expiresAt,
      };
    }

    case "CLEAR_GAME_TOKEN": {
      return { ...state, gameToken: null, gameTokenExpiry: null };
    }

    // Session management
    case "SESSION_STARTING": {
      return { ...state, sessionStarting: true, sessionError: null };
    }

    case "SESSION_START_SUCCESS": {
      return {
        ...state,
        sessionStarting: false,
        session: action.payload,
        sessionError: null,
      };
    }

    case "SESSION_START_ERROR": {
      return {
        ...state,
        sessionStarting: false,
        sessionError: action.payload,
        session: null,
      };
    }

    case "SESSION_COMPLETED": {
      return {
        ...state,
        session: { ...state.session, status: "completed" },
      };
    }

    case "CLEAR_SESSION": {
      return { ...state, session: null, sessionError: null };
    }

    // Gameplay state (original logic preserved)
    case "START_GAME": {
      return {
        ...state,
        round: 1,
        timer: INITIAL_ROUND_TIME,
        combo: 0,
        maxCombo: 0,
        wpm: 0,
        acc: 100,
        charCount: 0,
        correctChars: 0,
        totalChars: 0,
        score: 0,
        isPlaying: true,
        isFinished: false,
        roundData: [],
      };
    }

    case "TICK": {
      if (!state.isPlaying || state.timer <= 0) return state;
      const nextTimer = state.timer - 1;
      return { ...state, timer: nextTimer };
    }

    case "INCREMENT_COMBO": {
      const nextCombo = state.combo + 1;
      return {
        ...state,
        combo: nextCombo,
        maxCombo: Math.max(state.maxCombo, nextCombo),
      };
    }

    case "RESET_COMBO": {
      return { ...state, combo: 0 };
    }

    case "UPDATE_TYPING_STATS": {
      const { correctChars, totalChars, elapsedSeconds } = action.payload;
      const wpm = calculateWPM(correctChars, elapsedSeconds);
      const acc = calculateAccuracy(correctChars, totalChars);
      const score = calculateScore(wpm, acc, state.maxCombo);

      return {
        ...state,
        correctChars,
        totalChars,
        charCount: totalChars,
        wpm,
        acc,
        score,
      };
    }

    case "RECORD_ROUND": {
      // Record round telemetry for P2R submission
      return {
        ...state,
        roundData: [...state.roundData, action.payload],
      };
    }

    case "NEXT_ROUND": {
      const nextRound = state.round + 1;
      if (nextRound > state.totalRounds) {
        return {
          ...state,
          isPlaying: false,
          isFinished: true,
        };
      }
      return {
        ...state,
        round: nextRound,
        timer: INITIAL_ROUND_TIME,
        combo: 0,
      };
    }

    case "END_GAME": {
      const finalScore = state.score;
      const bestScore = Math.max(state.bestScore, finalScore);
      const gameRecord = {
        nick: state.user?.nick || "Guest",
        wpm: state.wpm,
        acc: state.acc,
        charCount: state.charCount,
        score: finalScore,
        maxCombo: state.maxCombo,
        date: new Date().toISOString(),
      };

      return {
        ...state,
        isPlaying: false,
        isFinished: true,
        bestScore,
        coins: state.coins + Math.floor(finalScore / 10),
      };
    }

    case "RESET_GAME": {
      return {
        ...state,
        round: 1,
        timer: INITIAL_ROUND_TIME,
        combo: 0,
        maxCombo: 0,
        wpm: 0,
        acc: 100,
        charCount: 0,
        correctChars: 0,
        totalChars: 0,
        score: 0,
        isPlaying: false,
        isFinished: false,
        roundData: [],
        session: null,
        sessionError: null,
      };
    }

    // P2R Integration
    case "SET_EVENTS": {
      return { ...state, events: action.payload };
    }

    case "SET_LEADERBOARD": {
      return {
        ...state,
        leaderboard: action.payload,
        leaderboardLoading: false,
        leaderboardError: null,
      };
    }

    case "LEADERBOARD_LOADING": {
      return { ...state, leaderboardLoading: true, leaderboardError: null };
    }

    case "LEADERBOARD_ERROR": {
      return {
        ...state,
        leaderboardLoading: false,
        leaderboardError: action.payload,
      };
    }

    case "ECONOMY_LOADING": {
      return { ...state, economyLoading: true, economyError: null };
    }

    case "ECONOMY_SUCCESS": {
      return {
        ...state,
        economyLoading: false,
        economyError: null,
        coins: action.payload.balanceAfter,
      };
    }

    case "ECONOMY_ERROR": {
      return {
        ...state,
        economyLoading: false,
        economyError: action.payload,
      };
    }

    case "UPDATE_COINS": {
      return { ...state, coins: action.payload };
    }

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("p2r_auth_token");
    const userStr = localStorage.getItem("p2r_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        dispatch({ type: "SET_AUTH", payload: { token, user } });
      } catch (err) {
        localStorage.removeItem("p2r_auth_token");
        localStorage.removeItem("p2r_user");
      }
    }
  }, []);

  // Game token management
  const getValidGameToken = useCallback(async () => {
    if (state.gameToken && state.gameTokenExpiry && Date.now() < state.gameTokenExpiry - 30000) {
      return state.gameToken;
    }

    if (!state.authToken) {
      throw new Error("No player token available");
    }

    try {
      const response = await getGameAccessTokenViaProxy("pixeltype", {
        token: state.authToken,
      });

      if (response.success && response.data) {
        const { access_token, expires_in, expires_at } = response.data;
        const expiryMs = new Date(expires_at).getTime();
        dispatch({ type: "SET_GAME_TOKEN", payload: { token: access_token, expiresAt: expiryMs } });
        return access_token;
      } else {
        throw new Error(response.message || "Failed to get game token");
      }
    } catch (err) {
      console.error("[P2R] Game token fetch failed:", err);
      throw err;
    }
  }, [state.authToken, state.gameToken, state.gameTokenExpiry]);

  // Event discovery
  const fetchActiveEvent = useCallback(async () => {
    try {
      const response = await getEventsForGame("pixeltype", { token: state.authToken });
      if (response.success && response.data) {
        const now = new Date();
        const activeEvent = response.data.find(
          (e) => e.is_active && new Date(e.starts_at) <= now && new Date(e.ends_at) >= now
        );
        return activeEvent || null;
      }
      return null;
    } catch (err) {
      console.error("[P2R] Event discovery failed:", err);
      return null;
    }
  }, [state.authToken]);

  // Session start
  const startP2RSession = useCallback(async () => {
    dispatch({ type: "SESSION_STARTING" });

    try {
      const event = await fetchActiveEvent();
      const gameToken = await getValidGameToken();

      const idempotencyKey = `session_start_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const sessionPayload = {
        platform: "web",
        game_version: "1.0",
        idempotency_key: idempotencyKey,
        metadata: { language: state.language },
      };

      if (event?.id) {
        sessionPayload.event_id = event.id;
      }

      const response = await startSession(
        "pixeltype",
        sessionPayload,
        { token: state.authToken, gameToken }
      );

      if (response.success && response.data) {
        const { session, session_token, is_replayed } = response.data;
        dispatch({
          type: "SESSION_START_SUCCESS",
          payload: {
            id: session.id,
            status: session.status,
            sessionToken: session_token,
            eventId: session.event_id || event?.id || null,
            expiresAt: session.expires_at,
          },
        });
        return { session, sessionToken: session_token, isReplayed: is_replayed };
      } else {
        throw new Error(response.message || "Failed to start session");
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err.message || "Failed to start session";
      dispatch({ type: "SESSION_START_ERROR", payload: message });
      throw err;
    }
  }, [state.authToken, state.language, getValidGameToken, fetchActiveEvent]);

  // Session complete + score submission
  const completeP2RSession = useCallback(async (finalScore, telemetryData) => {
    if (!state.session || !state.authToken) {
      throw new Error("No active session or player token");
    }

    try {
      const gameToken = await getValidGameToken();
      const sessionToken = state.session.sessionToken;

      if (!sessionToken) {
        throw new Error("Session token not available (already consumed)");
      }

      const response = await completeSession(
        "pixeltype",
        state.session.id,
        {
          session_token: sessionToken,
          best_score: finalScore,
          data: telemetryData,
          metadata: { completed_at: new Date().toISOString() },
        },
        { token: state.authToken, gameToken }
      );

      if (response.success && response.data) {
        dispatch({ type: "SESSION_COMPLETED" });
        return response.data.result;
      } else {
        throw new Error(response.message || "Failed to complete session");
      }
    } catch (err) {
      console.error("[P2R] Session completion failed:", err);
      throw err;
    }
  }, [state.session, state.authToken, getValidGameToken]);

  // Economy
  const spendCoins = useCallback(async (actionCode) => {
    if (!state.authToken || !state.session) {
      throw new Error("Not authenticated or no active session");
    }

    dispatch({ type: "ECONOMY_LOADING" });

    try {
      const gameToken = await getValidGameToken();
      const idempotencyKey = `economy_${actionCode}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const response = await spendAction(
        "pixeltype",
        {
          action_code: actionCode,
          session_id: state.session.id,
          event_id: state.session.eventId,
          idempotency_key: idempotencyKey,
        },
        { token: state.authToken, gameToken }
      );

      if (response.success && response.data) {
        dispatch({
          type: "ECONOMY_SUCCESS",
          payload: { balanceAfter: response.data.transaction.balance_after },
        });
        return response.data.transaction;
      } else {
        throw new Error(response.message || "Economy action failed");
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err.message || "Economy action failed";
      dispatch({ type: "ECONOMY_ERROR", payload: message });
      throw err;
    }
  }, [state.authToken, state.session, getValidGameToken]);

  // Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    dispatch({ type: "LEADERBOARD_LOADING" });

    try {
      let gameToken = null;
      if (state.authToken) {
        try {
          gameToken = await getValidGameToken();
        } catch (e) {
          console.warn("[P2R] Could not get game token for leaderboard:", e);
        }
      }

      const event = state.authToken ? await fetchActiveEvent() : null;
      const params = event?.id ? { event_id: event.id } : undefined;

      const response = await getLeaderboard("pixeltype", params, {
        token: state.authToken || undefined,
        gameToken: gameToken || undefined,
      });

      if (response.success && response.data) {
        dispatch({ type: "SET_LEADERBOARD", payload: response.data });
        return response.data;
      } else {
        throw new Error(response.message || "Failed to fetch leaderboard");
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err.message || "Failed to fetch leaderboard";
      dispatch({ type: "LEADERBOARD_ERROR", payload: message });
      throw err;
    }
  }, [state.authToken, getValidGameToken, fetchActiveEvent]);

  // Wallet
  const fetchWallet = useCallback(async () => {
    if (!state.authToken) return;

    try {
      const response = await getWallet({ token: state.authToken });
      if (response.success && response.data) {
        dispatch({ type: "UPDATE_COINS", payload: response.data.balance });
      }
    } catch (err) {
      console.error("[P2R] Wallet fetch failed:", err);
    }
  }, [state.authToken]);

  // Auth initialization
  useEffect(() => {
    const token = localStorage.getItem("p2r_auth_token");
    const userStr = localStorage.getItem("p2r_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        dispatch({ type: "SET_AUTH", payload: { token, user } });
      } catch (err) {
        localStorage.removeItem("p2r_auth_token");
        localStorage.removeItem("p2r_user");
      }
    } else if (token) {
      // Validate token with /me
      getMe({ token })
        .then((res) => {
          if (res.success && res.data) {
            localStorage.setItem("p2r_user", JSON.stringify(res.data.user));
            dispatch({ type: "SET_AUTH", payload: { token, user: res.data.user } });
            fetchWallet();
          } else {
            localStorage.removeItem("p2r_auth_token");
          }
        })
        .catch(() => {
          localStorage.removeItem("p2r_auth_token");
        });
    }
  }, []);

  // Fetch wallet on auth
  useEffect(() => {
    if (state.isAuthenticated) {
      fetchWallet();
    }
  }, [state.isAuthenticated, fetchWallet]);

  const startGame = useCallback(() => dispatch({ type: "START_GAME" }), []);
  const tick = useCallback(() => dispatch({ type: "TICK" }), []);
  const incrementCombo = useCallback(() => dispatch({ type: "INCREMENT_COMBO" }), []);
  const resetCombo = useCallback(() => dispatch({ type: "RESET_COMBO" }), []);
  const updateTypingStats = useCallback(
    (stats) => dispatch({ type: "UPDATE_TYPING_STATS", payload: stats }),
    []
  );
  const recordRound = useCallback(
    (roundData) => dispatch({ type: "RECORD_ROUND", payload: roundData }),
    []
  );
  const nextRound = useCallback(() => dispatch({ type: "NEXT_ROUND" }), []);
  const endGame = useCallback(() => dispatch({ type: "END_GAME" }), []);
  const resetGame = useCallback(() => dispatch({ type: "RESET_GAME" }), []);

  const value = {
    state,
    dispatch,
    // Auth
    login: async (email, password) => {
      try {
        const response = await login({ email, password });
        if (response.success && response.data) {
          const { token, user } = response.data;
          localStorage.setItem("p2r_auth_token", token);
          localStorage.setItem("p2r_user", JSON.stringify(user));
          dispatch({ type: "SET_AUTH", payload: { token, user } });
          await fetchWallet();
          return { success: true };
        } else {
          return { success: false, error: response.message || "Login gagal" };
        }
      } catch (err) {
        if (isApiError(err)) {
          return { success: false, error: err.message };
        }
        return { success: false, error: "Terjadi kesalahan saat login" };
      }
    },
    logout: async () => {
      try {
        await logout({ token: state.authToken });
      } catch (err) {
        console.error("Logout error:", err);
      } finally {
        localStorage.removeItem("p2r_auth_token");
        localStorage.removeItem("p2r_user");
        dispatch({ type: "CLEAR_AUTH" });
      }
    },
    setLanguage: (lang) => dispatch({ type: "SET_LANGUAGE", payload: lang }),

    // Gameplay (original)
    startGame,
    tick,
    incrementCombo,
    resetCombo,
    updateTypingStats,
    recordRound,
    nextRound,
    endGame,
    resetGame,

    // P2R Integration
    getValidGameToken,
    fetchActiveEvent,
    startP2RSession,
    completeP2RSession,
    spendCoins,
    fetchLeaderboard,
    fetchWallet,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}