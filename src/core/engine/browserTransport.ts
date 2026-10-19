import type { EngineTransport } from './uci';

/** Stockfish 19 lite (single-threaded WASM) as a classic Web Worker served from /engine. */
export function createBrowserTransport(): EngineTransport {
  const url = new URL(`${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`, document.baseURI);
  const worker = new Worker(url);
  let handler: (line: string) => void = () => {};
  worker.onmessage = (e: MessageEvent) => {
    const data = typeof e.data === 'string' ? e.data : String(e.data);
    for (const line of data.split('\n')) if (line) handler(line);
  };
  return {
    send: (cmd) => worker.postMessage(cmd),
    onLine: (cb) => {
      handler = cb;
    },
    terminate: () => worker.terminate(),
  };
}
