/**
 * Minimal, transport-agnostic UCI client. The same class drives Stockfish in a browser
 * Web Worker and in Node (tests), so the code paths under test are the ones that ship.
 */

export interface EngineTransport {
  send(cmd: string): void;
  onLine(cb: (line: string) => void): void;
  terminate(): void;
}

export interface PvLine {
  multipv: number;
  depth: number;
  /** Centipawns from the side-to-move's point of view (undefined when a mate score is given). */
  cp?: number;
  /** Mate distance in moves from the side-to-move's point of view (negative = getting mated). */
  mate?: number;
  pv: string[];
}

export interface SearchResult {
  bestmove: string | null;
  lines: PvLine[];
}

export interface SearchOptions {
  fen: string;
  depth?: number;
  movetime?: number;
  nodes?: number;
  multipv?: number;
  /** Restrict the search to these UCI moves. */
  searchMoves?: string[];
}

export function parseInfo(line: string): PvLine | null {
  if (!line.startsWith('info ') || !line.includes(' pv ')) return null;
  const t = line.split(/\s+/);
  const out: PvLine = { multipv: 1, depth: 0, pv: [] };
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth':
        out.depth = Number(t[++i]);
        break;
      case 'multipv':
        out.multipv = Number(t[++i]);
        break;
      case 'score': {
        const kind = t[++i];
        const v = Number(t[++i]);
        if (kind === 'cp') out.cp = v;
        else if (kind === 'mate') out.mate = v;
        if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') return null;
        break;
      }
      case 'pv':
        out.pv = t.slice(i + 1);
        i = t.length;
        break;
    }
  }
  if (out.cp === undefined && out.mate === undefined) return null;
  return out;
}

/** Single number for comparisons: mates map to large values that still prefer faster mates. */
export function scoreValue(l: Pick<PvLine, 'cp' | 'mate'>): number {
  if (l.mate !== undefined) {
    if (l.mate === 0) return -100000;
    return l.mate > 0 ? 100000 - l.mate * 100 : -100000 - l.mate * 100;
  }
  return l.cp ?? 0;
}

export class UciEngine {
  private listeners = new Set<(line: string) => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private multipv = 1;
  private ready: Promise<void> | null = null;
  name = 'unknown';

  constructor(private transport: EngineTransport) {
    transport.onLine((line) => {
      for (const l of [...this.listeners]) l(line);
    });
  }

  private waitFor(pred: (line: string) => boolean, timeoutMs = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(fn);
        reject(new Error('engine timeout'));
      }, timeoutMs);
      const fn = (line: string) => {
        if (pred(line)) {
          clearTimeout(timer);
          this.listeners.delete(fn);
          resolve(line);
        }
      };
      this.listeners.add(fn);
    });
  }

  init(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        const nameListener = (l: string) => {
          if (l.startsWith('id name ')) this.name = l.slice(8);
        };
        this.listeners.add(nameListener);
        const ok = this.waitFor((l) => l === 'uciok');
        this.transport.send('uci');
        await ok;
        this.listeners.delete(nameListener);
        await this.isReady();
      })();
    }
    return this.ready;
  }

  private async isReady() {
    const ok = this.waitFor((l) => l === 'readyok');
    this.transport.send('isready');
    await ok;
  }

  newGame(): Promise<void> {
    return this.enqueue(async () => {
      this.transport.send('ucinewgame');
      await this.isReady();
    });
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.queue.then(() => this.init()).then(job);
    this.queue = run.catch(() => undefined);
    return run;
  }

  search(opts: SearchOptions): Promise<SearchResult> {
    return this.enqueue(async () => {
      const multipv = opts.multipv ?? 1;
      if (multipv !== this.multipv) {
        this.transport.send(`setoption name MultiPV value ${multipv}`);
        this.multipv = multipv;
      }
      this.transport.send(`position fen ${opts.fen}`);
      const lines = new Map<number, PvLine>();
      const collect = (l: string) => {
        const info = parseInfo(l);
        if (info) lines.set(info.multipv, info);
      };
      this.listeners.add(collect);
      const done = this.waitFor((l) => l.startsWith('bestmove'), 120000);
      let go = 'go';
      if (opts.depth) go += ` depth ${opts.depth}`;
      if (opts.nodes) go += ` nodes ${opts.nodes}`;
      if (opts.movetime) go += ` movetime ${opts.movetime}`;
      if (!opts.depth && !opts.nodes && !opts.movetime) go += ' depth 12';
      if (opts.searchMoves?.length) go += ` searchmoves ${opts.searchMoves.join(' ')}`;
      this.transport.send(go);
      const last = await done.finally(() => this.listeners.delete(collect));
      const best = last.split(/\s+/)[1];
      const sorted = [...lines.values()].filter((l) => l.pv.length > 0).sort((a, b) => a.multipv - b.multipv);
      return { bestmove: best && best !== '(none)' ? best : null, lines: sorted };
    });
  }

  stop() {
    this.transport.send('stop');
  }

  terminate() {
    this.transport.terminate();
  }
}
