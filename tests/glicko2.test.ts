import { describe, expect, it } from 'vitest';
import { update, decayForInactivity, expectedScore } from '../src/core/rating/glicko2';
import { ratingRange, confidenceOf } from '../src/core/rating/display';

describe('Glicko-2', () => {
  it('reproduces Glickman’s published example', () => {
    const r = update(
      { r: 1500, rd: 200, vol: 0.06 },
      [
        { opponent: { r: 1400, rd: 30 }, score: 1 },
        { opponent: { r: 1550, rd: 100 }, score: 0 },
        { opponent: { r: 1700, rd: 300 }, score: 0 },
      ],
      { minRd: 0 },
    );
    expect(r.r).toBeCloseTo(1464.06, 1);
    expect(r.rd).toBeCloseTo(151.52, 1);
    expect(r.vol).toBeCloseTo(0.05999, 4);
  });

  it('a win raises, a loss lowers, and RD shrinks with games', () => {
    const p = { r: 1000, rd: 350, vol: 0.06 };
    const w = update(p, [{ opponent: { r: 1000, rd: 60 }, score: 1 }]);
    const l = update(p, [{ opponent: { r: 1000, rd: 60 }, score: 0 }]);
    expect(w.r).toBeGreaterThan(1000);
    expect(l.r).toBeLessThan(1000);
    expect(w.rd).toBeLessThan(350);
  });

  it('inactivity widens uncertainty', () => {
    const p = { r: 1200, rd: 60, vol: 0.06 };
    expect(decayForInactivity(p, 120).rd).toBeGreaterThan(60);
  });

  it('expected score is symmetric', () => {
    const a = { r: 1300, rd: 80 };
    const b = { r: 1100, rd: 120 };
    expect(expectedScore(a, b) + expectedScore(b, a)).toBeCloseTo(1, 6);
  });

  it('never shows a point estimate while uncertainty is high', () => {
    expect(ratingRange({ r: 1000, rd: 350, vol: 0.06 }).point).toBeNull();
    expect(confidenceOf(300)).toBe('very-low');
    const settled = ratingRange({ r: 1234, rd: 60, vol: 0.06 });
    expect(settled.point).toBe(1234);
    expect(settled.lo).toBeLessThan(1234);
    expect(settled.hi).toBeGreaterThan(1234);
  });
});
