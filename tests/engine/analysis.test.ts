import { afterAll, describe, expect, it } from 'vitest';
import { createNodeEngine } from '../helpers/nodeEngine';
import { START_FEN } from '../../src/core/chess/game';
import { analyzeGame, winPct, moveAccuracy, classify } from '../../src/core/engine/analysis';
import { explainMove } from '../../src/core/coach/coach';

const engine = createNodeEngine();
afterAll(() => engine.terminate());

describe('analysis formulas', () => {
  it('win% and accuracy behave sensibly', () => {
    expect(winPct(0)).toBeCloseTo(50, 5);
    expect(winPct(300)).toBeGreaterThan(70);
    expect(moveAccuracy(60, 60)).toBeGreaterThan(99);
    expect(moveAccuracy(80, 20)).toBeLessThan(10);
    expect(classify(35, false)).toBe('blunder');
    expect(classify(0.5, false)).toBe('best');
  });
});

describe('game analysis with Stockfish', () => {
  it('flags a queen blunder as a hung piece and explains it', async () => {
    // 1.e4 e5 2.Nf3 Qh4?? 3.Nxh4
    const a = await analyzeGame(engine, { startFen: START_FEN, moves: ['e2e4', 'e7e5', 'g1f3', 'd8h4', 'f3h4'], playerColor: 'b' }, { depth: 10 });
    const blunder = a.plies[3];
    expect(blunder.cls).toBe('blunder');
    expect(blunder.motifs).toContain('hung-piece');
    expect(blunder.hung).toEqual({ square: 'h4', type: 'q' });
    expect(blunder.errorType).toBe('tactical');
    expect(a.keyMoments[0]).toBe(3);
    const steps = explainMove(blunder);
    expect(steps.map((s) => s.level)).toEqual(['question', 'hint', 'idea', 'detail']);
    expect(steps[1].text.en).toContain('h4');
    expect(steps[3].text.en).toContain('Engine');
  });

  it('detects an allowed mate (Scholar’s mate)', async () => {
    const a = await analyzeGame(
      engine,
      { startFen: START_FEN, moves: ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'], playerColor: 'b' },
      { depth: 10 },
    );
    const nf6 = a.plies[5];
    expect(nf6.cls).toBe('blunder');
    expect(nf6.motifs).toContain('allowed-mate');
    expect(a.plies[6].after.win).toBe(100);
    expect(a.accuracy.b).toBeLessThan(a.accuracy.w);
  });
});
