// Authoring helper.
//   npx vite-node scripts/probe.ts "<fen>|<fen>" [depth] [multipv]        top engine lines
//   npx vite-node scripts/probe.ts "<fen>" [depth] "e2e4,d2d4"            evaluate given options
import { createNodeEngine } from '../tests/helpers/nodeEngine';
import { uciLineToSan } from '../src/core/chess/game';

const fens = process.argv[2].split('|');
const depth = Number(process.argv[3] ?? 18);
const arg4 = process.argv[4] ?? '4';
const e = createNodeEngine();
for (const fen of fens) {
  console.log('FEN', fen);
  if (/^\d+$/.test(arg4)) {
    const r = await e.search({ fen, depth, multipv: Number(arg4) });
    for (const l of r.lines)
      console.log(' ', l.mate !== undefined ? `#${l.mate}` : l.cp, uciLineToSan(fen, l.pv.slice(0, 8)).join(' '), '|', l.pv[0]);
  } else {
    for (const mv of arg4.split(',')) {
      const r = await e.search({ fen, depth, searchMoves: [mv] });
      const l = r.lines[0];
      console.log(' ', mv, l.mate !== undefined ? `#${l.mate}` : l.cp, uciLineToSan(fen, l.pv.slice(0, 6)).join(' '));
    }
  }
}
e.terminate();
process.exit(0);
