/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Daftar kata bahasa Indonesia (~100 kata)
export const wordsID = [
  "angin", "angkasa", "arah", "awan", "bintang", "bumi", "cahaya", "cakrawala",
  "cepat", "detik", "fajar", "galaksi", "gerak", "gravitasi", "hebat", "huruf",
  "irama", "jarak", "jemari", "juara", "kabar", "kalimat", "kapsul", "kecepatan",
  "kilat", "komputer", "kosmik", "langit", "layar", "lensa", "lintas", "logika",
  "masa", "mesin", "meteor", "mimpi", "modul", "musim", "nada", "navigasi",
  "negeri", "nomor", "orbit", "padang", "pantul", "pasti", "pemain", "pesawat",
  "pijar", "planet", "presisi", "pukul", "radar", "radiasi", "rahasia", "rekor",
  "ritme", "roket", "ruang", "satelit", "selaras", "sinar", "sinyal", "sistem",
  "skor", "solusi", "stasiun", "suara", "tangkas", "tata", "tekan", "tepat",
  "terbang", "teropong", "tinggi", "titik", "tombol", "tuntas", "uji", "udara",
  "unggul", "vektor", "waktu", "warna", "wawasan", "yakin", "zona", "fokus",
  "kilau", "lintasan", "nebula", "pulsar", "semesta", "sensor", "zenit", "pola",
  "tangkas", "wadidaw", "astaga", "bagus"
];

// Daftar kata bahasa Inggris (~100 kata)
export const wordsEN = [
  "action", "alien", "alpha", "arcade", "asteroid", "astro", "atomic", "beam",
  "binary", "booster", "burst", "capsule", "circuit", "comet", "control", "core",
  "cosmic", "cosmos", "cyber", "datum", "delta", "drift", "drive", "energy",
  "engine", "escape", "flare", "flight", "focus", "force", "future", "galaxy",
  "gravity", "hyper", "input", "inter", "jump", "kinetic", "laser", "launch",
  "light", "logic", "lunar", "matrix", "matter", "meteor", "mission", "module",
  "motion", "nebula", "neon", "neutron", "nova", "orbit", "photon", "pilot",
  "pixel", "planet", "plasma", "portal", "power", "precision", "pulse", "quantum",
  "radar", "radius", "rocket", "rotate", "satellite", "scan", "sector", "sensor",
  "shield", "shuttle", "signal", "solar", "sonic", "spark", "speed", "stellar",
  "stream", "surge", "syntax", "system", "terminal", "thrust", "time", "titan",
  "track", "trajectory", "travel", "turbo", "type", "vacuum", "vector", "velocity",
  "vortex", "warp", "wave", "zenith"
];

// Contoh kalimat default sesuai dokumen layout
export const sampleTextID =
  "Ini contoh text jadi sekali lagi ini contoh text yg bagus sekali wadidaw astaga ngerinya";

export const sampleTextEN =
  "Typing at the speed of cosmic light through planetary orbits and neon nebulae across galaxies";

/**
 * Generate string teks dari kamus kata
 */
export function generateTypingSentence(language = "IND", count = 14) {
  const dictionary = language === "ENG" ? wordsEN : wordsID;
  const selected = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * dictionary.length);
    selected.push(dictionary[randomIndex]);
  }
  return selected.join(" ");
}
