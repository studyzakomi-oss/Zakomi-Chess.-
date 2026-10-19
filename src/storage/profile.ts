import type { Lang, SkillId } from '../content/types';
import type { Rating } from '../core/rating/glicko2';
import type { DiagState, Experience } from '../core/diagnostic/diagnostic';
import type { SkillState } from '../core/training/srs';
import type { BotId } from '../core/engine/botProfiles';
import type { ErrorType, MoveClass, Motif, PhaseStats } from '../core/engine/analysis';
import type { Phase, ResultCode, EndReason, Color } from '../core/chess/game';

export const PROFILE_VERSION = 1;

export interface Settings {
  lang: Lang;
  sound: boolean;
  showLegal: boolean;
  showThreats: boolean;
  theme: 'dark' | 'light';
  difficulty: 'adaptive' | 'easier' | 'harder';
  clock: 'none' | '10+0' | '5+3' | '15+10';
}

export interface LevelProgress {
  lessonDone: boolean;
  exampleDone: boolean;
  exercisesDone: string[];
  matchPlayed: boolean;
  matchResult?: ResultCode;
  masteryBest: number;
  masteryAttempts: number;
  passed: boolean;
  passedAt?: number;
}

export interface AnalysisSummary {
  accuracy: number;
  counts: Record<MoveClass, number>;
  errorTypes: Record<ErrorType, number>;
  byPhase: Record<Phase, PhaseStats>;
  hungPieces: number;
  depth: number;
}

export type GameMode = 'placement' | 'level' | 'free';

export interface GameRecord {
  id: string;
  t: number;
  mode: GameMode;
  levelId?: string;
  bot: BotId;
  botNominal: number;
  playerColor: Color;
  startFen: string;
  moves: string[];
  times: number[];
  result: ResultCode;
  reason: EndReason;
  ratingBefore: Rating;
  ratingAfter: Rating;
  /** True when the game counted toward the internal rating. */
  rated: boolean;
  analysis?: AnalysisSummary;
}

export interface ActiveGame {
  id: string;
  mode: GameMode;
  levelId?: string;
  bot: BotId;
  botNominal: number;
  playerColor: Color;
  startFen: string;
  moves: string[];
  times: number[];
  clockMs?: { w: number; b: number };
  incrementMs?: number;
  undosUsed: number;
  /** Training games allow undo and never affect the rating. */
  training?: boolean;
  startedAt: number;
}

export interface NotebookEntry {
  id: string;
  t: number;
  source: 'game' | 'puzzle';
  fen: string;
  played?: string;
  playedSan?: string;
  best?: string;
  bestSan?: string;
  puzzleId?: string;
  errorType?: ErrorType;
  motifs: Motif[];
  skills: SkillId[];
  gameId?: string;
  ply?: number;
  reviews: number;
  successes: number;
  due: number;
  resolved: boolean;
}

export interface PuzzleLogEntry {
  id: string;
  t: number;
  ok: boolean;
  hints: number;
  ms: number;
  context: 'diagnostic' | 'lesson' | 'mastery' | 'daily' | 'notebook';
}

export interface RatingPoint {
  t: number;
  r: number;
  rd: number;
  source: 'diagnostic' | 'game';
}

export interface Profile {
  version: number;
  name: string;
  avatar: string;
  createdAt: number;
  settings: Settings;
  onboarding: {
    experience?: Experience;
    diagnostic?: DiagState;
    placementGameIds: string[];
    completed: boolean;
  };
  rating: Rating;
  ratingHistory: RatingPoint[];
  puzzleRating: Rating;
  games: GameRecord[];
  levels: Record<string, LevelProgress>;
  skills: Partial<Record<SkillId, SkillState>>;
  puzzleLog: PuzzleLogEntry[];
  notebook: NotebookEntry[];
  activeGame?: ActiveGame;
  lastActive: number;
}

export function defaultSettings(lang: Lang = 'ar'): Settings {
  return { lang, sound: true, showLegal: true, showThreats: false, theme: 'dark', difficulty: 'adaptive', clock: 'none' };
}

export function newProfile(now = Date.now()): Profile {
  return {
    version: PROFILE_VERSION,
    name: 'Zakomi',
    avatar: 'zakomi',
    createdAt: now,
    settings: defaultSettings(),
    onboarding: { placementGameIds: [], completed: false },
    rating: { r: 1000, rd: 350, vol: 0.06 },
    ratingHistory: [],
    puzzleRating: { r: 1000, rd: 350, vol: 0.06 },
    games: [],
    levels: {},
    skills: {},
    puzzleLog: [],
    notebook: [],
    lastActive: now,
  };
}

export function emptyLevel(): LevelProgress {
  return { lessonDone: false, exampleDone: false, exercisesDone: [], matchPlayed: false, masteryBest: 0, masteryAttempts: 0, passed: false };
}

/** Validates/upgrades data loaded from storage or a backup file. Throws on garbage. */
export function migrate(raw: unknown): Profile {
  if (!raw || typeof raw !== 'object') throw new Error('invalid profile');
  const p = raw as Partial<Profile>;
  if (typeof p.version !== 'number' || p.version > PROFILE_VERSION) throw new Error('unsupported profile version');
  if (!p.rating || typeof p.rating.r !== 'number') throw new Error('invalid profile');
  const base = newProfile(p.createdAt ?? Date.now());
  return {
    ...base,
    ...p,
    version: PROFILE_VERSION,
    settings: { ...base.settings, ...(p.settings ?? {}) },
    onboarding: { ...base.onboarding, ...(p.onboarding ?? {}) },
    levels: p.levels ?? {},
    skills: p.skills ?? {},
    games: p.games ?? [],
    puzzleLog: p.puzzleLog ?? [],
    notebook: p.notebook ?? [],
    ratingHistory: p.ratingHistory ?? [],
  } as Profile;
}

export const STORAGE_KEY = 'zcd.profile.v1';

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function loadProfile(kv: KV): Profile | null {
  try {
    const s = kv.getItem(STORAGE_KEY);
    return s ? migrate(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

export function saveProfile(kv: KV, p: Profile) {
  const trimmed: Profile = {
    ...p,
    games: p.games.slice(-150),
    puzzleLog: p.puzzleLog.slice(-800),
    notebook: p.notebook.slice(-300),
  };
  kv.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function exportBackup(p: Profile): string {
  return JSON.stringify({ app: 'zakomi-chess-dimensions', exportedAt: new Date().toISOString(), profile: p }, null, 1);
}

export function importBackup(text: string): Profile {
  const data = JSON.parse(text);
  if (data?.app !== 'zakomi-chess-dimensions') throw new Error('not a ZAKOMI CHESS backup');
  return migrate(data.profile);
}
