import { useState } from 'react';
import { useStore, useT } from '../store';
import { go } from '../router';
import { Btn, Card, Screen, Toggle } from '../components/common';
import { Portrait } from '../components/Portrait';
import { CHARACTERS } from '../../content/characters';
import { BOT_NOMINAL, type BotId } from '../../core/engine/botProfiles';
import { WORLDS } from '../../content/curriculum';
import { isWorldComplete } from '../../core/training/progress';
import { adaptiveNominal, createGame } from '../startGame';
import type { Settings } from '../../storage/profile';

const GUARDIANS: Exclude<BotId, 'drone'>[] = ['lumo', 'nova', 'shadow', 'architect', 'oracle', 'vektor', 'grandmaster'];

export function Play() {
  const { profile, update } = useStore();
  const { t, tl } = useT();
  const [bot, setBot] = useState<BotId>('drone');
  const [nominal, setNominal] = useState(adaptiveNominal(profile));
  const [color, setColor] = useState<'w' | 'b' | 'random'>('random');
  const [clock, setClock] = useState<Settings['clock']>(profile.settings.clock);
  const [training, setTraining] = useState(false);

  /** A guardian becomes a free-play opponent once the world before theirs is complete. */
  const unlocked = (id: Exclude<BotId, 'drone'>) => {
    const w = WORLDS.find((x) => x.guardian === id);
    if (!w) return false;
    if (w.index === 1) return true;
    return w.available && isWorldComplete(profile, WORLDS[w.index - 2]);
  };

  function start() {
    const n = bot === 'drone' ? nominal : BOT_NOMINAL[bot];
    update((p) => ({ ...p, settings: { ...p.settings, clock }, activeGame: createGame({ mode: 'free', bot, nominal: n, color, clock, training }) }));
    go('match');
  }

  return (
    <Screen title={t('playMatch')} onBack={() => go('home')}>
      {profile.activeGame && (
        <Card className="resume">
          <b>{t('resumeGame')}</b>
          <div className="row">
            <Btn onClick={() => go('match')}>{t('resumeGame')}</Btn>
            <Btn kind="ghost" onClick={() => update((p) => ({ ...p, activeGame: undefined }))}>{t('discardGame')}</Btn>
          </div>
        </Card>
      )}
      <h3>{t('chooseOpponent')}</h3>
      <Card className={`opp ${bot === 'drone' ? 'on' : ''}`} onClick={() => setBot('drone')}>
        <Portrait id="drone" size={56} />
        <div className="grow">
          <b>{CHARACTERS.drone.name}</b> — {t('adaptiveDrone')}
          <input type="range" min={250} max={2500} step={50} value={nominal} onChange={(e) => setNominal(Number(e.target.value))} aria-label="strength" data-testid="drone-strength" />
          <div className="muted small">{t('nominal', { n: nominal })}</div>
        </div>
      </Card>
      {GUARDIANS.map((id) => {
        const ok = unlocked(id);
        const c = CHARACTERS[id];
        return (
          <Card key={id} className={`opp ${bot === id ? 'on' : ''} ${ok ? '' : 'locked'}`} onClick={ok ? () => setBot(id) : undefined}>
            <Portrait id={id} size={56} />
            <div className="grow">
              <b>{c.name}</b> — {tl(c.title)} <span className="tag">{tl(c.style)}</span>
              <div className="muted small">{ok ? `${tl(c.bio)} · ${t('nominal', { n: BOT_NOMINAL[id] })}` : `🔒 ${t('unlockRule')}`}</div>
            </div>
          </Card>
        );
      })}
      <p className="muted small">{t('nominalNote')}</p>
      <Card>
        <div className="label">{t('chooseColor')}</div>
        <div className="lang-row">
          {(['w', 'random', 'b'] as const).map((c) => (
            <button key={c} className={`chip ${color === c ? 'on' : ''}`} onClick={() => setColor(c)}>
              {c === 'w' ? t('white') : c === 'b' ? t('black') : t('random')}
            </button>
          ))}
        </div>
        <div className="label">{t('clock')}</div>
        <div className="lang-row">
          {(['none', '15+10', '10+0', '5+3'] as const).map((c) => (
            <button key={c} className={`chip ${clock === c ? 'on' : ''}`} onClick={() => setClock(c)}>
              {c === 'none' ? t('noClock') : c}
            </button>
          ))}
        </div>
        <Toggle checked={training} onChange={setTraining} label={t('trainingMode')} />
      </Card>
      <div className="actions">
        <Btn onClick={start} testId="start-free-game">{t('start')}</Btn>
        <Btn kind="ghost" onClick={() => go('import')}>{t('importPgn')}</Btn>
      </div>
    </Screen>
  );
}
