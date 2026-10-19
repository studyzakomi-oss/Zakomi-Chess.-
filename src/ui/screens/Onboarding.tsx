import { useState } from 'react';
import { useStore, useT } from '../store';
import { go } from '../router';
import { Btn, Card, Screen, Speaker } from '../components/common';
import { Portrait } from '../components/Portrait';
import { createDiagnostic, type Experience } from '../../core/diagnostic/diagnostic';
import { LANG_NAMES } from '../../i18n/ui';
import type { Lang } from '../../content/types';

export function Onboarding() {
  const { profile, update } = useStore();
  const { t } = useT();
  const [name, setName] = useState(profile.name);
  const [exp, setExp] = useState<Experience>(profile.onboarding.experience ?? 'rules');

  function begin() {
    update((p) => ({
      ...p,
      name: name.trim() || 'Zakomi',
      onboarding: { ...p.onboarding, experience: exp, diagnostic: createDiagnostic(exp), placementGameIds: [], completed: false },
    }));
    go('diagnostic');
  }

  function skip() {
    update((p) => ({ ...p, name: name.trim() || 'Zakomi', onboarding: { ...p.onboarding, experience: exp, completed: true } }));
    go('level/w1-l1');
  }

  return (
    <Screen title={t('welcomeTitle')} onBack={() => go('home')}>
      <div className="center">
        <Portrait id="zakomi" mood="happy" size={110} />
        <Portrait id="ustad" mood="neutral" size={90} />
      </div>
      <Speaker who="ustad" name={t('ustadSays')} text={t('welcomeBody')} />
      <Card>
        <div className="lang-row">
          {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
            <button key={l} className={`chip ${profile.settings.lang === l ? 'on' : ''}`} onClick={() => update((p) => ({ ...p, settings: { ...p.settings, lang: l } }))}>
              {LANG_NAMES[l]}
            </button>
          ))}
        </div>
        <label className="field">
          <span>{t('yourName')}</span>
          <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} data-testid="name-input" />
        </label>
        <div className="label">{t('experienceQ')}</div>
        <div className="choices">
          {(['new', 'rules', 'casual', 'club'] as Experience[]).map((e) => (
            <button key={e} className={`choice ${exp === e ? 'on' : ''}`} onClick={() => setExp(e)} data-testid={`exp-${e}`}>
              {t(`exp.${e}`)}
            </button>
          ))}
        </div>
      </Card>
      <div className="actions">
        <Btn onClick={begin} testId="begin-diagnostic">{t('beginDiagnostic')}</Btn>
        {exp === 'new' && <Btn kind="ghost" onClick={skip}>{t('skipToLessons')}</Btn>}
      </div>
    </Screen>
  );
}
