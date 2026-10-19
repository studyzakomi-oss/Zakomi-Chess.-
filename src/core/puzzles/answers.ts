import { Chess, legalTargets, tryUci, uciOf, type Square } from '../chess/game';
import { attackedPieces, undefendedAttacked } from '../chess/attacks';
import type { ChoicePuzzle, MovePuzzle, Puzzle, SquaresPuzzle } from '../../content/types';

/** Answers to squares questions are computed from the rules engine, never hand-written. */
export function squaresAnswer(p: SquaresPuzzle): Square[] {
  const c = new Chess(p.fen);
  switch (p.query.type) {
    case 'legal-moves':
      return legalTargets(c, p.query.from).sort();
    case 'attacked':
      return attackedPieces(c, p.query.color).sort();
    case 'undefended':
      return undefendedAttacked(c, p.query.color).sort();
  }
}

export type BoardStatus = 'checkmate' | 'stalemate' | 'check' | 'none';
export function statusOf(fen: string): BoardStatus {
  const c = new Chess(fen);
  if (c.isCheckmate()) return 'checkmate';
  if (c.isStalemate()) return 'stalemate';
  if (c.inCheck()) return 'check';
  return 'none';
}

export type CastlingAnswer = 'both' | 'kingside' | 'queenside' | 'none';
export function castlingOf(fen: string): CastlingAnswer {
  const moves = new Chess(fen).moves({ verbose: true });
  const k = moves.some((m) => m.isKingsideCastle());
  const q = moves.some((m) => m.isQueensideCastle());
  return k && q ? 'both' : k ? 'kingside' : q ? 'queenside' : 'none';
}

export function choiceOptions(p: ChoicePuzzle): string[] {
  switch (p.query.type) {
    case 'status':
      return ['check', 'checkmate', 'stalemate', 'none'];
    case 'castling':
      return ['both', 'kingside', 'queenside', 'none'];
    case 'moves':
    case 'threat':
      return p.query.options;
  }
}

export function choiceAnswer(p: ChoicePuzzle): string {
  switch (p.query.type) {
    case 'status':
      return statusOf(p.fen);
    case 'castling':
      return castlingOf(p.fen);
    case 'moves':
    case 'threat':
      return p.query.correct;
  }
}

/** FEN with the other side to move (for "what does the opponent threaten?"). */
export function flipTurn(fen: string): string {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  return parts.join(' ');
}

/** SAN label for a move option; threat options are read with the opponent to move. */
export function optionSan(p: ChoicePuzzle, uci: string): string {
  const fen = p.query.type === 'threat' ? flipTurn(p.fen) : p.fen;
  const c = new Chess(fen);
  return tryUci(c, uci)?.san ?? uci;
}

export type MoveVerdict =
  | { kind: 'continue'; reply: string; replySan: string }
  | { kind: 'solved' }
  | { kind: 'wrong' }
  | { kind: 'illegal' };

/**
 * Stateful checker for a move puzzle. Accepts the main line, listed alternatives on the first
 * move, and — for mate puzzles — any move that mates immediately.
 */
export class MovePuzzleRunner {
  readonly chess: Chess;
  private ply = 0;

  constructor(readonly puzzle: MovePuzzle) {
    this.chess = new Chess(puzzle.fen);
  }

  get fen() {
    return this.chess.fen();
  }

  get solverColor() {
    return new Chess(this.puzzle.fen).turn();
  }

  expected(): string | undefined {
    return this.puzzle.line[this.ply];
  }

  submit(uci: string): MoveVerdict {
    const probe = new Chess(this.chess.fen());
    const mv = tryUci(probe, uci);
    if (!mv) return { kind: 'illegal' };
    const played = uciOf(mv);
    const p = this.puzzle;
    let ok = played === p.line[this.ply];
    if (!ok && this.ply === 0 && p.accept?.includes(played)) {
      tryUci(this.chess, played);
      return { kind: 'solved' };
    }
    if (!ok && p.goal === 'mate' && probe.isCheckmate()) {
      tryUci(this.chess, played);
      return { kind: 'solved' };
    }
    if (!ok && p.goal === 'check' && probe.inCheck()) ok = true;
    if (!ok && p.goal === 'promote' && mv.promotion === 'q') ok = true;
    if (!ok) return { kind: 'wrong' };
    tryUci(this.chess, played);
    this.ply++;
    const reply = p.line[this.ply];
    if (!reply || p.goal === 'check' || p.goal === 'promote') return { kind: 'solved' };
    const r = tryUci(this.chess, reply)!;
    this.ply++;
    if (this.ply >= p.line.length) return { kind: 'solved' };
    return { kind: 'continue', reply, replySan: r.san };
  }
}

export function isSquaresCorrect(p: SquaresPuzzle, picked: Square[]): boolean {
  const ans = squaresAnswer(p);
  return ans.length === picked.length && [...picked].sort().every((s, i) => s === ans[i]);
}

export function puzzleSolverColor(p: Puzzle): 'w' | 'b' {
  return new Chess(p.fen).turn();
}
