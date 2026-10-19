import type { Color, PieceSymbol, Square } from './game';

export interface PlacedPiece {
  square: Square;
  type: PieceSymbol;
  color: Color;
}

/** Parses only the placement field of a FEN (used for display boards that need no rules). */
export function fenPieces(fen: string): PlacedPiece[] {
  const rows = fen.split(' ')[0].split('/');
  if (rows.length !== 8) throw new Error(`bad FEN placement: ${fen}`);
  const out: PlacedPiece[] = [];
  rows.forEach((row, i) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) file += Number(ch);
      else {
        if (!/[prnbqkPRNBQK]/.test(ch)) throw new Error(`bad FEN char ${ch}`);
        out.push({
          square: (String.fromCharCode(97 + file) + (8 - i)) as Square,
          type: ch.toLowerCase() as PieceSymbol,
          color: ch === ch.toUpperCase() ? 'w' : 'b',
        });
        file++;
      }
    }
    if (file !== 8) throw new Error(`bad FEN row ${row}`);
  });
  return out;
}

export function turnOf(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}
