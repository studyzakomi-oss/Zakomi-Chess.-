import { useMemo, useState } from 'react';
import { useStore, useT } from '../store';
import { go } from '../router';
import { Btn, Card, Screen, Speaker, EngineBanner } from '../components/common';
import { PuzzleRunner } from '../components/PuzzleRunner';
import { Board } from '../components/Board';
import { ALL_PUZZLES, PUZZLES_BY_ID } from '../../content/index';
import { buildDailySession, recordPuzzle, reviewNotebook } from '../../core/training/progress';
import { SKILL_NAMES } from '../skillNames';
import { getEngine } from '../../core/engine/engineService';
import { scoreValue } from '../../core/engine/uci';
import { Chess, parseUci, type Square, type PieceSymbol } from '../../core/chess/game';
import { play } from '../sound';

export function Training() {
  const { profile, update } = useStore();
  const { t, tl } = useT();
  const session = useMemo(() => buildDailySession(profile, ALL_PUZZLES), []); // eslint-disable-line react-hooks/exhaustive-deps
  const items = [...session.notebook.map((id) => ({ kind: 'nb' as const, id })), ...session.puzzles.map((id) => ({ kind: 'pz' as const, id }))];
  const [i, setI] = useState(-1);
  const [score, setScore] = useState(0);

  if (items.length === 0)
    return (
      <Screen title={t('dailyTraining')} onBack={() => go('home')}>
        <Speaker who="ustad" name={t('ustadSays')} text={t('nothingDue')} />
        <Btn onClick={() => go('worlds')}>{t('continue')}</Btn>
      </Screen>
    );
  if (i === -1)
    return (
      <Screen title={t('dailyTraining')} onBack={() => go('home')}>
        <Speaker who="ustad" name={t('ustadSays')} text={t('dailyIntro')} />
        <Card>
          <div className="label">{t('focusSkills')}</div>
          <div className="tags">{session.skills.map((s) => <span key={s} className="tag">{tl(SKILL_NAMES[s])}</span>)}</div>
          <p className="muted small">{items.length} ×</p>
          <Btn onClick={() => setI(0)} testId="start-daily">{t('start')}</Btn>
        </Card>
      </Screen>
    );
  if (i >= items.length)
    return (
      <Screen title={t('dailyTraining')} onBack={() => go('home')}>
        <Speaker who="ustad" mood="happy" name={t('ustadSays')} text={t('sessionDone', { s: score, t: items.length })} />
        <Btn onClick={() => go('home')}>{t('done')}</Btn>
      </Screen>
    );
  const it = items[i];
  return (
    <Screen title={`${t('dailyTraining')} ${i + 1}/${items.length}`} onBack={() => go('home')}>
      {it.kind === 'pz' ? (
        <PuzzleRunner
          key={it.id}
          puzzle={PUZZLES_BY_ID[it.id]}
          onDone={(o) => {
            if (o.ok) setScore(score + 1);
            update((p) => recordPuzzle(p, PUZZLES_BY_ID[it.id], { ok: o.ok, hints: o.hints, ms: o.ms, context: 'daily' }));
          }}
          onNext={() => setI(i + 1)}
        />
      ) : (
        <Drill key={it.id} entryId={it.id} onFinish={(ok) => { if (ok) setScore(score + 1); setI(i + 1); }} />
      )}
    </Screen>
  );
}

/** Re-solve a position from the notebook. Puzzle-sourced entries reuse the puzzle; game-sourced ones are engine-checked. */
export function Drill({ entryId, onFinish }: { entryId: string; onFinish: (ok: boolean) => void }) {
  const { profile, update } = useStore();
  const { t } = useT();
  const entry = profile.notebook.find((n) => n.id === entryId);
  const [fen, setFen] = useState(entry?.fen ?? '');
  const [state, setState] = useState<'try' | 'checking' | 'ok' | 'bad'>('try');
  const [note, setNote] = useState('');
  if (!entry) return <p className="muted">—</p>;
  if (entry.source === 'puzzle' && entry.puzzleId) {
    const pz = PUZZLES_BY_ID[entry.puzzleId];
    return (
      <PuzzleRunner
        puzzle={pz}
        onDone={(o) => update((p) => reviewNotebook(recordPuzzle(p, pz, { ok: o.ok, hints: o.hints, ms: o.ms, context: 'notebook' }), entryId, o.ok && o.hints === 0))}
        onNext={() => onFinish(true)}
      />
    );
  }
  const color = new Chess(entry.fen).turn();

  async function check(from: Square, to: Square, promotion?: PieceSymbol) {
    const uci = from + to + (promotion ?? '');
    const c = new Chess(entry!.fen);
    try {
      c.move({ from, to, promotion });
    } catch {
      return;
    }
    setFen(c.fen());
    setState('checking');
    let ok = uci === entry!.best;
    try {
      if (!ok) {
        const e = await getEngine();
        const best = await e.search({ fen: entry!.fen, depth: 12, searchMoves: entry!.best ? [entry!.best] : undefined });
        const mine = await e.search({ fen: entry!.fen, depth: 12, searchMoves: [uci] });
        const loss = scoreValue(best.lines[0]) - scoreValue(mine.lines[0]);
        ok = loss <= 50 && uci !== entry!.played;
        setNote(`Δ ${(loss / 100).toFixed(1)}`);
      }
    } catch {
      setNote(t('engineError'));
    }
    setState(ok ? 'ok' : 'bad');
    play(ok ? 'success' : 'fail', profile.settings.sound);
    update((p) => reviewNotebook(p, entryId, ok));
  }

  const best = entry.best ? parseUci(entry.best) : null;
  return (
    <div>
      <EngineBanner />
      <p className="prompt">{t('findBest', { m: entry.playedSan ?? '?' })}</p>
      <Board
        fen={fen}
        orientation={color}
        movable={state === 'try' ? color : null}
        onMove={check}
        arrows={state === 'bad' && best ? [{ from: best.from, to: best.to, color: '#22c55e' }] : []}
        showLegal={profile.settings.showLegal}
      />
      {state === 'checking' && <div className="banner info">{t('engineChecks')}</div>}
      {state === 'ok' && <div className="feedback good">{t('correct')} {note}</div>}
      {state === 'bad' && <div className="feedback bad">{t('wrongFinal')} {entry.bestSan ? t('bestWas', { m: entry.bestSan }) : ''} {note}</div>}
      {(state === 'ok' || state === 'bad') && (
        <div className="row">
          {state === 'bad' && <Btn kind="ghost" onClick={() => { setFen(entry.fen); setState('try'); }}>{t('retry')}</Btn>}
          <Btn onClick={() => onFinish(state === 'ok')} testId="drill-next">{t('next')}</Btn>
        </div>
      )}
    </div>
  );
}
