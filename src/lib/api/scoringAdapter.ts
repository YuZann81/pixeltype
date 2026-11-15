/**
 * Authoritative scoring formatter & validator for PixelType.
 * Conforms strictly to P2R backend PixelTypeScoringAdapter:
 * - Exactly 3 rounds (duration: 30)
 * - Each round: characters_typed, correct_characters, incorrect_characters
 * - Invariant: characters_typed === correct_characters + incorrect_characters
 * - Computed outputs: accuracy, net_wpm, total_characters, completion_time_ms
 */

export interface PixelTypeRoundTelemetry {
  round?: number;
  duration: number;
  characters_typed: number;
  correct_characters: number;
  incorrect_characters: number;
}

export interface PixelTypeTelemetryPayload {
  rounds: PixelTypeRoundTelemetry[];
  language: string;
  score?: number;
  best_score?: number;
  overall_score?: number;
  accuracy?: number;
  net_wpm?: number;
  total_characters?: number;
  completion_time_ms?: number;
}

export const ROUND_COUNT = 3;
export const ROUND_DURATION_SECONDS = 30;

/**
 * Formats raw round history into authoritative PixelType telemetry payload.
 * Guarantees exactly 3 rounds, duration 30, and the characters_typed invariant.
 */
export function formatPixelTypeTelemetry(
  rawRounds: Array<Partial<PixelTypeRoundTelemetry>>,
  options: {
    language?: string;
    finalScore?: number;
  } = {}
): PixelTypeTelemetryPayload {
  const language = (options.language || "IND").toUpperCase();
  const langCode = language === "IND" ? "id" : language.toLowerCase();
  const finalScore = Math.max(0, Math.round(options.finalScore ?? 0));

  const rounds: PixelTypeRoundTelemetry[] = [];

  for (let i = 0; i < ROUND_COUNT; i++) {
    const raw = rawRounds[i] || {};
    const charsTyped = Math.max(0, Math.floor(raw.characters_typed ?? 0));
    const correctChars = Math.min(charsTyped, Math.max(0, Math.floor(raw.correct_characters ?? 0)));
    const incorrectChars = charsTyped - correctChars;

    rounds.push({
      round: i + 1,
      duration: ROUND_DURATION_SECONDS,
      characters_typed: charsTyped,
      correct_characters: correctChars,
      incorrect_characters: incorrectChars,
    });
  }

  const totalChars = rounds.reduce((sum, r) => sum + r.characters_typed, 0);
  const totalCorrect = rounds.reduce((sum, r) => sum + r.correct_characters, 0);
  const totalIncorrect = rounds.reduce((sum, r) => sum + r.incorrect_characters, 0);
  const completionTimeMs = ROUND_COUNT * ROUND_DURATION_SECONDS * 1000; // 90000 ms

  const totalMinutes = completionTimeMs / 60000.0;
  const accuracy = totalChars > 0 ? Number(((totalCorrect / totalChars) * 100).toFixed(2)) : 0;
  const netWpm = totalMinutes > 0 ? Number((Math.max(0, (totalChars - totalIncorrect) / 5.0) / totalMinutes).toFixed(2)) : 0;

  return {
    rounds,
    language: langCode,
    score: finalScore,
    best_score: finalScore,
    overall_score: finalScore,
    accuracy,
    net_wpm: netWpm,
    total_characters: totalChars,
    completion_time_ms: completionTimeMs,
  };
}

/**
 * Validates a telemetry payload against PixelTypeScoringAdapter rules.
 * Throws an Error if any invariant is violated.
 */
export function validatePixelTypeTelemetry(payload: PixelTypeTelemetryPayload): void {
  if (!Array.isArray(payload.rounds)) {
    throw new Error("PixelType telemetry 'rounds' must be an array");
  }

  if (payload.rounds.length !== ROUND_COUNT) {
    throw new Error(`PixelType telemetry requires exactly ${ROUND_COUNT} rounds, received ${payload.rounds.length}`);
  }

  for (let i = 0; i < payload.rounds.length; i++) {
    const r = payload.rounds[i];
    const roundNum = i + 1;

    if (r.duration !== ROUND_DURATION_SECONDS) {
      throw new Error(`Round [${roundNum}] duration must be exactly ${ROUND_DURATION_SECONDS} seconds`);
    }

    if (r.characters_typed < 0 || r.correct_characters < 0 || r.incorrect_characters < 0) {
      throw new Error(`Round [${roundNum}] character metrics cannot be negative`);
    }

    if (r.characters_typed !== (r.correct_characters + r.incorrect_characters)) {
      throw new Error(
        `Round [${roundNum}] character count inconsistency: characters_typed (${r.characters_typed}) must equal correct (${r.correct_characters}) + incorrect (${r.incorrect_characters})`
      );
    }
  }

  if (payload.score !== undefined && (typeof payload.score !== "number" || isNaN(payload.score) || payload.score < 0)) {
    throw new Error("Game score must be a non-negative finite number");
  }
}
