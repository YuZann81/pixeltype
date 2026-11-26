import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePixelTypeSessionScore,
  formatPixelTypeTelemetry,
  validatePixelTypeTelemetry,
  MAX_P2R_SESSION_SCORE,
  ROUND_COUNT,
  ROUND_DURATION_SECONDS,
} from "../scoringAdapter.ts";

describe("PixelType Scoring Adapter Contract", () => {
  test("derives authoritative bounded session score (0..300) from 3 rounds within P2R 0..600 limit", () => {
    const rawRounds = [
      { duration: 30, characters_typed: 150, correct_characters: 140, incorrect_characters: 10 },
      { duration: 30, characters_typed: 160, correct_characters: 155, incorrect_characters: 5 },
      { duration: 30, characters_typed: 140, correct_characters: 130, incorrect_characters: 10 },
    ];

    const expectedScore = calculatePixelTypeSessionScore(rawRounds);
    const telemetry = formatPixelTypeTelemetry(rawRounds, {
      language: "IND",
    });

    assert.equal(telemetry.rounds.length, ROUND_COUNT);
    assert.equal(telemetry.language, "id");
    assert.equal(telemetry.score, expectedScore);
    assert.equal(telemetry.best_score, expectedScore);
    assert.ok(expectedScore > 0 && expectedScore <= 300 && expectedScore <= MAX_P2R_SESSION_SCORE);
    assert.equal(telemetry.total_characters, 450);
    assert.equal(telemetry.completion_time_ms, ROUND_COUNT * ROUND_DURATION_SECONDS * 1000);

    assert.doesNotThrow(() => {
      validatePixelTypeTelemetry(telemetry);
    });
  });

  test("accepts boundary scores 0, 300, and 600 without clamping", () => {
    const validRounds = [
      { duration: 30, characters_typed: 100, correct_characters: 100, incorrect_characters: 0 },
      { duration: 30, characters_typed: 100, correct_characters: 100, incorrect_characters: 0 },
      { duration: 30, characters_typed: 100, correct_characters: 100, incorrect_characters: 0 },
    ];

    for (const boundaryScore of [0, 300, 600]) {
      const telemetry = formatPixelTypeTelemetry(validRounds, {
        language: "ENG",
        finalScore: boundaryScore,
      });
      assert.equal(telemetry.score, boundaryScore);
      assert.equal(telemetry.best_score, boundaryScore);
      assert.doesNotThrow(() => validatePixelTypeTelemetry(telemetry));
    }
  });

  test("rejects scores exceeding P2R 600-point session limit instead of silently clamping", () => {
    const validRounds = [
      { duration: 30, characters_typed: 150, correct_characters: 150, incorrect_characters: 0 },
      { duration: 30, characters_typed: 150, correct_characters: 150, incorrect_characters: 0 },
      { duration: 30, characters_typed: 150, correct_characters: 150, incorrect_characters: 0 },
    ];

    for (const invalidScore of [600.01, 601, 4250]) {
      const telemetry = formatPixelTypeTelemetry(validRounds, {
        language: "IND",
        finalScore: invalidScore,
      });

      // Score is preserved verbatim (never silently clamped) so validator rejects it honestly
      assert.equal(telemetry.score, invalidScore);
      assert.throws(
        () => validatePixelTypeTelemetry(telemetry),
        {
          message: /exceeds P2R maximum allowed session score of 600/,
        }
      );
    }
  });

  test("rejects negative or non-finite scores", () => {
    const validRounds = [
      { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
      { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
      { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
    ];

    for (const badScore of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const telemetry = formatPixelTypeTelemetry(validRounds, { finalScore: badScore });
      assert.throws(
        () => validatePixelTypeTelemetry(telemetry),
        {
          message: /non-negative finite number/,
        }
      );
    }
  });

  test("pads incomplete rounds to exactly 3 rounds with duration 30", () => {
    const rawRounds = [
      { duration: 30, characters_typed: 120, correct_characters: 110, incorrect_characters: 10 },
    ];

    const telemetry = formatPixelTypeTelemetry(rawRounds, {
      language: "ENG",
    });

    assert.equal(telemetry.rounds.length, 3);
    assert.equal(telemetry.rounds[0].characters_typed, 120);
    assert.equal(telemetry.rounds[1].characters_typed, 0);
    assert.equal(telemetry.rounds[2].characters_typed, 0);

    for (const r of telemetry.rounds) {
      assert.equal(r.duration, 30);
      assert.equal(r.characters_typed, r.correct_characters + r.incorrect_characters);
    }

    assert.doesNotThrow(() => {
      validatePixelTypeTelemetry(telemetry);
    });
  });

  test("corrects round metrics if incorrect_characters drifted", () => {
    const rawRounds = [
      { duration: 30, characters_typed: 100, correct_characters: 95, incorrect_characters: 999 },
      { duration: 30, characters_typed: 100, correct_characters: 100, incorrect_characters: 0 },
      { duration: 30, characters_typed: 100, correct_characters: 80, incorrect_characters: 0 },
    ];

    const telemetry = formatPixelTypeTelemetry(rawRounds);

    assert.equal(telemetry.rounds[0].incorrect_characters, 5);
    assert.equal(telemetry.rounds[1].incorrect_characters, 0);
    assert.equal(telemetry.rounds[2].incorrect_characters, 20);

    assert.doesNotThrow(() => {
      validatePixelTypeTelemetry(telemetry);
    });
  });

  test("validatePixelTypeTelemetry rejects invalid round count", () => {
    const invalidTelemetry = {
      rounds: [
        { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
        { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
      ],
      language: "id",
    };

    assert.throws(
      () => validatePixelTypeTelemetry(invalidTelemetry),
      {
        message: /PixelType telemetry requires exactly 3 rounds/,
      }
    );
  });

  test("validatePixelTypeTelemetry rejects duration not equal to 30", () => {
    const invalidTelemetry = {
      rounds: [
        { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
        { duration: 45, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
        { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
      ],
      language: "id",
    };

    assert.throws(
      () => validatePixelTypeTelemetry(invalidTelemetry),
      {
        message: /Round \[2\] duration must be exactly 30 seconds/,
      }
    );
  });

  test("validatePixelTypeTelemetry rejects inconsistent character counts", () => {
    const invalidTelemetry = {
      rounds: [
        { duration: 30, characters_typed: 10, correct_characters: 8, incorrect_characters: 3 },
        { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
        { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
      ],
      language: "id",
    };

    assert.throws(
      () => validatePixelTypeTelemetry(invalidTelemetry),
      {
        message: /character count inconsistency/,
      }
    );
  });
});
