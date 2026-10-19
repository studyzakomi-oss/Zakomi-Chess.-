import { useRoute } from './router';
import { Home } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import { Diagnostic } from './screens/Diagnostic';
import { Report } from './screens/Report';
import { Worlds, WorldScreen } from './screens/Worlds';
import { LevelScreen } from './screens/Level';
import { Play } from './screens/Play';
import { Match } from './screens/Match';
import { AnalysisScreen } from './screens/Analysis';
import { Training } from './screens/Training';
import { Notebook, DrillScreen } from './screens/Notebook';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { ImportPgn } from './screens/Import';

export function App() {
  const r = useRoute();
  const key = r.name + '/' + r.params.join('/');
  switch (r.name) {
    case 'onboarding':
      return <Onboarding key={key} />;
    case 'diagnostic':
      return <Diagnostic key={key} />;
    case 'report':
      return <Report key={key} />;
    case 'worlds':
      return <Worlds key={key} />;
    case 'world':
      return <WorldScreen key={key} index={Number(r.params[0] ?? 1)} />;
    case 'level':
      return <LevelScreen key={key} id={r.params[0]} />;
    case 'play':
      return <Play key={key} />;
    case 'match':
      return <Match key={key} />;
    case 'analysis':
      return <AnalysisScreen key={key} id={r.params[0]} />;
    case 'train':
      return <Training key={key} />;
    case 'notebook':
      return <Notebook key={key} />;
    case 'drill':
      return <DrillScreen key={key} id={r.params[0]} />;
    case 'progress':
      return <Progress key={key} />;
    case 'settings':
      return <Settings key={key} />;
    case 'import':
      return <ImportPgn key={key} />;
    default:
      return <Home key={key} />;
  }
}
