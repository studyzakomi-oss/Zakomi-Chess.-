import { useStore, useT } from '../store';
import { go } from '../router';
import { Card, RatingText, Screen } from '../components/common';
import { skillStatuses } from '../../core/training/progress';
import { SKILL_NAMES } from '../skillNames';
import { CHARACTERS } from '../../content/characters';
import type { SkillId } from '../../content/types';
import { retention } from '../../core/training/srs';

function RatingChart({ points }: { points: { r: number; rd: number }[] }) {
  if (points.length < 2) return null;
  const W = 320;
  const H = 140;
  const lo = Math.min(...points.map((p) => p.r - p.rd)) - 20;
  const hi = Math.max(...points.map((p) => p.r + p.rd)) + 20;
  const x = (i: number) => 12 + (i / (points.length - 1)) * (W - 24);
  const y = (v: number) => H - 12 - ((v - lo) / (hi - lo)) * (H - 24);
  const band = points.map((p, i) => `${x(i)},${y(p.r + p.rd)}`).join(' ') + ' ' + [...points].reverse().map((p, i) => `${x(points.length - 1 - i)},${y(p.r - p.rd)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="rating history">
      <polygon points={band} fill="var(--accent)" opacity={0.15} />
      <polyline points={points.map((p, i) => `${x(i)},${y(p.r)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.r)} r={3} fill="var(--accent)" />)}
      <text x={6} y={14} className="chart-label">{Math.round(hi)}</text>
      <text x={6} y={H - 2} className="chart-label">{Math.round(lo)}</text>
    </svg>
  );
}

export function Progress() {
  const { profile } = useStore();
  const { t, tl, lang } = useT();
  const st = skillStatuses(profile);
  const solved = profile.puzzleLog.filter((e) => e.ok).length;
  return (
    <Screen title={t('progress')} onBack={() => go('home')}>
      <Card>
        <div className="label">{t('rating')}</div>
        <RatingText rating={profile.rating} />
        <p className="muted small">{t('ratingDisclaimer')}</p>
        <h3>{t('ratingHistory')}</h3>
        <RatingChart points={profile.ratingHistory} />
        {profile.ratingHistory.length < 2 && <p className="muted">{t('noData')}</p>}
      </Card>
      <Card>
        <div className="stats">
          <div><div className="label">{t('gamesPlayed')}</div><div className="value">{profile.games.length}</div></div>
          <div><div className="label">{t('puzzlesSolved')}</div><div className="value">{solved}</div></div>
          <div><div className="label">{t('masteredSkills')}</div><div className="value">{Object.values(st).filter((s) => s === 'mastered').length}</div></div>
        </div>
      </Card>
      <Card>
        <h3>{t('skillsTitle')}</h3>
        {Object.keys(st).length === 0 && <p className="muted">{t('noData')}</p>}
        <ul className="skills">
          {(Object.keys(st) as SkillId[]).map((k) => {
            const s = profile.skills[k]!;
            return (
              <li key={k} className={`ss-${st[k]}`}>
                <span>{tl(SKILL_NAMES[k])}</span>
                <span className="muted small">{t(`ss.${st[k]}`)} · {Math.round(s.strength * 100)}% · {t('dueOn', { d: new Date(s.due).toLocaleDateString(lang) })} · R {Math.round(retention(s) * 100)}%</span>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <h3>{t('recentGames')}</h3>
        <ul className="games">
          {[...profile.games].reverse().slice(0, 15).map((g) => (
            <li key={g.id} onClick={() => go(`analysis/${g.id}`)}>
              <span>{new Date(g.t).toLocaleDateString(lang)}</span>
              <span>{CHARACTERS[g.bot].name}</span>
              <span>{g.result}</span>
              <span className="muted">{g.analysis ? `${Math.round(g.analysis.accuracy)}%` : ''}</span>
            </li>
          ))}
        </ul>
      </Card>
    </Screen>
  );
}
