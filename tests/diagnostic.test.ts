import { describe, expect, it } from 'vitest';
import { createDiagnostic, nextPuzzle, recordAttempt, evidenceScore, PUZZLE_ONLY_MIN_RD } from '../src/core/diagnostic/diagnostic';
import { DIAGNOSTIC_PUZZLES } from '../src/content/puzzles';

function run(answer: (rating: number) => boolean, exp: 'new' | 'club' = 'new') {
  let s = createDiagnostic(exp, 0);
  for (let p = nextPuzzle(s, DIAGNOSTIC_PUZZLES); p; p = nextPuzzle(s, DIAGNOSTIC_PUZZLES)) {
    s = recordAttempt(s, {
      puzzleId: p.id,
      category: p.category!,
      rating: p.rating,
      correct: answer(p.rating),
      hintsUsed: 0,
      timeMs: 10_000,
      timedOut: false,
    });
  }
  return s;
}

describe('adaptive diagnostic', () => {
  it('covers all eight categories, twice, without repeats', () => {
    const s = run(() => true);
    expect(s.attempts.length).toBe(16);
    expect(new Set(s.attempts.map((a) => a.puzzleId)).size).toBe(16);
    expect(new Set(s.attempts.map((a) => a.category)).size).toBe(8);
  });

  it('gets harder after correct answers and easier after wrong ones', () => {
    const strong = run(() => true);
    const weak = run(() => false, 'club');
    const avg = (s: typeof strong) => s.attempts.slice(8).reduce((x, a) => x + a.rating, 0) / 8;
    expect(avg(strong)).toBeGreaterThan(strong.attempts.slice(0, 8).reduce((x, a) => x + a.rating, 0) / 8);
    expect(avg(weak)).toBeLessThan(weak.attempts.slice(0, 8).reduce((x, a) => x + a.rating, 0) / 8);
  });

  it('separates a simulated 1400 solver from a simulated 700 solver', () => {
    const p1400 = run((r) => r <= 1400);
    const p700 = run((r) => r <= 700);
    expect(p1400.estimate.r - p700.estimate.r).toBeGreaterThan(300);
  });

  it('never reports puzzle-only estimates as high confidence', () => {
    expect(run(() => true).estimate.rd).toBeGreaterThanOrEqual(PUZZLE_ONLY_MIN_RD);
  });

  it('hints reduce credit; speed alone is not decisive', () => {
    const base = { puzzleId: 'x', category: 'mate' as const, rating: 800, correct: true, timedOut: false };
    expect(evidenceScore({ ...base, hintsUsed: 0, timeMs: 5000 })).toBe(1);
    expect(evidenceScore({ ...base, hintsUsed: 2, timeMs: 5000 })).toBeLessThan(0.5);
    expect(evidenceScore({ ...base, hintsUsed: 0, timeMs: 400_000 })).toBeGreaterThan(0.85);
  });
});
