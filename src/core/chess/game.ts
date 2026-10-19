import { Chess, type Move, type Square, type PieceSymbol, type Color } from 'chess.js';

export type { Move, Square, PieceSymbol, Color };
export { Chess };

export type ResultCode = '1-0' | '0-1' | '1/2-1/2';
export type EndReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient'
  | 'threefold'
  | 'fifty'
  | 'resign'
  | 'timeout'
  | 'agreement';

export interface GameOutcome {
  result: ResultCode;
  reason: EndReason;
  winner: Color | null;
}

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function other(c: Color): Color {
  return c === 'w' ? 'b' : 'w';
}

function win(winner: Color, reason: EndReason): GameOutcome {
  return { result: winner === 'w' ? '1-0' : '0-1', reason, winner };
}

function draw(reason: EndReason): GameOutcome {
  return { result: '1/2-1/2', reason, winner: null };
}

/** Outcome determined purely by the position on the board (null while the game goes on). */
export function boardOutcome(chess: Chess): GameOutcome | null {
  if (chess.isCheckmate()) return win(other(chess.turn()), 'checkmate');
  if (chess.isStalemate()) return draw('stalemate');
  if (chess.isInsufficientMaterial()) return draw('insufficient');
  if (chess.isThreefoldRepetition()) return draw('threefold');
  if (chess.isDrawByFiftyMoves()) return draw('fifty');
  return null;
}

/**
 * Flag fall. Per FIDE Laws (6.9) the game is drawn if the side that did not run out of time
 * cannot possibly checkmate. We apply the common practical test: a lone king, or king plus a
 * single minor piece against a bare king, cannot mate.
 */
export function timeoutOutcome(chess: Chess, flagged: Color): GameOutcome {
  const winner = other(flagged);
  const mine = piecesOf(chess, winner).filter((p) => p.type !== 'k');
  const theirs = piecesOf(chess, flagged).filter((p) => p.type !== 'k');
  if (mine.length === 0) return draw('timeout');
  if (mine.length === 1 && (mine[0].type === 'n' || mine[0].type === 'b') && theirs.length === 0) {
    return draw('timeout');
  }
  return win(winner, 'timeout');
}

export function resignOutcome(resigning: Color): GameOutcome {
  return win(other(resigning), 'resign');
}

export function piecesOf(chess: Chess, color: Color) {
  const out: { square: Square; type: PieceSymbol; color: Color }[] = [];
  for (const row of chess.board()) for (const p of row) if (p && p.color === color) out.push(p);
  return out;
}

export function material(chess: Chess): Record<Color, number> {
  const m = { w: 0, b: 0 };
  for (const row of chess.board()) for (const p of row) if (p) m[p.color] += PIECE_VALUE[p.type];
  return m;
}

export type Phase = 'opening' | 'middlegame' | 'endgame';

/** Rough game phase from non-pawn material and move number. */
export function phaseOf(chess: Chess): Phase {
  let nonPawn = 0;
  let queens = 0;
  for (const row of chess.board())
    for (const p of row)
      if (p && p.type !== 'p' && p.type !== 'k') {
        nonPawn += PIECE_VALUE[p.type];
        if (p.type === 'q') queens++;
      }
  if (nonPawn <= 13 || (queens === 0 && nonPawn <= 20)) return 'endgame';
  if (chess.moveNumber() <= 10) return 'opening';
  return 'middlegame';
}

export function uciOf(m: Pick<Move, 'from' | 'to' | 'promotion'>): string {
  return m.from + m.to + (m.promotion ?? '');
}

export function parseUci(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: (uci.length > 4 ? uci[4] : undefined) as PieceSymbol | undefined,
  };
}

/** Plays a move if legal; returns null (and leaves the position untouched) otherwise. */
export function tryMove(chess: Chess, from: Square, to: Square, promotion?: PieceSymbol): Move | null {
  try {
    return chess.move({ from, to, promotion });
  } catch {
    return null;
  }
}

export function tryUci(chess: Chess, uci: string): Move | null {
  const { from, to, promotion } = parseUci(uci);
  return tryMove(chess, from, to, promotion);
}

export function legalTargets(chess: Chess, from: Square): Square[] {
  return [...new Set(chess.moves({ square: from, verbose: true }).map((m) => m.to))];
}

export function isPromotionMove(chess: Chess, from: Square, to: Square): boolean {
  return chess.moves({ square: from, verbose: true }).some((m) => m.to === to && !!m.promotion);
}

/** SAN for a UCI move in a given position (null if illegal). */
export function sanOf(fen: string, uci: string): string | null {
  const c = new Chess(fen);
  return tryUci(c, uci)?.san ?? null;
}

/** Converts a UCI line to SAN, stopping at the first illegal move. */
export function uciLineToSan(fen: string, line: string[]): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of line) {
    const m = tryUci(c, u);
    if (!m) break;
    out.push(m.san);
  }
  return out;
}

export function kingSquare(chess: Chess, color: Color): Square | null {
  return chess.findPiece({ type: 'k', color })[0] ?? null;
}

export function fenAfter(fen: string, uci: string): string | null {
  const c = new Chess(fen);
  return tryUci(c, uci) ? c.fen() : null;
}
