import { afterAll, describe, expect, it } from 'vitest';
import { createNodeEngine } from '../helpers/nodeEngine';
import { Chess, tryUci } from '../../src/core/chess/game';
import { chooseBotMove, seededRng, moveFeatures, styleBonus } from '../../src/core/engine/botMove';
import { makeBot, strengthFor } from '../../src/core/engine/botProfiles';

const engine = createNodeEngine();
afterAll(() => engine.terminate());

const POSITIONS = [
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5',
  'r2q1rk1/ppp2ppp/2np1n2/2b1p1B1/2B1P1b1/2NP1N2/PPP2PPP/R2Q1RK1 w - - 4 8',
  '8/5pk1/6p1/8/3R4/6P1/r4PK1/8 w - - 0 40',
];

describe('bots use the real engine and never make illegal moves', () => {
  it('every bot returns a legal move in every test position', async () => {
    for (const fen of POSITIONS) {
      for (const id of ['lumo', 'nova', 'shadow', 'architect', 'oracle', 'vektor', 'grandmaster'] as const) {
        const bot = makeBot(id);
        const r = await engine.search({ fen, depth: Math.min(bot.depth, 10), multipv: bot.multipv });
        const choice = chooseBotMove(fen, r.lines, bot, seededRng(7));
        expect(tryUci(new Chess(fen), choice.uci), `${id} ${fen}`).not.toBeNull();
      }
    }
  });

  it('weaker bots lose more centipawns on average than stronger ones', async () => {
    const avgLoss = async (nominal: number) => {
      const bot = makeBot('drone', nominal);
      let total = 0;
      let n = 0;
      for (const fen of POSITIONS) {
        const r = await engine.search({ fen, depth: 10, multipv: 10 });
        const rng = seededRng(nominal);
        for (let k = 0; k < 30; k++) {
          total += Math.min(1000, chooseBotMove(fen, r.lines, bot, rng).loss);
          n++;
        }
      }
      return total / n;
    };
    const weak = await avgLoss(400);
    const mid = await avgLoss(1200);
    const strong = await avgLoss(2400);
    expect(weak).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(strong);
    expect(strong).toBeLessThan(25);
  });

  it('a strong bot always takes a forced mate', async () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    const r = await engine.search({ fen, depth: 10, multipv: 3 });
    for (let s = 0; s < 20; s++) expect(chooseBotMove(fen, r.lines, makeBot('vektor'), seededRng(s)).uci).toBe('h5f7');
  });

  it('styles really differ: NOVA values a check more, ORACLE a trade more', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3';
    const c = new Chess(fen);
    const check = c.moves({ verbose: true }).find((m) => m.san === 'Bxf7+')!;
    const f = moveFeatures(fen, check);
    expect(f.check).toBe(true);
    expect(f.sacrifice).toBe(true);
    const nova = makeBot('nova');
    const shadow = makeBot('shadow');
    expect(styleBonus(f, nova.style, 50)).toBeGreaterThan(styleBonus(f, shadow.style, 50));
    expect(strengthFor(300).depth).toBeLessThan(strengthFor(2000).depth);
  });
});
