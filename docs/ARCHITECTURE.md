# Architecture

## Technology choices

| Need | Choice | Why |
|---|---|---|
| Android delivery without a native toolchain | Vite + React + TypeScript, installable **PWA** | One codebase, installs from Chrome, works offline via a service worker (Workbox precaches app + engine). Can later be wrapped with Capacitor/TWA for the Play Store without rewriting. |
| Correct chess rules | `chess.js` 1.4 | Widely used, complete rules (castling rights, en passant, promotion, 50-move, threefold, insufficient material), SAN/PGN. |
| Real engine | Stockfish 19 *lite, single-threaded* WASM (`stockfish` npm package) | ~1.8 MB, runs in a classic Web Worker on any static host (the multi-threaded build needs cross-origin isolation headers). Far stronger than any human even in "lite" form. |
| Tests | Vitest (Node runs the **same** Stockfish build) + Playwright | Engine-dependent logic is tested against the real engine, not a mock. |

## Layers

```
UI (src/ui) ──► core (src/core) ──► chess.js / Stockfish
   │                 ▲
   └──► storage ─────┘   content (src/content) is pure data
```

* `core/engine/uci.ts` is transport-agnostic: `browserTransport.ts` (Web Worker) in the app, `tests/helpers/nodeEngine.ts` in tests.
* Screens never compute chess logic themselves; they call `core/*` functions, most of which are pure and unit-tested.
* The profile is a single versioned JSON document (`storage/profile.ts`) saved to `localStorage` (debounced, plus on `pagehide`/`visibilitychange`). `migrate()` validates anything loaded from storage or a backup file.

## Opponents (`core/engine/botProfiles.ts`, `botMove.ts`)

Every bot move starts with a real Stockfish MultiPV search. The bot then chooses:

1. **Normal play** — softmax over *(engine score + style bonus)* among lines that lose at most `maxLoss` cp. Style bonuses are computed from concrete move features (check, capture, sacrifice, centre, development, castling, pawn storm, trades, defending loose pieces, king activity / pawn pushes in endgames). NOVA weights attack, SHADOW defence, ARCHITECT position, ORACLE trades and endgames.
2. **Designed errors** — with probability `errorRate`, a lower-ranked engine line within `errorMaxLoss`; for the weakest bots, a "greedy beginner" pick over *all legal moves* (captures and checks preferred). This is how low levels are simulated; it is explicit, bounded, and documented.
3. Strong bots never throw away a found forced mate.

Moves are always validated by chess.js — bots cannot play illegal moves. Strength parameters (depth, MultiPV, temperature, error rates) are interpolated on a *nominal* in-game number. **These numbers are design targets, not calibrated human ratings**, and the UI says so.

## Diagnostic & rating

See [RATING.md](RATING.md).

## Analysis & coaching

See [ANALYSIS.md](ANALYSIS.md).

## Curriculum

* `content/curriculum.ts` defines 7 worlds; only World 1 ships content (`available: true`). Locked worlds are visible on the map with an honest "under construction" note.
* Each level: lesson steps (board + arrows + text) → interactive example (one exact move) → guided exercises → match vs the guardian → mastery test (5 questions drawn from a pool, preferring ones not seen as exercises). A level passes with **mastery ≥ 80 % and the match played**; retries are free.
* Puzzle answers for "select squares" and "status / castling" questions are **computed from the rules**, never hand-typed. Move/choice puzzles are verified by Stockfish in `tests/engine/puzzles.verify.test.ts`.

## Extending

* New world: add puzzles in a `content/worldN.ts`, register them in `content/index.ts`, add levels to `WORLDS[N-1].levels`, set `available: true`. The verification test checks every new puzzle automatically.
* New opponent: add a style in `botProfiles.ts`, a character in `content/characters.ts`, and a portrait in `Portrait.tsx`.
* Cloud sync: `exportBackup/importBackup` already define the portable format; a sync backend only needs to store that JSON.
