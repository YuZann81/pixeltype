import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatPixelTypeTelemetry,
  validatePixelTypeTelemetry,
  ROUND_COUNT,
  ROUND_DURATION_SECONDS,
} from "../scoringAdapter.ts";

describe("PixelType Scoring Adapter Contract", () => {
  test("formats 3 complete rounds accurately and satisfies invariant", () => {
    const rawRounds = [
      { duration: 30, characters_typed: 150, correct_characters: 140, incorrect_characters: 10 },
      { duration: 30, characters_typed: 160, correct_characters: 155, incorrect_characters: 5 },
      { duration: 30, characters_typed: 140, correct_characters: 130, incorrect_characters: 10 },
    ];

    const telemetry = formatPixelTypeTelemetry(rawRounds, {
      language: "IND",
      finalScore: 4250,
    });

    assert.equal(telemetry.rounds.length, 3);
    assert.equal(telemetry.language, "id");
    assert.equal(telemetry.score, 4250);
    assert.equal(telemetry.total_characters, 450);
    assert.equal(telemetry.completion_time_ms, 90000);

    // Validate using backend rule validator
    assert.doesNotThrow(() => {
      validatePixelTypeTelemetry(telemetry);
    });
  });

  test("pads incomplete rounds to exactly 3 rounds with duration 30", () => {
    // Only 1 round was played
    const rawRounds = [
      { duration: 30, characters_typed: 120, correct_characters: 110, incorrect_characters: 10 },
    ];

    const telemetry = formatPixelTypeTelemetry(rawRounds, {
      language: "ENG",
      finalScore: 1100,
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
      { duration: 30, characters_typed: 100, correct_characters: 95, incorrect_characters: 999 }, // Inconsistent
      { duration: 30, characters_typed: 100, correct_characters: 100, incorrect_characters: 0 },
      { duration: 30, characters_typed: 100, correct_characters: 80, incorrect_characters: 0 }, // Inconsistent
    ];

    const telemetry = formatPixelTypeTelemetry(rawRounds);

    assert.equal(telemetry.rounds[0].incorrect_characters, 5); // 100 - 95 = 5
    assert.equal(telemetry.rounds[1].incorrect_characters, 0); // 100 - 100 = 0
    assert.equal(telemetry.rounds[2].incorrect_characters, 20); // 100 - 80 = 20

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
      () => {
        validatePixelTypeTelemetry(invalidTelemetry);
      },
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
      () => {
        validatePixelTypeTelemetry(invalidTelemetry);
      },
      {
        message: /Round \[2\] duration must be exactly 30 seconds/,
      }
    );
  });

  test("validatePixelTypeTelemetry rejects inconsistent character counts", () => {
    const invalidTelemetry = {
      rounds: [
        { duration: 30, characters_typed: 10, correct_characters: 8, incorrect_characters: 3 }, // 8 + 3 = 11 != 10
        { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
        { duration: 30, characters_typed: 10, correct_characters: 10, incorrect_characters: 0 },
      ],
      language: "id",
    };

    assert.throws(
      () => {
        validatePixelTypeTelemetry(invalidTelemetry);
      },
      {
        message: /character count inconsistency/,
      }
    );
  });
});
