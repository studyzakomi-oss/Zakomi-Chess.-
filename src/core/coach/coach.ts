import type { PieceSymbol } from '../chess/game';
import type { ErrorType, Motif, PlyAnalysis } from '../engine/analysis';
import { l, type L, type Lang } from '../../content/types';

export const PIECE_NAMES: Record<PieceSymbol, L> = {
  p: l('البيدق', 'pawn', 'pion'),
  n: l('الحصان', 'knight', 'cavalier'),
  b: l('الفيل', 'bishop', 'fou'),
  r: l('القلعة', 'rook', 'tour'),
  q: l('الوزير', 'queen', 'dame'),
  k: l('الملك', 'king', 'roi'),
};

export const ERROR_TYPE_NAMES: Record<ErrorType, L> = {
  tactical: l('خطأ تكتيكي', 'Tactical error', 'Erreur tactique'),
  planning: l('سوء تخطيط', 'Planning error', 'Erreur de plan'),
  calculation: l('خطأ في الحساب', 'Calculation error', 'Erreur de calcul'),
  time: l('ضعف في إدارة الوقت', 'Time-management error', 'Mauvaise gestion du temps'),
  endgame: l('خطأ في النهاية', 'Endgame error', 'Erreur de finale'),
};

export type CoachLevel = 'question' | 'hint' | 'idea' | 'detail';

export interface CoachStep {
  level: CoachLevel;
  text: L;
}

function fill(t: L, vars: Record<string, string | L>): L {
  const out = { ...t };
  for (const lang of Object.keys(out) as Lang[]) {
    out[lang] = out[lang].replace(/\{(\w+)\}/g, (_, k) => {
      const v = vars[k];
      if (v === undefined) return '';
      return typeof v === 'string' ? v : v[lang];
    });
  }
  return out;
}

const QUESTIONS: Record<Motif | ErrorType, L> = {
  'hung-piece': l(
    'بعد نقلتك، هل بقيت كل قطعك محمية؟ افحص كل قطعة يهاجمها الخصم.',
    'After your move, were all your pieces still protected? Check every piece your opponent attacks.',
    'Après ton coup, toutes tes pièces étaient-elles protégées ? Vérifie chaque pièce attaquée.',
  ),
  'allowed-mate': l(
    'هل فحصت كل الكشوش التي يستطيع الخصم لعبها بعد نقلتك؟',
    'Did you check every check your opponent could play after your move?',
    'As-tu vérifié tous les échecs possibles de l’adversaire après ton coup ?',
  ),
  'missed-mate': l('هل هناك كش يُنهي المباراة فورًا؟', 'Is there a check that ends the game right away?', 'Y a-t-il un échec qui termine la partie tout de suite ?'),
  'missed-win-material': l(
    'هل كانت هناك قطعة للخصم غير محمية أو يمكن مهاجمتها مرتين؟',
    'Was there an enemy piece that was loose, or that you could attack twice?',
    'Y avait-il une pièce adverse non défendue, ou attaquable deux fois ?',
  ),
  'missed-fork': l('هل كانت هناك نقلة تهاجم قطعتين في الوقت نفسه؟', 'Was there a move attacking two pieces at once?', 'Y avait-il un coup attaquant deux pièces à la fois ?'),
  'allowed-fork': l('بعد نقلتك، هل استطاع الخصم مهاجمة قطعتين معًا؟', 'After your move, could your opponent attack two pieces at once?', 'Après ton coup, l’adversaire pouvait-il attaquer deux pièces ?'),
  'allowed-capture': l('ما الذي أصبح ضعيفًا بعد نقلتك؟', 'What became weak after your move?', 'Qu’est-ce qui est devenu faible après ton coup ?'),
  tactical: l('ما التهديد المباشر في الموقف؟', 'What was the direct threat in the position?', 'Quelle était la menace directe ?'),
  planning: l(
    'ما أسوأ قطعة لديك في هذا الموقف؟ وكيف يمكن تحسينها؟',
    'Which of your pieces was worst placed here, and how could you improve it?',
    'Quelle était ta pièce la plus mal placée, et comment l’améliorer ?',
  ),
  calculation: l(
    'عندما بدأت هذه السلسلة من الأخذ أو الكش، هل حسبت رد الخصم حتى النهاية؟',
    'When you started this capture or check, did you calculate the reply to the end?',
    'En lançant cette prise ou cet échec, as-tu calculé la réponse jusqu’au bout ?',
  ),
  time: l('هل أخذت وقتًا كافيًا في هذا الموقف الحاد؟', 'Did you take enough time in this sharp position?', 'As-tu pris assez de temps dans cette position tendue ?'),
  endgame: l(
    'في النهايات: هل ملكك نشيط؟ وهل يوجد بيدق يمكن ترقيته؟',
    'In the endgame: is your king active? Is there a pawn that can promote?',
    'En finale : ton roi est-il actif ? Un pion peut-il aller à dame ?',
  ),
};

/**
 * Builds the graded explanation (question → hint → idea → detailed engine line) for one move.
 * Concrete facts (best move, opponent reply, hung piece, line) come from Stockfish output;
 * the wording is a simplified, rule-based summary and is labelled as such in the UI.
 */
export function explainMove(p: PlyAnalysis): CoachStep[] {
  const main: Motif | ErrorType = p.motifs[0] ?? p.errorType ?? 'planning';
  const steps: CoachStep[] = [{ level: 'question', text: QUESTIONS[main] }];
  const best = p.bestSan ?? '?';

  if (p.hung) {
    steps.push({
      level: 'hint',
      text: fill(l('انظر إلى {piece} في {sq}.', 'Look at your {piece} on {sq}.', 'Regarde ton {piece} en {sq}.'), {
        piece: PIECE_NAMES[p.hung.type],
        sq: p.hung.square,
      }),
    });
  } else if (p.motifs.includes('allowed-mate') || p.motifs.includes('allowed-fork') || p.motifs.includes('allowed-capture')) {
    steps.push({
      level: 'hint',
      text: fill(l('فكّر في رد الخصم: {threat}.', 'Think about the reply {threat}.', 'Pense à la réponse {threat}.'), { threat: p.threatSan ?? '?' }),
    });
  } else {
    const piece = best.match(/^[KQRBN]/)?.[0]?.toLowerCase() as PieceSymbol | undefined;
    steps.push({
      level: 'hint',
      text: fill(
        l('النقلة الأفضل تستخدم {piece}.', 'The better move uses your {piece}.', 'Le meilleur coup utilise ton {piece}.'),
        { piece: PIECE_NAMES[piece ?? 'p'] },
      ),
    });
  }

  let idea: L;
  if (p.motifs.includes('allowed-mate')) {
    idea = l(
      'نقلتك سمحت للخصم بكش مات يبدأ بـ {threat}. كان الأفضل {best}.',
      'Your move allowed a forced mate starting with {threat}. Better was {best}.',
      'Ton coup permettait un mat forcé commençant par {threat}. Mieux valait {best}.',
    );
  } else if (p.motifs.includes('missed-mate')) {
    idea = l('كان لديك كش مات إجباري يبدأ بـ {best}.', 'You had a forced mate starting with {best}.', 'Tu avais un mat forcé commençant par {best}.');
  } else if (p.hung) {
    idea = l(
      'بعد {played} أصبح {piece} في {sq} بلا حماية كافية، فيستطيع الخصم كسبه بـ {threat}. النقلة الأفضل: {best}.',
      'After {played} your {piece} on {sq} was not sufficiently protected, so {threat} wins it. Better: {best}.',
      'Après {played}, ton {piece} en {sq} n’était plus assez protégé : {threat} le gagne. Mieux : {best}.',
    );
  } else if (p.motifs.includes('missed-fork')) {
    idea = l('{best} كانت شوكة تهاجم قطعتين معًا وتكسب مادة.', '{best} was a fork, attacking two pieces and winning material.', '{best} était une fourchette qui gagnait du matériel.');
  } else if (p.motifs.includes('missed-win-material')) {
    idea = l('{best} كانت تكسب مادة. ابحث دائمًا عن القطع غير المحمية.', '{best} won material. Always look for loose pieces.', '{best} gagnait du matériel. Cherche toujours les pièces non défendues.');
  } else if (p.motifs.includes('allowed-fork') || p.motifs.includes('allowed-capture')) {
    idea = l('نقلتك سمحت بـ {threat} الذي يكسب مادة. كان الأفضل {best}.', 'Your move allowed {threat}, which wins material. Better was {best}.', 'Ton coup permettait {threat}, qui gagne du matériel. Mieux valait {best}.');
  } else if (p.errorType === 'endgame') {
    idea = l('في هذه النهاية كانت {best} أدق. النقلات الصغيرة تحسم النهايات.', 'In this ending {best} was more precise — small moves decide endgames.', 'Dans cette finale, {best} était plus précis — les petits coups décident.');
  } else {
    idea = l(
      'لا يوجد تكتيك فوري هنا؛ المحرك يفضّل {best} لأنها تحسّن موقفك على المدى البعيد.',
      'No immediate tactic here; the engine prefers {best} because it improves your position long-term.',
      'Pas de tactique immédiate ; le moteur préfère {best}, qui améliore ta position à long terme.',
    );
  }
  steps.push({
    level: 'idea',
    text: fill(idea, { best, threat: p.threatSan ?? '?', played: p.san, piece: p.hung ? PIECE_NAMES[p.hung.type] : '', sq: p.hung?.square ?? '' }),
  });

  const evalTxt = (e: PlyAnalysis['before']) => (e.mate !== undefined ? `#${e.mate}` : (e.cp / 100).toFixed(1));
  steps.push({
    level: 'detail',
    text: fill(
      l(
        'تحليل المحرك: الأفضل {line} (تقييم {ev}). بعد نقلتك: {tline} (تقييم {ev2}). فرصة الفوز: {wb}% ← {wa}%.',
        'Engine: best {line} (eval {ev}). After your move: {tline} (eval {ev2}). Win chance {wb}% → {wa}%.',
        'Moteur : meilleur {line} (éval. {ev}). Après ton coup : {tline} (éval. {ev2}). Chances {wb}% → {wa}%.',
      ),
      {
        line: p.bestLineSan.slice(0, 6).join(' ') || best,
        ev: evalTxt(p.before),
        tline: p.threatLineSan.slice(0, 6).join(' ') || '—',
        ev2: evalTxt(p.after),
        wb: Math.round(p.winBefore).toString(),
        wa: Math.round(p.winAfter).toString(),
      },
    ),
  });
  return steps;
}
