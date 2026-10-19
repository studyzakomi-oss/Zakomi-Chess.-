import { DIAGNOSTIC_PUZZLES } from './puzzles';
import type { Puzzle } from './types';

export const ALL_PUZZLES: Puzzle[] = [...DIAGNOSTIC_PUZZLES];

export const PUZZLES_BY_ID: Record<string, Puzzle> = Object.fromEntries(ALL_PUZZLES.map((p) => [p.id, p]));
