import { useEffect, useMemo, useState } from 'react';
import { useStore, useT, kv } from '../store';
import { go } from '../router';
import { Btn, Card, EngineBanner, Screen, Speaker } from '../components/common';
import { Board } from '../components/Board';
import { Portrait } from '../components/Portrait';
import { getEngine } from '../../core/engine/engineService';
import { analyzeGame, type GameAnalysis, type PlyAnalysis } from '../../core/engine/analysis';
import { explainMove, ERROR_TYPE_NAMES } from '../../core/coach/coach';
import { Chess, parseUci, tryUci, type Color } from '../../core/chess/game';
import type { GameRecord, NotebookEntry, Profile } from '../../storage/profile';
import { CHARACTERS, lineFor } from '../../content/characters';
import { scoreFor } from '../../core/training/progress';

const CACHE_INDEX = 'zcd.analysis.index';
const DEPTH = 11;

function loadCached(id: string): GameAnalysis | null {
  try {
    const s = kv.getItem(`zcd.analysis.${id}`);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function saveCached(id: string, a: GameAnalysis) {
  try {
    const idx: string[] = JSON.parse(kv.getItem(CACHE_INDEX) ?? '[]');
    const next = [...idx.filter((x) => x !== id), id];
    while (next.length > 10) kv.removeItem(`zcd.analysis.${next.shift()}`);
    kv.setItem(CACHE_INDEX, JSON.stringify(next));
    kv.setItem(`zcd.analysis.${id}`, JSON.stringify(a));
  } catch {
    /* storage full: analysis is simply recomputed next time */
  }
}

export interface AnalysisSource {
  id: string;
  startFen: string;
  moves: string[];
  times?: number[];
  playerColor: Color;
  record?: GameRecord;
}

/** Writes the summary into the game record and turns the worst moments into notebook drills. */
function applyAnalysis(p: Profile, src: AnalysisSource, a: GameAnalysis): Profile {
  const mine = a.plies.filter((x) => x.color === src.playerColor);
  const summary = {
    accuracy: a.accuracy[src.playerColor],
    counts: a.counts[src.playerColor],
    errorTypes: a.errorTypes,
    byPhase: a.byPhase,
    hungPieces: mine.filter((x) => x.motifs.includes('hung-piece') && (x.cls === 'mistake' || x.cls === 'blunder')).length,
    depth: a.depth,
  };
  const games = p.games.map((g) => (g.id === src.id ? { ...g, analysis: summary } : g));
  if (p.notebook.some((n) => n.gameId === src.id)) return { ...p, games };
  const now = Date.now();
  const entries: NotebookEntry[] = a.keyMoments
    .map((i) => a.plies[i])
    .filter((x) => x.cls === 'mistake' || x.cls === 'blunder')
    .map((x) => ({
      id: `nb-${src.id}-${x.ply}`,
      t: now,
      source: 'game' as const,
      fen: x.fenBefore,
      played: x.uci,
      playedSan: x.san,
      best: x.bestUci,
      bestSan: x.bestSan,
      errorType: x.errorType,
      motifs: x.motifs,
      skills: x.motifs.some((m) => m.includes('fork')) ? ['tactic.fork'] : x.motifs.length ? ['safety.threats'] : x.errorType === 'endgame' ? ['endgame.pawns'] : ['calc.candidates'],
      gameId: src.id,
      ply: x.ply,
      reviews: 0,
      successes: 0,
      due: now,
      resolved: false,
    }));
  return { ...p, games, notebook: [...p.notebook, ...entries] };
}

export function AnalysisScreen({ id }: { id: string }) {
  const { profile } = useStore();
  const rec = profile.games.find((g) => g.id === id);
  const src = useMemo<AnalysisSource | null>(() => {
    if (rec) return { id: rec.id, startFen: rec.startFen, moves: rec.moves, times: rec.times, playerColor: rec.playerColor, record: rec };
    if (id === 'import') {
      try {
        return JSON.parse(sessionStorage.getItem('zcd.import') ?? 'null');
      } catch {
        return null;
      }
    }
    return null;
  }, [id, rec?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!src) return <Screen title="—"><Btn onClick={() => go('home')}>←</Btn></Screen>;
  return <AnalysisView src={src} />;
}

function AnalysisView({ src }: { src: AnalysisSource }) {
  const { profile, update } = useStore();
  const { t, tl, lang } = useT();
  const [a, setA] = useState<GameAnalysis | null>(() => loadCached(src.id));
  const [prog, setProg] = useState<[number, number]>([0, src.moves.length + 1]);
  const [err, setErr] = useState<string | null>(null);
  const [ply, setPly] = useState<number>(src.moves.length);
  const [reveal, setReveal] = useState<Record<number, number>>({});
  const [added, setAdded] = useState(0);

  useEffect(() => {
    if (a) {
      if (src.record && !src.record.analysis) update((p) => applyAnalysis(p, src, a));
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const engine = await getEngine();
        const res = await analyzeGame(engine, { startFen: src.startFen, moves: src.moves, times: src.times, playerColor: src.playerColor }, { depth: DEPTH, onProgress: (d, tt) => !cancel && setProg([d, tt]) });
        if (cancel) return;
        saveCached(src.id, res);
        setA(res);
        if (src.record) {
          const before = profile.notebook.length;
          update((p) => {
            const np = applyAnalysis(p, src, res);
            setAdded(np.notebook.length - before);
            return np;
          });
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [src.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fens = useMemo(() => {
    const c = new Chess(src.startFen);
    const out = [c.fen()];
    for (const u of src.moves) {
      tryUci(c, u);
      out.push(c.fen());
    }
    return out;
  }, [src]);
  const sans = useMemo(() => {
    const c = new Chess(src.startFen);
    return src.moves.map((u) => tryUci(c, u)?.san ?? u);
  }, [src]);

  const rec = src.record;
  const res = rec ? scoreFor(rec.result, rec.playerColor) : null;
  const cur: PlyAnalysis | undefined = a && ply > 0 ? a.plies[ply - 1] : undefined;
  const nextP: PlyAnalysis | undefined = a ? a.plies[ply] : undefined;
  const arrows = [];
  if (nextP?.bestUci && nextP.cls !== 'best') {
    const b = parseUci(nextP.bestUci);
    arrows.push({ from: b.from, to: b.to, color: '#22c55e' });
  }
  const lastMove = ply > 0 ? ([parseUci(src.moves[ply - 1]).from, parseUci(src.moves[ply - 1]).to] as [typeof arrows[0]['from'], typeof arrows[0]['from']]) : null;
  const evalW = cur ? cur.after.win : a?.plies[0]?.before.win ?? 50;

  function pgn() {
    const c = new Chess(src.startFen);
    if (rec) {
      c.setHeader('Event', 'ZAKOMI CHESS DIMENSIONS');
      c.setHeader('White', rec.playerColor === 'w' ? profile.name : CHARACTERS[rec.bot].name);
      c.setHeader('Black', rec.playerColor === 'b' ? profile.name : CHARACTERS[rec.bot].name);
      c.setHeader('Result', rec.result);
      c.setHeader('Date', new Date(rec.t).toISOString().slice(0, 10).replace(/-/g, '.'));
    }
    for (const u of src.moves) tryUci(c, u);
    return c.pgn();
  }

  return (
    <Screen title={t('analysis')} onBack={() => go('home')}>
      <EngineBanner />
      {rec && (
        <Card className="result-card">
          <Portrait id="zakomi" mood={res === 1 ? 'celebrate' : res === 0 ? 'sad' : 'neutral'} size={64} />
          <div className="grow">
            <div className="big" data-testid="result-title">{res === 1 ? t('res.win') : res === 0 ? t('res.loss') : t('res.draw')}</div>
            <div className="muted">{rec.result} · {t(`reason.${rec.reason}`)} · {rec.rated ? t('rated') : t('unrated')}</div>
            {rec.rated && (
              <div className="muted small">
                {t('rating')}: {Math.round(rec.ratingBefore.r)} → {Math.round(rec.ratingAfter.r)} (±{Math.round(rec.ratingAfter.rd * 2)})
              </div>
            )}
          </div>
          <Portrait id={rec.bot} mood={res === 1 ? 'sad' : 'happy'} size={52} />
        </Card>
      )}
      {rec && <Speaker who={rec.bot} text={tl(lineFor(rec.bot, res === 1 ? 'lose' : res === 0 ? 'win' : 'draw') ?? undefined)} />}
      {err && <div className="banner error">{t('engineError')}</div>}
      {!a && !err && <div className="banner info" data-testid="analysing">{t('analysing', { d: prog[0], t: prog[1] })}</div>}
      <div className="eval-wrap">
        <div className="evalbar" aria-label="evaluation"><div className="evalbar-w" style={{ height: `${evalW}%` }} /></div>
        <Board fen={fens[ply]} orientation={src.playerColor} lastMove={lastMove} arrows={arrows} />
      </div>
      <div className="row nav-row">
        <Btn kind="ghost" onClick={() => setPly(0)}>⏮</Btn>
        <Btn kind="ghost" onClick={() => setPly(Math.max(0, ply - 1))} testId="prev-move">◀</Btn>
        <span className="pill">{ply}/{src.moves.length}</span>
        <Btn kind="ghost" onClick={() => setPly(Math.min(src.moves.length, ply + 1))} testId="next-move">▶</Btn>
        <Btn kind="ghost" onClick={() => setPly(src.moves.length)}>⏭</Btn>
      </div>
      {cur && (
        <div className={`feedback cls-${cur.cls}`}>
          <b>{Math.ceil(cur.ply / 2 + 0.5)}. {cur.san}</b> — {t(`cls.${cur.cls}`)}
          {cur.cls !== 'best' && cur.bestSan ? ` · ${t('bestWas', { m: cur.bestSan })}` : ''}
        </div>
      )}
      {a && (
        <>
          <Card>
            <div className="stats">
              <div>
                <div className="label">{t('accuracy')} ({t('you')})</div>
                <div className="value" data-testid="accuracy">{Math.round(a.accuracy[src.playerColor])}%</div>
              </div>
              {(['inaccuracy', 'mistake', 'blunder'] as const).map((k) => (
                <div key={k}>
                  <div className="label">{t(`cls.${k}`)}</div>
                  <div className="value">{a.counts[src.playerColor][k]}</div>
                </div>
              ))}
            </div>
            {a.turningPoint !== null && (
              <button className="link-btn" onClick={() => setPly(a.turningPoint! + 1)}>
                ↯ {t('turningPoint')}: {sans[a.turningPoint]}
              </button>
            )}
          </Card>
          {added > 0 && <div className="banner good">{t('addedToNotebook', { n: added })}</div>}
          <h3>{t('keyMoments')}</h3>
          {a.keyMoments.length === 0 && <p className="muted">{t('noKeyMoments')}</p>}
          {a.keyMoments.map((i) => {
            const p = a.plies[i];
            const steps = explainMove(p);
            const shown = reveal[i] ?? 1;
            return (
              <Card key={i} className="moment">
                <button className="link-btn" onClick={() => setPly(i)}>
                  <b>{Math.floor(i / 2) + 1}{p.color === 'w' ? '.' : '…'} {p.san}</b> — {t(`cls.${p.cls}`)}
                  {p.errorType && <span className="tag">{ERROR_TYPE_NAMES[p.errorType][lang]}</span>}
                </button>
                {steps.slice(0, shown).map((s, k) => (
                  <div key={k} className={`coach-step ${s.level}`}>
                    <span className="label">{t(`coach.${s.level}`)}</span> {tl(s.text)}
                  </div>
                ))}
                {shown < steps.length && (
                  <Btn kind="soft" onClick={() => setReveal({ ...reveal, [i]: shown + 1 })} testId={`reveal-${i}`}>
                    {t('revealMore')} ({shown}/{steps.length})
                  </Btn>
                )}
                {rec && <Btn kind="ghost" onClick={() => go(`drill/nb-${src.id}-${p.ply}`)}>{t('trainThis')}</Btn>}
              </Card>
            );
          })}
          <p className="muted small">{t('coachDisclaimer', { d: a.depth })}</p>
        </>
      )}
      <ol className="movelist clickable">
        {sans.map((s, i) => (
          <li key={i} className={`${i === ply - 1 ? 'on' : ''} ${a ? `cls-${a.plies[i]?.cls}` : ''}`} onClick={() => setPly(i + 1)}>
            {i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{s}
          </li>
        ))}
      </ol>
      <div className="actions row">
        <Btn kind="ghost" onClick={() => { navigator.clipboard?.writeText(pgn()); }}>{t('exportPgn')}</Btn>
        <Btn onClick={() => go(rec?.mode === 'level' && rec.levelId ? `level/${rec.levelId}` : rec?.mode === 'placement' ? 'diagnostic' : 'play')} testId="after-analysis">
          {t('next')}
        </Btn>
      </div>
    </Screen>
  );
}
