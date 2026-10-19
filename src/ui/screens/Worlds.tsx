import { useStore, useT } from '../store';
import { go } from '../router';
import { Bar, Card, Screen } from '../components/common';
import { Portrait } from '../components/Portrait';
import { WORLDS } from '../../content/curriculum';
import { isLevelUnlocked, isWorldComplete, levelProgress, worldPercent } from '../../core/training/progress';
import { CHARACTERS } from '../../content/characters';

export function Worlds() {
  const { profile } = useStore();
  const { t, tl } = useT();
  return (
    <Screen title={t('worlds')} onBack={() => go('home')}>
      <div className="starmap">
        {WORLDS.map((w, i) => {
          const prevDone = i === 0 || isWorldComplete(profile, WORLDS[i - 1]);
          const open = w.available && prevDone;
          const pct = worldPercent(profile, w);
          return (
            <div key={w.key} className={`world-node ${open ? 'open' : 'locked'}`}>
              {i > 0 && <div className="link" aria-hidden="true" />}
              <Card className="world-card" onClick={open ? () => go(`world/${w.index}`) : undefined}>
                <div className="planet" style={{ ['--h' as string]: w.hue }} aria-hidden="true">
                  <span>{w.index}</span>
                </div>
                <div className="world-info">
                  <div className="world-name">{w.name}</div>
                  <div className="world-title">{tl(w.title)} — {tl(w.subtitle)}</div>
                  <div className="muted small">{t('difficultyN', { n: w.difficulty })} · {t('guardian')}: {CHARACTERS[w.guardian].name}</div>
                  <div className="tags">{w.topics.map((x, k) => <span key={k} className="tag">{tl(x)}</span>)}</div>
                  {w.available ? <Bar value={pct} /> : <div className="muted small">🔒 {t('comingSoon')}</div>}
                  {w.available && !open && <div className="muted small">🔒 {t('unlockRule')}</div>}
                </div>
                <Portrait id={w.guardian} size={56} />
              </Card>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

export function WorldScreen({ index }: { index: number }) {
  const { profile } = useStore();
  const { t, tl } = useT();
  const w = WORLDS.find((x) => x.index === index) ?? WORLDS[0];
  return (
    <Screen title={`${w.name}`} onBack={() => go('worlds')}>
      <p className="muted">{tl(w.subtitle)}</p>
      {w.levels.map((lv) => {
        const open = isLevelUnlocked(profile, w, lv);
        const pr = levelProgress(profile, lv.id);
        return (
          <Card key={lv.id} className={`level-card ${open ? '' : 'locked'}`} onClick={open ? () => go(`level/${lv.id}`) : undefined}>
            <div className="level-num">{pr.passed ? '✓' : open ? lv.index : '🔒'}</div>
            <div>
              <div className="label">{t('level', { n: lv.index })}</div>
              <div className="value">{tl(lv.title)}</div>
              <div className="muted small">
                {pr.passed ? t('levelPassed') : open ? `${t('step.mastery')}: ${Math.round(pr.masteryBest * 100)}%` : t('locked')}
              </div>
            </div>
          </Card>
        );
      })}
    </Screen>
  );
}
