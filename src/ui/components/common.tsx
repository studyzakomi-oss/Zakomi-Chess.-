import { useEffect, useState, type ReactNode } from 'react';
import { engineStatus, onEngineStatus, type EngineStatus } from '../../core/engine/engineService';
import { Portrait } from './Portrait';
import type { CharacterId, Mood } from '../../content/characters';
import { back } from '../router';
import { useT } from '../store';
import { ratingRange } from '../../core/rating/display';
import type { Rating } from '../../core/rating/glicko2';

export function Screen({ title, children, onBack, actions }: { title?: string; children: ReactNode; onBack?: () => void; actions?: ReactNode }) {
  const { t } = useT();
  return (
    <div className="screen">
      {title !== undefined && (
        <header className="topbar">
          <button className="icon-btn" onClick={onBack ?? (() => back())} aria-label={t('back')}>
            <span className="chev" aria-hidden="true">‹</span>
          </button>
          <h1>{title}</h1>
          <div className="topbar-actions">{actions}</div>
        </header>
      )}
      <main className="screen-body">{children}</main>
    </div>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <section className={`card ${onClick ? 'clickable' : ''} ${className ?? ''}`} onClick={onClick}>
      {children}
    </section>
  );
}

export function Btn({ children, onClick, kind = 'primary', disabled, className, testId }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'ghost' | 'danger' | 'soft'; disabled?: boolean; className?: string; testId?: string }) {
  return (
    <button className={`btn btn-${kind} ${className ?? ''}`} onClick={onClick} disabled={disabled} data-testid={testId}>
      {children}
    </button>
  );
}

export function Bar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Speaker({ who, mood, text, name, side = 'start' }: { who: CharacterId; mood?: Mood; text: string; name?: string; side?: 'start' | 'end' }) {
  return (
    <div className={`speaker speaker-${side}`}>
      <Portrait id={who} mood={mood} size={56} />
      <div className="bubble">
        {name && <div className="bubble-name">{name}</div>}
        <div>{text}</div>
      </div>
    </div>
  );
}

export function useEngineStatus(): EngineStatus {
  const [s, setS] = useState(engineStatus().status);
  useEffect(() => {
    const off = onEngineStatus(setS);
    return () => {
      off();
    };
  }, []);
  return s;
}

export function EngineBanner() {
  const s = useEngineStatus();
  const { t } = useT();
  if (s === 'loading') return <div className="banner info">{t('engineLoading')}</div>;
  if (s === 'error') return <div className="banner error">{t('engineError')}</div>;
  return null;
}

export function RatingText({ rating }: { rating: Rating }) {
  const { t } = useT();
  const rr = ratingRange(rating);
  return (
    <span className="rating-text">
      {rr.point !== null ? <b>{rr.point}</b> : <b>{rr.lo}–{rr.hi}</b>}
      <small>
        {' '}· {t('confidence')}: {t(`conf.${rr.confidence}`)}
        {rr.provisional ? ` · ${t('provisional')}` : ''}
      </small>
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-ui" aria-hidden="true" />
    </label>
  );
}
