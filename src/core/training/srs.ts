import type { SkillId } from '../../content/types';

/**
 * Per-skill memory model: an SM-2-style interval scheduler plus an exponential forgetting
 * estimate, so the app can say what is mastered, what is due, and what has been forgotten.
 */
export interface SkillState {
  skill: SkillId;
  /** Exponentially weighted recent success (0–1). */
  strength: number;
  reps: number;
  intervalDays: number;
  ease: number;
  due: number;
  lastSeen: number;
  attempts: number;
  successes: number;
  everMastered: boolean;
}

export type SkillStatus = 'new' | 'learning' | 'mastered' | 'due' | 'forgotten';

const DAY = 86_400_000;

export function newSkill(skill: SkillId, now = Date.now()): SkillState {
  return { skill, strength: 0, reps: 0, intervalDays: 0, ease: 2.3, due: now, lastSeen: 0, attempts: 0, successes: 0, everMastered: false };
}

/** quality: 1 = solved cleanly, 0.5–0.9 = solved with hints/slowly, 0 = failed. */
export function review(s: SkillState, quality: number, now = Date.now()): SkillState {
  const ok = quality >= 0.5;
  const strength = s.attempts === 0 ? quality : s.strength * 0.65 + quality * 0.35;
  let { reps, intervalDays, ease } = s;
  if (ok) {
    reps += 1;
    intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(intervalDays * ease);
    ease = Math.min(2.8, ease + (quality - 0.75) * 0.2);
  } else {
    reps = 0;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
  }
  const next: SkillState = {
    ...s,
    strength,
    reps,
    intervalDays,
    ease,
    lastSeen: now,
    due: ok ? now + intervalDays * DAY : now + 10 * 60_000,
    attempts: s.attempts + 1,
    successes: s.successes + (ok ? 1 : 0),
  };
  next.everMastered = s.everMastered || isMasteredNow(next, now);
  return next;
}

/** Estimated probability of still recalling the skill (forgetting curve). */
export function retention(s: SkillState, now = Date.now()): number {
  if (!s.lastSeen) return 0;
  const days = (now - s.lastSeen) / DAY;
  const stability = Math.max(0.5, s.intervalDays) * 1.5;
  return Math.exp(-days / stability);
}

function isMasteredNow(s: SkillState, now: number) {
  return s.strength >= 0.8 && s.reps >= 2 && retention(s, now) >= 0.6;
}

export function statusOf(s: SkillState | undefined, now = Date.now()): SkillStatus {
  if (!s || s.attempts === 0) return 'new';
  if (s.everMastered && retention(s, now) < 0.35) return 'forgotten';
  if (now >= s.due && s.reps > 0) return 'due';
  if (isMasteredNow(s, now)) return 'mastered';
  return 'learning';
}

/** Skills to train today: forgotten and due first, then the weakest ones in progress. */
export function dailyQueue(skills: SkillState[], now = Date.now(), max = 3): SkillId[] {
  const rank = (s: SkillState) => {
    const st = statusOf(s, now);
    return (st === 'forgotten' ? 0 : st === 'due' ? 1 : st === 'learning' ? 2 : 3) + s.strength;
  };
  return skills
    .filter((s) => s.attempts > 0 && statusOf(s, now) !== 'mastered')
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, max)
    .map((s) => s.skill);
}
