import { describe, expect, it } from 'vitest';
import { newSkill, review, statusOf, retention, dailyQueue } from '../src/core/training/srs';

const DAY = 86_400_000;

describe('spaced repetition & mastery', () => {
  it('intervals grow with successes and reset on failure', () => {
    let s = newSkill('tactic.fork', 0);
    s = review(s, 1, 0);
    expect(s.intervalDays).toBe(1);
    s = review(s, 1, DAY);
    expect(s.intervalDays).toBe(3);
    s = review(s, 1, 4 * DAY);
    expect(s.intervalDays).toBeGreaterThan(3);
    s = review(s, 0, 20 * DAY);
    expect(s.intervalDays).toBe(0);
    expect(s.due).toBeLessThan(20 * DAY + DAY);
  });

  it('becomes mastered, then due, then forgotten over time', () => {
    let s = newSkill('mate.one', 0);
    s = review(s, 1, 0);
    s = review(s, 1, DAY);
    s = review(s, 1, 2 * DAY);
    expect(statusOf(s, 2 * DAY + 1000)).toBe('mastered');
    expect(statusOf(s, s.due + 1)).toBe('due');
    expect(statusOf(s, 2 * DAY + 120 * DAY)).toBe('forgotten');
    expect(retention(s, 2 * DAY)).toBeCloseTo(1, 5);
  });

  it('daily queue prioritises weak and forgotten skills', () => {
    const weak = review(newSkill('tactic.pin', 0), 0, 0);
    let strong = newSkill('mate.one', 0);
    for (let i = 0; i < 3; i++) strong = review(strong, 1, i * DAY);
    const q = dailyQueue([strong, weak], 3 * DAY);
    expect(q[0]).toBe('tactic.pin');
    expect(q).not.toContain('mate.one');
  });
});
