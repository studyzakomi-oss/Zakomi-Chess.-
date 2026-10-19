import { useMemo, useState } from 'react';
import { useStore, useT } from '../store';
import { go } from '../router';
import { Btn, Card, Screen, Speaker } from '../components/common';
import { Board } from '../components/Board';
import { PuzzleRunner } from '../components/PuzzleRunner';
import { LEVELS_BY_ID, WORLDS } from '../../content/curriculum';
import { PUZZLES_BY_ID } from '../../content/index';
import { evaluateLevelPass, isLevelUnlocked, levelProgress, patchLevel, pickMasteryQuestions, recordPuzzle } from '../../core/training/progress';
import { Chess, parseUci, type Square } from '../../core/chess/game';
import { createGame } from '../startGame';
import { CHARACTERS, lineFor } from '../../content/characters';
import { Portrait } from '../components/Portrait';
import { play } from '../sound';

type Step = 'lesson' | 'example' | 'exercises' | 'match' | 'mastery';
const STEPS: Step[] = ['lesson', 'example', 'exercises', 'match', 'mastery'];

export function LevelScreen({ id }: { id: string }) {
  const { profile, update } = useStore();
  const { t, tl } = useT();
  const level = LEVELS_BY_ID[id];
  const world = WORLDS.find((w) => w.index === level?.world);
  const pr = levelProgress(profile, id);
  const firstOpen: Step = !pr.lessonDone ? 'lesson' : !pr.exampleDone ? 'example' : pr.exercisesDone.length < (level?.exercises.length ?? 0) ? 'exercises' : !pr.matchPlayed ? 'match' : 'mastery';
  const [step, setStep] = useState<Step>(firstOpen);
  if (!level || !world) return <Screen title="?">—</Screen>;
  if (!isLevelUnlocked(profile, world, level)) {
    go(`world/${world.index}`);
    return null;
  }
  const done: Record<Step, boolean> = {
    lesson: pr.lessonDone,
    example: pr.exampleDone,
    exercises: pr.exercisesDone.length >= level.exercises.length,
    match: pr.matchPlayed,
    mastery: pr.masteryBest >= level.passRatio,
  };
  return (
    <Screen title={`${t('level', { n: level.index })} · ${tl(level.title)}`} onBack={() => go(`world/${world.index}`)}>
      <nav className="stepper">
        {STEPS.map((s, i) => (
          <button key={s} className={`step ${s === step ? 'on' : ''} ${done[s] ? 'done' : ''}`} onClick={() => setStep(s)} data-testid={`step-${s}`}>
            <span className="step-n">{done[s] ? '✓' : i + 1}</span>
            <span className="step-l">{t(`step.${s}`)}</span>
          </button>
        ))}
      </nav>
      {pr.passed && <div className="banner good">✓ {t('levelPassed')}</div>}
      {step === 'lesson' && <Lesson id={id} onDone={() => { update((p) => patchLevel(p, id, { lessonDone: true })); setStep('example'); }} />}
      {step === 'example' && <Example id={id} onDone={() => { update((p) => patchLevel(p, id, { exampleDone: true })); setStep('exercises'); }} />}
      {step === 'exercises' && <Exercises id={id} onDone={() => setStep('match')} />}
      {step === 'match' && (
        <Card>
          <div className="row">
            <Portrait id={level.match.bot} size={80} />
            <div>
              <b>{CHARACTERS[level.match.bot].name}</b> — {tl(CHARACTERS[level.match.bot].title)}
              <div className="muted small">{tl(CHARACTERS[level.match.bot].bio)}</div>
              <div className="muted small">{t('playAs', { side: level.match.playerColor === 'w' ? t('white') : t('black') })} · {t('nominal', { n: level.match.nominal })}</div>
            </div>
          </div>
          <Speaker who={level.match.bot} text={tl(lineFor(level.match.bot, 'greet') ?? undefined)} />
          {pr.matchPlayed && <p className="muted">✓ {t('step.match')} ({pr.matchResult})</p>}
          <Btn
            testId="start-level-match"
            onClick={() => {
              update((p) => ({ ...p, activeGame: createGame({ mode: 'level', levelId: id, bot: level.match.bot, nominal: level.match.nominal, color: level.match.playerColor }) }));
              go('match');
            }}
          >
            {t('start')}
          </Btn>
          <p className="muted small">{t('nominalNote')}</p>
        </Card>
      )}
      {step === 'mastery' && <Mastery id={id} />}
    </Screen>
  );
}

function Lesson({ id, onDone }: { id: string; onDone: () => void }) {
  const { t, tl } = useT();
  const level = LEVELS_BY_ID[id];
  const [i, setI] = useState(0);
  const st = level.lesson[i];
  return (
    <div>
      {i === 0 && <Speaker who="ustad" name={t('ustadSays')} text={tl(level.ustadIntro)} />}
      {st.fen && <Board fen={st.fen} arrows={(st.arrows ?? []).map(([from, to]) => ({ from, to }))} highlights={st.highlights} />}
      <Speaker who="ustad" mood="think" name={`${t('step.lesson')} ${i + 1}/${level.lesson.length}`} text={tl(st.text)} />
      <div className="actions row">
        {i > 0 && <Btn kind="ghost" onClick={() => setI(i - 1)}>{t('back')}</Btn>}
        {i < level.lesson.length - 1 ? (
          <Btn onClick={() => setI(i + 1)} testId="lesson-next">{t('next')}</Btn>
        ) : (
          <Btn onClick={onDone} testId="lesson-done">{t('done')}</Btn>
        )}
      </div>
    </div>
  );
}

function Example({ id, onDone }: { id: string; onDone: () => void }) {
  const { t, tl } = useT();
  const { profile } = useStore();
  const ex = LEVELS_BY_ID[id].example;
  const [fen, setFen] = useState(ex.fen);
  const [state, setState] = useState<'try' | 'wrong' | 'ok'>('try');
  const color = new Chess(ex.fen).turn();
  const target = parseUci(ex.move);
  return (
    <div>
      <Speaker who="ustad" name={t('ustadSays')} text={tl(ex.text)} />
      <Board
        fen={fen}
        orientation={color}
        movable={state === 'ok' ? null : color}
        lastMove={state === 'ok' ? [target.from, target.to] : null}
        highlights={state === 'wrong' ? [target.from] : []}
        showLegal={profile.settings.showLegal}
        onMove={(from: Square, to: Square, promo) => {
          if (from + to + (promo ?? '') === ex.move || (from + to === ex.move.slice(0, 4) && !promo)) {
            const c = new Chess(ex.fen);
            c.move({ from, to, promotion: promo });
            setFen(c.fen());
            setState('ok');
            play('success', profile.settings.sound);
          } else {
            setState('wrong');
            play('fail', profile.settings.sound);
          }
        }}
      />
      {state === 'wrong' && <div className="feedback bad">{t('wrong')} {t('tryMove')}</div>}
      {state === 'ok' && (
        <div className="feedback good">
          <Speaker who="ustad" mood="happy" name={t('ustadSays')} text={tl(ex.success)} />
          <Btn onClick={onDone} testId="example-done">{t('next')}</Btn>
        </div>
      )}
    </div>
  );
}

function Exercises({ id, onDone }: { id: string; onDone: () => void }) {
  const { profile, update } = useStore();
  const { t } = useT();
  const level = LEVELS_BY_ID[id];
  const pr = levelProgress(profile, id);
  const firstTodo = level.exercises.findIndex((e) => !pr.exercisesDone.includes(e));
  const [i, setI] = useState(firstTodo === -1 ? 0 : firstTodo);
  const pz = PUZZLES_BY_ID[level.exercises[i]];
  return (
    <PuzzleRunner
      key={pz.id + i}
      puzzle={pz}
      header={`${t('step.exercises')} ${i + 1}/${level.exercises.length}`}
      maxAttempts={3}
      onDone={(o) =>
        update((p) => {
          const cur = levelProgress(p, id);
          const np = recordPuzzle(p, pz, { ok: o.ok, hints: o.hints, ms: o.ms, context: 'lesson' });
          return patchLevel(np, id, { exercisesDone: [...new Set([...cur.exercisesDone, pz.id])] });
        })
      }
      onNext={() => (i + 1 < level.exercises.length ? setI(i + 1) : onDone())}
    />
  );
}

function Mastery({ id }: { id: string }) {
  const { profile, update } = useStore();
  const { t } = useT();
  const level = LEVELS_BY_ID[id];
  const [round, setRound] = useState(0);
  const qs = useMemo(() => pickMasteryQuestions(level, Math.random), [level, round]);
  const [i, setI] = useState(-1);
  const [score, setScore] = useState(0);
  const pr = levelProgress(profile, id);
  if (i === -1)
    return (
      <Card>
        <p>{t('masteryRule', { pct: Math.round(level.passRatio * 100) })}</p>
        {pr.masteryAttempts > 0 && <p className="muted">{t('masteryScore', { s: Math.round(pr.masteryBest * level.masteryCount), t: level.masteryCount })}</p>}
        {!pr.matchPlayed && <p className="muted small">{t('needMatch')}</p>}
        <Btn onClick={() => { setScore(0); setI(0); }} testId="start-mastery">{t('start')}</Btn>
      </Card>
    );
  if (i >= qs.length) {
    const ratio = score / qs.length;
    const passed = ratio >= level.passRatio;
    return (
      <Card>
        <h3 data-testid="mastery-result">{t('masteryScore', { s: score, t: qs.length })}</h3>
        <Speaker who="ustad" mood={passed ? 'celebrate' : 'neutral'} name={t('ustadSays')} text={passed ? t('masteryPassed') : t('masteryFailed')} />
        {passed && !pr.matchPlayed && <p className="banner info">{t('needMatch')}</p>}
        <div className="actions row">
          <Btn kind="ghost" onClick={() => { setRound(round + 1); setI(-1); }}>{t('retry')}</Btn>
          <Btn onClick={() => go(`world/${level.world}`)}>{t('next')}</Btn>
        </div>
      </Card>
    );
  }
  const pz = PUZZLES_BY_ID[qs[i]];
  return (
    <PuzzleRunner
      key={`${round}-${i}`}
      puzzle={pz}
      maxAttempts={1}
      header={`${t('step.mastery')} ${i + 1}/${qs.length}`}
      onDone={(o) => {
        const pts = o.ok ? (o.hints === 0 ? 1 : 0.5) : 0;
        const ns = score + pts;
        setScore(ns);
        update((p) => {
          let np = recordPuzzle(p, pz, { ok: o.ok, hints: o.hints, ms: o.ms, context: 'mastery' });
          if (i === qs.length - 1) {
            const cur = levelProgress(np, id);
            np = patchLevel(np, id, { masteryAttempts: cur.masteryAttempts + 1, masteryBest: Math.max(cur.masteryBest, ns / qs.length) });
            np = evaluateLevelPass(np, level);
          }
          return np;
        });
      }}
      onNext={() => setI(i + 1)}
    />
  );
}
