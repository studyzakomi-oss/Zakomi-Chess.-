import { useStore, useT } from '../store';
import { go } from '../router';
import { Btn, Card, Screen, Speaker } from '../components/common';
import { buildReport } from '../../core/diagnostic/report';
import { Portrait } from '../components/Portrait';

export function Report() {
  const { profile } = useStore();
  const { t } = useT();
  const r = buildReport(profile);
  const hasData = r.puzzlesUsed > 0 || r.gamesUsed > 0;
  return (
    <Screen title={t('report')} onBack={() => go('home')}>
      {!hasData ? (
        <Card>
          <p>{t('noData')}</p>
          <Btn onClick={() => go('onboarding')}>{t('beginDiagnostic')}</Btn>
        </Card>
      ) : (
        <>
          <Card className="report-head">
            <Portrait id="zakomi" mood="focus" size={80} />
            <div>
              <div className="label">{t('skillLevel')}</div>
              <div className="big" data-testid="report-band">{t(`band.${r.band}`)}</div>
              <div className="label">{t('estimatedRange')}</div>
              <div className="value" data-testid="report-range">
                {r.range.lo}–{r.range.hi} · {t('confidence')}: {t(`conf.${r.range.confidence}`)}
              </div>
              <div className="muted small">{t('basedOn', { p: r.puzzlesUsed, g: r.gamesUsed })}</div>
            </div>
          </Card>
          {r.puzzleOnly && <div className="banner info">{t('puzzleOnlyNote')}</div>}
          <p className="muted small">{t('ratingDisclaimer')}</p>
          <div className="two-col">
            <Card>
              <h3>{t('strengths')}</h3>
              <ol>{r.strengths.map((a) => <li key={a}>{t(`cat.${a}`)}</li>)}</ol>
            </Card>
            <Card>
              <h3>{t('weaknesses')}</h3>
              <ol>{r.weaknesses.map((a) => <li key={a}>{t(`cat.${a}`)}</li>)}</ol>
            </Card>
          </div>
          <Card>
            <h3>{t('frequentErrors')}</h3>
            {r.frequentErrors.length ? (
              <ul>{r.frequentErrors.map((e) => <li key={e.type}>{t(`err.${e.type}`)} × {e.count}</li>)}</ul>
            ) : (
              <p className="muted">{t('noData')}</p>
            )}
          </Card>
          <Card>
            <h3>{t('diagnostic')}</h3>
            <table className="table">
              <tbody>
                {r.categories.filter((c) => c.attempts).map((c) => (
                  <tr key={c.category}>
                    <td>{t(`cat.${c.category}`)}</td>
                    <td>{c.correct}/{c.attempts}</td>
                    <td className="muted">{t('hint')}: {c.hints}</td>
                    <td className="muted">{Math.round(c.avgTimeMs / 1000)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <h3>{t('plan')}</h3>
            <ol>
              {r.plan.map((c) => <li key={c}>{t(`cat.${c}`)}</li>)}
              <li>{t('dailyTraining')}</li>
            </ol>
          </Card>
          <Speaker who="ustad" name={t('ustadSays')} text={t('ratingDisclaimer')} />
          <div className="actions">
            <Btn onClick={() => go('worlds')} testId="go-campaign">{t('goCampaign')}</Btn>
          </div>
        </>
      )}
    </Screen>
  );
}
