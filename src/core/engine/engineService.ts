import { UciEngine } from './uci';
import { createBrowserTransport } from './browserTransport';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

let engine: UciEngine | null = null;
let status: EngineStatus = 'idle';
let lastError: string | null = null;
const subs = new Set<(s: EngineStatus) => void>();

function setStatus(s: EngineStatus) {
  status = s;
  subs.forEach((f) => f(s));
}

export function engineStatus() {
  return { status, error: lastError, name: engine?.name ?? null };
}

export function onEngineStatus(f: (s: EngineStatus) => void) {
  subs.add(f);
  return () => subs.delete(f);
}

/** Lazily boots the shared Stockfish worker. Rejects (and reports status "error") if it cannot load. */
export async function getEngine(): Promise<UciEngine> {
  if (engine && status === 'ready') return engine;
  if (!engine) {
    setStatus('loading');
    try {
      engine = new UciEngine(createBrowserTransport());
      await engine.init();
      setStatus('ready');
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      engine?.terminate();
      engine = null;
      setStatus('error');
      throw e;
    }
  } else {
    await engine.init();
  }
  return engine;
}
