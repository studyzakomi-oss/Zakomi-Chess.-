import { describe, expect, it } from 'vitest';
import { fenPieces } from '../src/core/chess/fen';
import { Chess, tryUci } from '../src/core/chess/game';
import { WORLDS } from '../src/content/curriculum';
import { PUZZLES_BY_ID, ALL_PUZZLES } from '../src/content/index';
import { flipTurn, MovePuzzleRunner, squaresAnswer, isSquaresCorrect, choiceAnswer } from '../src/core/puzzles/answers';
import { CHARACTERS } from '../src/content/characters';
import type { MovePuzzle, SquaresPuzzle, ChoicePuzzle } from '../src/content/types';

describe('curriculum integrity', () => {
  it('every referenced puzzle exists and ids are unique', () => {
    expect(new Set(ALL_PUZZLES.map((p) => p.id)).size).toBe(ALL_PUZZLES.length);
    for (const w of WORLDS)
      for (const lv of w.levels) {
        for (const id of [...lv.exercises, ...lv.masteryPool]) expect(PUZZLES_BY_ID[id], id).toBeDefined();
        expect(lv.masteryPool.length).toBeGreaterThanOrEqual(lv.masteryCount);
      }
  });

  it('lesson boards and examples are legal positions; example moves are legal', () => {
    for (const w of WORLDS)
      for (const lv of w.levels) {
        for (const st of lv.lesson) if (st.fen) expect(() => fenPieces(st.fen!), `${lv.id} ${st.fen}`).not.toThrow();
        expect(tryUci(new Chess(lv.example.fen), lv.example.move), lv.id).not.toBeNull();
        expect(new Chess(flipTurn(lv.example.fen)).inCheck()).toBe(false);
      }
  });

  it('only shipped worlds are marked available; guardians exist', () => {
    expect(WORLDS.filter((w) => w.available).map((w) => w.index)).toEqual([1]);
    for (const w of WORLDS) expect(CHARACTERS[w.guardian]).toBeDefined();
  });
});

describe('puzzle answer checking', () => {
  it('accepts the main line of a multi-move puzzle and plays the reply', () => {
    const r = new MovePuzzleRunner(PUZZLES_BY_ID['d-mate-philidor'] as MovePuzzle);
    const v = r.submit('d5g8');
    expect(v.kind).toBe('continue');
    expect(r.submit('h6f7').kind).toBe('solved');
  });

  it('rejects wrong and illegal moves, accepts alternative mates', () => {
    const r = new MovePuzzleRunner(PUZZLES_BY_ID['d-mate-backrank'] as MovePuzzle);
    expect(r.submit('e1e2').kind).toBe('wrong');
    expect(r.submit('e1a5').kind).toBe('illegal');
    const kq = new MovePuzzleRunner(PUZZLES_BY_ID['d-end-kq'] as MovePuzzle);
    expect(kq.submit('g1g8').kind).toBe('solved');
  });

  it('check goal accepts any check', () => {
    const r = new MovePuzzleRunner(PUZZLES_BY_ID['w1-give-check2'] as MovePuzzle);
    expect(r.submit('d1h5').kind).toBe('solved');
  });

  it('squares and status answers come from the rules', () => {
    const p = PUZZLES_BY_ID['d-rules-5'] as SquaresPuzzle;
    expect(squaresAnswer(p)).toEqual(['d6', 'e6']);
    expect(isSquaresCorrect(p, ['e6', 'd6'])).toBe(true);
    expect(isSquaresCorrect(p, ['e6'])).toBe(false);
    expect(choiceAnswer(PUZZLES_BY_ID['d-rules-3'] as ChoicePuzzle)).toBe('stalemate');
    expect(choiceAnswer(PUZZLES_BY_ID['d-rules-4'] as ChoicePuzzle)).toBe('queenside');
    expect(choiceAnswer(PUZZLES_BY_ID['w1-castle-check'] as ChoicePuzzle)).toBe('none');
  });
});
