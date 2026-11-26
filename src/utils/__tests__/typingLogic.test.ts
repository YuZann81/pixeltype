import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateWPM,
  calculateAccuracy,
  calculateScore,
  evaluateSegmentInput,
} from "../stats.js";
import {
  generateTypingSentence,
  sampleTextID,
  sampleTextEN,
} from "../../data/words.js";

describe("Typing Engine & Statistics Logic", () => {
  test("evaluateSegmentInput tracks normal typing and incorrect characters accurately", () => {
    const target = "pixel type";
    const res = evaluateSegmentInput("pixal ty", target);

    assert.equal(res.clampedInput, "pixal ty");
    assert.equal(res.typedChars, 8);
    assert.equal(res.correctChars, 7);
    assert.equal(res.incorrectChars, 1);
    assert.equal(res.isComplete, false);
  });

  test("evaluateSegmentInput handles Backspace after correct and incorrect input without inflation", () => {
    const target = "orbit";

    // Type "orx" (2 correct, 1 incorrect)
    const beforeBackspace = evaluateSegmentInput("orx", target);
    assert.equal(beforeBackspace.typedChars, 3);
    assert.equal(beforeBackspace.correctChars, 2);
    assert.equal(beforeBackspace.incorrectChars, 1);

    // Backspace incorrect 'x' -> "or" (2 correct, 0 incorrect)
    const afterBackspaceIncorrect = evaluateSegmentInput("or", target);
    assert.equal(afterBackspaceIncorrect.typedChars, 2);
    assert.equal(afterBackspaceIncorrect.correctChars, 2);
    assert.equal(afterBackspaceIncorrect.incorrectChars, 0);

    // Backspace correct 'r' -> "o" (1 correct, 0 incorrect)
    const afterBackspaceCorrect = evaluateSegmentInput("o", target);
    assert.equal(afterBackspaceCorrect.typedChars, 1);
    assert.equal(afterBackspaceCorrect.correctChars, 1);
    assert.equal(afterBackspaceCorrect.incorrectChars, 0);
  });

  test("evaluateSegmentInput handles multi-character input and clamps to target length", () => {
    const target = "nova";
    const res = evaluateSegmentInput("nova123", target);

    assert.equal(res.clampedInput, "nova");
    assert.equal(res.typedChars, 4);
    assert.equal(res.correctChars, 4);
    assert.equal(res.incorrectChars, 0);
    assert.equal(res.isComplete, true);
  });

  test("calculateWPM, calculateAccuracy, and calculateScore compute expected values", () => {
    assert.equal(calculateWPM(150, 30), 60);
    assert.equal(calculateWPM(0, 30), 0);
    assert.equal(calculateAccuracy(95, 100), 95);
    assert.equal(calculateAccuracy(0, 0), 100);
    assert.equal(calculateScore(60, 100, 10), 640);
  });

  test("generateTypingSentence never produces consecutive duplicate words", () => {
    for (const lang of ["IND", "ENG"]) {
      const sentence = generateTypingSentence(lang, 50);
      const words = sentence.split(" ");
      assert.equal(words.length, 50);
      for (let i = 1; i < words.length; i++) {
        assert.notEqual(words[i], words[i - 1], `Consecutive duplicate word found in ${lang}: ${words[i]}`);
      }
    }
  });

  test("sampleTextID does not contain placeholder slang", () => {
    assert.ok(sampleTextID.length > 30);
    assert.ok(!/wadidaw|astaga|contoh text/i.test(sampleTextID));
    assert.ok(sampleTextEN.length > 30);
  });
});
