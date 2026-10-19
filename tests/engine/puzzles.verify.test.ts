import { afterAll, describe, expect, it } from 'vitest';
import { createNodeEngine } from '../helpers/nodeEngine';
import { engineProblems, staticProblems } from '../helpers/puzzleChecks';
import { ALL_PUZZLES } from '../../src/content/index';

const engine = createNodeEngine();
afterAll(() => engine.terminate());

describe('puzzle bank is sound (rules + Stockfish 19 verification)', () => {
  for (const p of ALL_PUZZLES) {
    it(p.id, async () => {
      const errs = staticProblems(p);
      if (errs.length === 0) errs.push(...(await engineProblems(engine, p)));
      expect(errs).toEqual([]);
    }, 120_000);
  }
});
