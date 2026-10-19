import { Chess, type Square, type Color, type PieceSymbol, PIECE_VALUE, other, piecesOf } from './game';

export interface HangingPiece {
  square: Square;
  type: PieceSymbol;
  value: number;
  attackers: Square[];
  defenders: Square[];
}

/**
 * Pieces of `color` that can be won: attacked and either undefended or attacked by a
 * cheaper piece. This is a static heuristic (it ignores pins and deeper exchanges), so the
 * coach always phrases it as "looks loose" and confirms with the engine when available.
 */
export function hangingPieces(chess: Chess, color: Color): HangingPiece[] {
  const enemy = other(color);
  const out: HangingPiece[] = [];
  for (const p of piecesOf(chess, color)) {
    if (p.type === 'k') continue;
    const attackers = chess.attackers(p.square, enemy);
    if (attackers.length === 0) continue;
    const defenders = chess.attackers(p.square, color);
    const cheapest = Math.min(...attackers.map((s) => PIECE_VALUE[chess.get(s)!.type] || 100));
    if (defenders.length === 0 || cheapest < PIECE_VALUE[p.type]) {
      out.push({ square: p.square, type: p.type, value: PIECE_VALUE[p.type], attackers, defenders });
    }
  }
  return out.sort((a, b) => b.value - a.value);
}

/** Squares of `color`'s pieces (king excluded) that the opponent attacks — an exact fact. */
export function attackedPieces(chess: Chess, color: Color): Square[] {
  const enemy = other(color);
  return piecesOf(chess, color)
    .filter((p) => p.type !== 'k' && chess.isAttacked(p.square, enemy))
    .map((p) => p.square);
}

/** Squares of `color`'s pieces that are attacked and have no defender at all — exact. */
export function undefendedAttacked(chess: Chess, color: Color): Square[] {
  const enemy = other(color);
  return piecesOf(chess, color)
    .filter(
      (p) => p.type !== 'k' && chess.isAttacked(p.square, enemy) && chess.attackers(p.square, color).length === 0,
    )
    .map((p) => p.square);
}

/** Enemy pieces (value >= 3, or the king) attacked by the piece standing on `from`. */
export function forkTargets(chess: Chess, from: Square): Square[] {
  const piece = chess.get(from);
  if (!piece) return [];
  const enemy = other(piece.color);
  return piecesOf(chess, enemy)
    .filter((p) => (p.type === 'k' || PIECE_VALUE[p.type] >= 3) && chess.attackers(p.square, piece.color).includes(from))
    .map((p) => p.square);
}
