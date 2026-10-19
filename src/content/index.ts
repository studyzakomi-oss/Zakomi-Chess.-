import { DIAGNOSTIC_PUZZLES } from './puzzles';
import { WORLD1_PUZZLES } from './world1';
import type { Puzzle } from './types';

export const ALL_PUZZLES: Puzzle[] = [...DIAGNOSTIC_PUZZLES, ...WORLD1_PUZZLES];

export const PUZZLES_BY_ID: Record<string, Puzzle> = Object.fromEntries(ALL_PUZZLES.map((p) => [p.id, p]));
