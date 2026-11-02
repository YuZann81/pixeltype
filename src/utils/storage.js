/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEYS = {
  USER: "pixeltype_user",
  LANGUAGE: "pixeltype_language",
  HISTORY: "pixeltype_history",
  LEADERBOARD: "pixeltype_leaderboard",
};

// Default seed data leaderboard jika belum ada
const DEFAULT_LEADERBOARD = [
  { rank: 1, nick: "Arya", schoolClass: "XII RPL 1", score: 980, wpm: 98, acc: 99 },
  { rank: 2, nick: "Reza", schoolClass: "XI TKJ 2", score: 870, wpm: 87, acc: 96 },
  { rank: 3, nick: "Maya", schoolClass: "XII MM 3", score: 790, wpm: 79, acc: 95 },
  { rank: 4, nick: "Dimas", schoolClass: "XI RPL 2", score: 720, wpm: 72, acc: 94 },
  { rank: 5, nick: "Siti", schoolClass: "XII TKJ 1", score: 680, wpm: 68, acc: 93 },
  { rank: 6, nick: "Fajar", schoolClass: "X PPLG 1", score: 640, wpm: 64, acc: 92 },
  { rank: 7, nick: "Nadia", schoolClass: "XI DKV 1", score: 610, wpm: 61, acc: 91 },
  { rank: 8, nick: "Budi", schoolClass: "XII AKL 2", score: 580, wpm: 58, acc: 90 },
  { rank: 9, nick: "Lestari", schoolClass: "XI OTKP 3", score: 550, wpm: 55, acc: 89 },
  { rank: 10, nick: "Kevin", schoolClass: "X PPLG 2", score: 520, wpm: 52, acc: 88 },
];

export function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return { nick: "Guest", phone: "" };
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read user from storage:", err);
    return { nick: "Guest", phone: "" };
  }
}

export function setUser(user) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (err) {
    console.error("Failed to write user to storage:", err);
  }
}

export function getLanguage() {
  try {
    const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return lang === "ENG" ? "ENG" : "IND";
  } catch {
    return "IND";
  }
}

export function setLanguage(language) {
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  } catch (err) {
    console.error("Failed to write language to storage:", err);
  }
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addHistory(entry) {
  try {
    const history = getHistory();
    const updated = [{ ...entry, date: new Date().toISOString() }, ...history].slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to write history:", err);
  }
}

export function getLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(DEFAULT_LEADERBOARD));
      return DEFAULT_LEADERBOARD;
    }
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : DEFAULT_LEADERBOARD;
  } catch {
    return DEFAULT_LEADERBOARD;
  }
}

export function saveToLeaderboard(entry) {
  try {
    const current = getLeaderboard();
    const existingIndex = current.findIndex(
      (item) => item.nick.toLowerCase() === entry.nick.toLowerCase()
    );

    let updated = [...current];
    if (existingIndex >= 0) {
      if ((entry.score || 0) > (updated[existingIndex].score || 0)) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...entry,
          score: entry.score,
        };
      }
    } else {
      updated.push({
        nick: entry.nick,
        schoolClass: entry.schoolClass || "Player",
        score: entry.score,
        wpm: entry.wpm,
        acc: entry.acc,
      });
    }

    // Sort descending by score
    updated.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Assign ranks 1..N
    updated = updated.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Failed to update leaderboard:", err);
    return DEFAULT_LEADERBOARD;
  }
}
