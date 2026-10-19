import type { Square } from '../core/chess/game';

export type Lang = 'ar' | 'en' | 'fr';
export type L = Record<Lang, string>;

export const l = (ar: string, en: string, fr: string): L => ({ ar, en, fr });

/** Diagnostic categories (section 3 of the design brief). */
export type DiagCategory = 'rules' | 'threats' | 'tactics' | 'mate' | 'candidates' | 'strategy' | 'endgame' | 'time';

export const DIAG_CATEGORIES: DiagCategory[] = [
  'rules',
  'threats',
  'tactics',
  'mate',
  'candidates',
  'strategy',
  'endgame',
  'time',
];

/** Fine-grained skills tracked by the mastery / spaced-repetition system. */
export type SkillId =
  | 'rules.movement'
  | 'rules.check'
  | 'rules.special'
  | 'rules.draws'
  | 'safety.threats'
  | 'safety.protect'
  | 'mate.one'
  | 'mate.two'
  | 'tactic.fork'
  | 'tactic.pin'
  | 'tactic.skewer'
  | 'tactic.discovered'
  | 'tactic.deflection'
  | 'calc.candidates'
  | 'strategy.opening'
  | 'strategy.king-safety'
  | 'endgame.basic-mates'
  | 'endgame.pawns'
  | 'time.quick';

export interface PuzzleBase {
  id: string;
  /** Present when the puzzle belongs to the diagnostic bank. */
  category?: DiagCategory;
  skills: SkillId[];
  /** Difficulty on the in-game rating scale (independent from the player's rating). */
  rating: number;
  fen: string;
  prompt: L;
  /** [guiding question, concrete hint] — the coach reveals them one at a time. */
  hints: [L, L];
  explanation: L;
  timeLimitSec?: number;
}

/**
 * mate: any immediate mate is accepted on the last move · check: any checking move ·
 * promote: any promotion to a queen · best: engine-verified best move(s) · exact: a rules
 * exercise with exactly one correct move (e.g. "castle kingside").
 */
export type MoveGoal = 'mate' | 'check' | 'promote' | 'best' | 'exact';

export interface MovePuzzle extends PuzzleBase {
  kind: 'move';
  goal: MoveGoal;
  /** Main line in UCI, alternating solver / opponent, starting with the solver. */
  line: string[];
  /** Other first moves that also solve the puzzle (verified against the engine in tests). */
  accept?: string[];
}

export type SquaresQuery =
  | { type: 'legal-moves'; from: Square }
  | { type: 'attacked'; color: 'w' | 'b' }
  | { type: 'undefended'; color: 'w' | 'b' };

export interface SquaresPuzzle extends PuzzleBase {
  kind: 'squares';
  query: SquaresQuery;
}

export type ChoiceQuery =
  | { type: 'status' }
  | { type: 'castling' }
  /** Engine-verified: `correct` is the best (or, with mode 'worst', the worst) of the options. */
  | { type: 'moves'; options: string[]; correct: string; mode: 'best' | 'worst' }
  /** "What does the opponent threaten?" — evaluated with the opponent to move. */
  | { type: 'threat'; options: string[]; correct: string };

export interface ChoicePuzzle extends PuzzleBase {
  kind: 'choice';
  query: ChoiceQuery;
}

export type Puzzle = MovePuzzle | SquaresPuzzle | ChoicePuzzle;
