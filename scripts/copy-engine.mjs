// Copies the single-threaded "lite" Stockfish WASM build into public/engine so it
// can be served as a static Web Worker (no cross-origin isolation required).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pkgDir;
try {
  pkgDir = dirname(require.resolve('stockfish/package.json'));
} catch {
  console.warn('[copy-engine] stockfish package not installed yet; skipping');
  process.exit(0);
}
const out = join(process.cwd(), 'public', 'engine');
mkdirSync(out, { recursive: true });
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  const src = join(pkgDir, 'bin', f);
  if (!existsSync(src)) throw new Error(`[copy-engine] missing ${src}`);
  copyFileSync(src, join(out, f));
}
console.log('[copy-engine] Stockfish lite-single copied to public/engine');
