import { createRequire } from 'node:module';
import { UciEngine, type EngineTransport } from '../../src/core/engine/uci';

const require = createRequire(import.meta.url);

/** Real Stockfish 19 lite (same build the app ships) driven through Node. */
export function createNodeEngine(): UciEngine {
  let handler: (l: string) => void = () => {};
  const sf = require('stockfish')('lite-single', (line: string) => handler(line));
  const transport: EngineTransport = {
    send: (c) => sf.processCommand(c),
    onLine: (cb) => {
      handler = cb;
    },
    terminate: () => sf.terminate(),
  };
  return new UciEngine(transport);
}
