import { DIAG_CATEGORIES, type DiagCategory, type Puzzle } from '../../content/types';
import { update, type Rating } from '../rating/glicko2';

export type Experience = 'new' | 'rules' | 'casual' | 'club';

export const EXPERIENCE_START: Record<Experience, number> = { new: 600, rules: 850, casual: 1150, club: 1500 };

/** Puzzle evidence alone never claims more certainty than this RD (≈ ±400 at 95%). */
export const PUZZLE_ONLY_MIN_RD = 200;
const PUZZLE_RD = 90;
const STEP = 200;
export const DIAG_ROUNDS = 2;

export interface DiagAttempt {
  puzzleId: string;
  category: DiagCategory;
  rating: number;
  correct: boolean;
  hintsUsed: number;
  timeMs: number;
  timedOut: boolean;
}

export interface DiagState {
  experience: Experience;
  attempts: DiagAttempt[];
  targets: Record<DiagCategory, number>;
  estimate: Rating;
  startedAt: number;
  finishedAt?: number;
}

export function createDiagnostic(experience: Experience, now = Date.now()): DiagState {
  const start = EXPERIENCE_START[experience];
  return {
    experience,
    attempts: [],
    targets: Object.fromEntries(DIAG_CATEGORIES.map((c) => [c, start])) as Record<DiagCategory, number>,
    estimate: { r: start, rd: 350, vol: 0.06 },
    startedAt: now,
  };
}

/**
 * Evidence weight of one answer. Accuracy dominates; hints reduce credit; slowness only
 * matters a little (and only matters fully in the time-pressure category, via the time limit).
 */
export function evidenceScore(a: DiagAttempt, expectedMs = 60_000): number {
  if (!a.correct || a.timedOut) return 0;
  let s = a.hintsUsed === 0 ? 1 : a.hintsUsed === 1 ? 0.7 : 0.4;
  if (a.category !== 'time' && a.timeMs > expectedMs * 3) s *= 0.9;
  return s;
}

export function nextPuzzle(state: DiagState, bank: Puzzle[]): Puzzle | null {
  const used = new Set(state.attempts.map((a) => a.puzzleId));
  const total = DIAG_ROUNDS * DIAG_CATEGORIES.length;
  for (let i = state.attempts.length; i < total; i++) {
    const cat = DIAG_CATEGORIES[i % DIAG_CATEGORIES.length];
    const doneInCat = state.attempts.filter((a) => a.category === cat).length;
    if (doneInCat > Math.floor(i / DIAG_CATEGORIES.length)) continue;
    const pool = bank.filter((p) => p.category === cat && !used.has(p.id));
    if (pool.length === 0) continue;
    const target = state.targets[cat];
    pool.sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target) || a.rating - b.rating);
    return pool[0];
  }
  return null;
}

export function recordAttempt(state: DiagState, a: DiagAttempt): DiagState {
  const score = evidenceScore(a);
  const next = update(state.estimate, [{ opponent: { r: a.rating, rd: PUZZLE_RD }, score }], {
    minRd: PUZZLE_ONLY_MIN_RD,
  });
  const delta = score >= 0.99 ? STEP : score > 0 ? STEP / 2 : -STEP;
  return {
    ...state,
    attempts: [...state.attempts, a],
    targets: { ...state.targets, [a.category]: Math.max(300, state.targets[a.category] + delta) },
    estimate: next,
  };
}

export interface CategorySummary {
  category: DiagCategory;
  attempts: number;
  correct: number;
  hints: number;
  avgTimeMs: number;
  /** Performance on the in-game difficulty scale (only meaningful relative to other categories). */
  performance: number;
}

export function summarizeCategories(state: DiagState): CategorySummary[] {
  return DIAG_CATEGORIES.map((category) => {
    const as = state.attempts.filter((a) => a.category === category);
    const perf = as.length
      ? as.reduce((s, a) => s + a.rating + (evidenceScore(a) - 0.5) * 400, 0) / as.length
      : NaN;
    return {
      category,
      attempts: as.length,
      correct: as.filter((a) => a.correct && !a.timedOut).length,
      hints: as.reduce((s, a) => s + a.hintsUsed, 0),
      avgTimeMs: as.length ? as.reduce((s, a) => s + a.timeMs, 0) / as.length : 0,
      performance: perf,
    };
  });
}
