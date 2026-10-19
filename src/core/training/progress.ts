import type { Puzzle, SkillId } from '../../content/types';
import type { LevelDef, WorldDef } from '../../content/curriculum';
import { emptyLevel, type GameRecord, type NotebookEntry, type Profile, type PuzzleLogEntry } from '../../storage/profile';
import { newSkill, review, statusOf, dailyQueue, type SkillStatus } from './srs';
import { update, type Rating } from '../rating/glicko2';
import type { Color, ResultCode } from '../chess/game';
import type { Rng } from '../engine/botMove';

const BOT_RD = 120;

export function levelProgress(p: Profile, id: string) {
  return p.levels[id] ?? emptyLevel();
}

export function isLevelUnlocked(p: Profile, world: WorldDef, level: LevelDef): boolean {
  if (!world.available) return false;
  if (level.index === 1) return world.index === 1 || isWorldComplete(p, world);
  const prev = world.levels.find((lv) => lv.index === level.index - 1);
  return !!prev && levelProgress(p, prev.id).passed;
}

export function isWorldComplete(p: Profile, w: WorldDef): boolean {
  return w.available && w.levels.length > 0 && w.levels.every((lv) => levelProgress(p, lv.id).passed);
}

export function worldPercent(p: Profile, w: WorldDef): number {
  if (!w.levels.length) return 0;
  let steps = 0;
  for (const lv of w.levels) {
    const pr = levelProgress(p, lv.id);
    steps += (pr.lessonDone ? 1 : 0) + (pr.exampleDone ? 1 : 0) + (pr.exercisesDone.length >= lv.exercises.length ? 1 : 0) + (pr.matchPlayed ? 1 : 0) + (pr.passed ? 1 : 0);
  }
  return Math.round((steps / (w.levels.length * 5)) * 100);
}

export function currentLevel(p: Profile, worlds: WorldDef[]): { world: WorldDef; level: LevelDef } | null {
  for (const w of worlds) {
    if (!w.available) continue;
    for (const lv of w.levels) if (!levelProgress(p, lv.id).passed && isLevelUnlocked(p, w, lv)) return { world: w, level: lv };
  }
  return null;
}

/** A level is passed with the mastery score at/above the threshold AND the level match played. */
export function evaluateLevelPass(p: Profile, level: LevelDef, now = Date.now()): Profile {
  const pr = levelProgress(p, level.id);
  const passed = pr.passed || (pr.masteryBest >= level.passRatio && pr.matchPlayed);
  if (passed === pr.passed) return p;
  return { ...p, levels: { ...p.levels, [level.id]: { ...pr, passed, passedAt: now } } };
}

export function patchLevel(p: Profile, id: string, patch: Partial<ReturnType<typeof emptyLevel>>): Profile {
  return { ...p, levels: { ...p.levels, [id]: { ...levelProgress(p, id), ...patch } } };
}

/** Picks mastery-test questions, preferring ones not already practised as exercises. */
export function pickMasteryQuestions(level: LevelDef, rng: Rng): string[] {
  const fresh = level.masteryPool.filter((id) => !level.exercises.includes(id));
  const reused = level.masteryPool.filter((id) => level.exercises.includes(id));
  const shuffle = (a: string[]) => a.map((x) => [rng(), x] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  return [...shuffle(fresh), ...shuffle(reused)].slice(0, level.masteryCount);
}

export function puzzleQuality(ok: boolean, hints: number): number {
  if (!ok) return 0;
  return hints === 0 ? 1 : hints === 1 ? 0.75 : 0.5;
}

export function recordPuzzle(
  p: Profile,
  puzzle: Puzzle,
  r: { ok: boolean; hints: number; ms: number; context: PuzzleLogEntry['context'] },
  now = Date.now(),
): Profile {
  const q = puzzleQuality(r.ok, r.hints);
  const skills = { ...p.skills };
  for (const s of puzzle.skills) skills[s] = review(skills[s] ?? newSkill(s, now), q, now);
  const puzzleRating = r.context === 'diagnostic' ? p.puzzleRating : update(p.puzzleRating, [{ opponent: { r: puzzle.rating, rd: 90 }, score: q }]);
  let notebook = p.notebook;
  if (!r.ok && r.context !== 'diagnostic' && !notebook.some((n) => n.puzzleId === puzzle.id && !n.resolved)) {
    notebook = [...notebook, notebookFromPuzzle(puzzle, now)];
  }
  return {
    ...p,
    skills,
    puzzleRating,
    notebook,
    puzzleLog: [...p.puzzleLog, { id: puzzle.id, t: now, ok: r.ok, hints: r.hints, ms: r.ms, context: r.context }],
  };
}

function notebookFromPuzzle(p: Puzzle, now: number): NotebookEntry {
  return { id: `nb-${p.id}-${now}`, t: now, source: 'puzzle', fen: p.fen, puzzleId: p.id, motifs: [], skills: p.skills, reviews: 0, successes: 0, due: now, resolved: false };
}

const DAY = 86_400_000;

export function reviewNotebook(p: Profile, id: string, ok: boolean, now = Date.now()): Profile {
  return {
    ...p,
    notebook: p.notebook.map((n) => {
      if (n.id !== id) return n;
      const successes = n.successes + (ok ? 1 : 0);
      const interval = ok ? [1, 3, 7, 21][Math.min(successes - 1, 3)] * DAY : 10 * 60_000;
      return { ...n, reviews: n.reviews + 1, successes, due: now + interval, resolved: successes >= 3 };
    }),
  };
}

export function scoreFor(result: ResultCode, color: Color): number {
  if (result === '1/2-1/2') return 0.5;
  return (result === '1-0') === (color === 'w') ? 1 : 0;
}

/** Glicko-2 update for one rated game against a bot (bot RD reflects calibration uncertainty). */
export function rateGame(rating: Rating, botNominal: number, score: number): Rating {
  return update(rating, [{ opponent: { r: botNominal, rd: BOT_RD }, score }]);
}

export function addGame(p: Profile, g: GameRecord): Profile {
  const history = g.rated ? [...p.ratingHistory, { t: g.t, r: g.ratingAfter.r, rd: g.ratingAfter.rd, source: 'game' as const }] : p.ratingHistory;
  return { ...p, games: [...p.games, g], rating: g.rated ? g.ratingAfter : p.rating, ratingHistory: history, activeGame: undefined };
}

export function skillStatuses(p: Profile, now = Date.now()): Record<SkillId, SkillStatus> {
  return Object.fromEntries(Object.entries(p.skills).map(([k, s]) => [k, statusOf(s, now)])) as Record<SkillId, SkillStatus>;
}

export function masteredCount(p: Profile, now = Date.now()) {
  return Object.values(skillStatuses(p, now)).filter((s) => s === 'mastered').length;
}

/** Builds today’s session: due notebook items first, then puzzles for the weakest/due skills. */
export function buildDailySession(p: Profile, bank: Puzzle[], now = Date.now(), size = 6): { puzzles: string[]; notebook: string[]; skills: SkillId[] } {
  const notebook = p.notebook.filter((n) => !n.resolved && n.due <= now).slice(0, 2).map((n) => n.id);
  let skills = dailyQueue(Object.values(p.skills), now);
  if (skills.length === 0) skills = [...new Set(bank.flatMap((b) => b.skills))].filter((s) => !p.skills[s]).slice(0, 2);
  const seen = new Map<string, number>();
  for (const e of p.puzzleLog) seen.set(e.id, e.t);
  const target = p.puzzleRating.r;
  const pool = bank
    .filter((b) => b.skills.some((s) => skills.includes(s)))
    .sort((a, b) => (seen.get(a.id) ?? 0) - (seen.get(b.id) ?? 0) || Math.abs(a.rating - target) - Math.abs(b.rating - target));
  return { puzzles: pool.slice(0, size - notebook.length).map((x) => x.id), notebook, skills };
}
