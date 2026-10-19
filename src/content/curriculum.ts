import { l, type L, type SkillId } from './types';
import type { Square } from '../core/chess/game';
import type { BotId } from '../core/engine/botProfiles';
import type { CharacterId } from './characters';

export interface LessonStep {
  text: L;
  fen?: string;
  highlights?: Square[];
  arrows?: [Square, Square][];
}

export interface InteractiveExample {
  text: L;
  fen: string;
  /** The single move the learner must play (UCI). */
  move: string;
  success: L;
}

export interface LevelDef {
  id: string;
  world: number;
  index: number;
  title: L;
  skills: SkillId[];
  ustadIntro: L;
  lesson: LessonStep[];
  example: InteractiveExample;
  exercises: string[];
  masteryPool: string[];
  masteryCount: number;
  passRatio: number;
  match: { bot: BotId; nominal: number; playerColor: 'w' | 'b' };
}

export interface WorldDef {
  index: number;
  key: string;
  name: string;
  title: L;
  subtitle: L;
  topics: L[];
  difficulty: number;
  guardian: CharacterId;
  /** Hue used for the world's planet art. */
  hue: number;
  /** Content shipped in this build. Locked worlds are shown honestly as "coming soon". */
  available: boolean;
  levels: LevelDef[];
}

const W1_LEVELS: LevelDef[] = [
  {
    id: 'w1-l1',
    world: 1,
    index: 1,
    title: l('حركة القطع', 'How the pieces move', 'Le déplacement des pièces'),
    skills: ['rules.movement'],
    ustadIntro: l(
      'كل رحلة تبدأ بخطوة يا Zakomi. قبل أن نحارب في الأبعاد، يجب أن تعرف كيف يمشي جنودك.',
      'Every journey starts with one step, Zakomi. Before we travel the dimensions, you must know how your soldiers walk.',
      'Tout voyage commence par un pas, Zakomi. Avant de traverser les dimensions, apprends comment marchent tes soldats.',
    ),
    lesson: [
      { text: l('القلعة تسير في خطوط مستقيمة: أفقيًا وعموديًا، لأي مسافة، ولا تقفز فوق القطع.', 'The rook moves in straight lines — along ranks and files, any distance, never jumping.', 'La tour avance en ligne droite, sur rangées et colonnes, sans sauter.'), fen: '8/8/8/3R4/8/8/8/8 w - - 0 1', arrows: [['d5', 'd8'], ['d5', 'h5'], ['d5', 'd1'], ['d5', 'a5']] },
      { text: l('الفيل يسير قطريًا، ويبقى دائمًا على لون مربعه.', 'The bishop moves diagonally and always stays on its colour.', 'Le fou va en diagonale et reste toujours sur sa couleur.'), fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', arrows: [['d4', 'h8'], ['d4', 'a7'], ['d4', 'a1'], ['d4', 'g1']] },
      { text: l('الوزير = قلعة + فيل. لذلك قيمته نحو 9 بيادق.', 'The queen = rook + bishop. That is why she is worth about 9 pawns.', 'La dame = tour + fou. Elle vaut environ 9 pions.'), fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', arrows: [['d4', 'd8'], ['d4', 'h8'], ['d4', 'h4'], ['d4', 'a1']] },
      { text: l('الحصان يقفز على شكل L، وهو القطعة الوحيدة التي تقفز فوق غيرها.', 'The knight jumps in an L shape — the only piece that jumps over others.', 'Le cavalier saute en L — la seule pièce qui saute par-dessus les autres.'), fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', highlights: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'] },
      { text: l('الملك يتحرك مربعًا واحدًا في أي اتجاه، ولا يدخل أبدًا مربعًا مهددًا.', 'The king moves one square any way, and may never step into attack.', 'Le roi avance d’une case dans tous les sens, jamais sur une case attaquée.'), fen: '8/8/8/8/4K3/8/8/8 w - - 0 1', highlights: ['d3', 'd4', 'd5', 'e3', 'e5', 'f3', 'f4', 'f5'] },
      { text: l('البيدق يتقدم للأمام فقط، مربعين في أول حركة، ويأخذ قطريًا.', 'The pawn only goes forward — two squares on its first move — and captures diagonally.', 'Le pion n’avance que vers l’avant — deux cases au départ — et prend en diagonale.'), fen: '8/8/8/8/8/3p4/4P3/8 w - - 0 1', arrows: [['e2', 'e4'], ['e2', 'd3']] },
    ],
    example: {
      text: l('جرّب بنفسك: حرّك الحصان من g1 إلى f3 (نقلة افتتاحية ممتازة).', 'Try it: move the knight from g1 to f3 (an excellent opening move).', 'Essaie : joue le cavalier de g1 en f3 (excellent coup d’ouverture).'),
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      move: 'g1f3',
      success: l('ممتاز! الحصان في f3 يراقب المركز.', 'Excellent! The f3 knight watches the centre.', 'Excellent ! Le cavalier f3 surveille le centre.'),
    },
    exercises: ['w1-rook', 'w1-bishop', 'w1-knight', 'w1-pawn'],
    masteryPool: ['w1-queen', 'w1-king', 'w1-rook2', 'w1-bishop2', 'w1-knight2', 'w1-rook', 'w1-pawn'],
    masteryCount: 5,
    passRatio: 0.8,
    match: { bot: 'lumo', nominal: 250, playerColor: 'w' },
  },
  {
    id: 'w1-l2',
    world: 1,
    index: 2,
    title: l('الكش والكش مات', 'Check and checkmate', 'Échec et mat'),
    skills: ['rules.check'],
    ustadIntro: l(
      'الملك لا يُؤخذ أبدًا... لكنه قد يُحاصر. اليوم نتعلم الفرق بين الكش والكش مات.',
      'The king is never captured… but it can be trapped. Today: the difference between check and checkmate.',
      'Le roi n’est jamais pris… mais il peut être piégé. Aujourd’hui : échec ou mat ?',
    ),
    lesson: [
      { text: l('الكش: الملك مهدد. يجب الرد فورًا بثلاث طرق: الهروب، أو صد الهجوم، أو أخذ المهاجم.', 'Check: the king is attacked. You must respond: move away, block, or capture the attacker.', 'Échec : le roi est attaqué. Il faut fuir, interposer ou capturer.'), fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1', arrows: [['e1', 'e8']] },
      { text: l('الكش مات: لا توجد أي طريقة للرد. المباراة تنتهي فورًا.', 'Checkmate: no way to respond. The game ends immediately.', 'Échec et mat : aucune parade. La partie est terminée.'), fen: '4R1k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', highlights: ['g8'] },
      { text: l('احذر: قطعة قريبة غير محمية يمكن أن يأخذها الملك!', 'Careful: a nearby unprotected attacker can be taken by the king!', 'Attention : un attaquant proche non protégé peut être pris par le roi !'), fen: '4k3/8/8/8/8/8/4q3/4K3 w - - 0 1', highlights: ['e2'] },
    ],
    example: {
      text: l('أعطِ كش مات بالقلعة على الصف الأخير.', 'Deliver mate with the rook on the back rank.', 'Mate avec la tour sur la dernière rangée.'),
      fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
      move: 'e1e8',
      success: l('كش مات! هذا «مات الصف الأخير».', 'Checkmate! That is the back-rank mate.', 'Mat ! C’est le mat du couloir.'),
    },
    exercises: ['w1-status-check', 'w1-status-mate', 'w1-give-check', 'w1-escape'],
    masteryPool: ['w1-status-capture', 'w1-status-mate2', 'w1-give-check2', 'w1-escape', 'w1-status-check', 'w1-status-mate'],
    masteryCount: 5,
    passRatio: 0.8,
    match: { bot: 'lumo', nominal: 300, playerColor: 'b' },
  },
  {
    id: 'w1-l3',
    world: 1,
    index: 3,
    title: l('التبييت والترقية والأخذ بالتجاوز', 'Castling, promotion & en passant', 'Roque, promotion et prise en passant'),
    skills: ['rules.special', 'rules.draws'],
    ustadIntro: l(
      'للشطرنج ثلاث حركات سرية يجهلها كثير من اللاعبين. من يتقنها يملك مفاتيح إضافية.',
      'Chess has three "secret" moves many players don’t know. Master them and you hold extra keys.',
      'Les échecs ont trois coups « secrets ». Les maîtriser, c’est avoir des clés en plus.',
    ),
    lesson: [
      { text: l('التبييت: الملك يتحرك مربعين نحو القلعة، والقلعة تقفز فوقه. شروطه: لم يتحرك الملك ولا القلعة، الطريق فارغ، الملك ليس في كش، ولا يعبر أو يصل إلى مربع مهدد.', 'Castling: the king moves two squares toward a rook, which hops over. Conditions: neither has moved, the path is empty, the king is not in check and does not cross or land on an attacked square.', 'Roque : le roi avance de deux cases vers une tour qui saute par-dessus. Conditions : ni l’un ni l’autre n’a bougé, chemin libre, pas d’échec, aucune case attaquée traversée.'), fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', arrows: [['e1', 'g1'], ['e1', 'c1']] },
      { text: l('الترقية: البيدق الذي يصل إلى الصف الأخير يتحول إلى وزير أو قلعة أو فيل أو حصان.', 'Promotion: a pawn reaching the last rank becomes a queen, rook, bishop or knight.', 'Promotion : un pion qui atteint la dernière rangée devient dame, tour, fou ou cavalier.'), fen: '8/4P3/8/8/8/8/8/8 w - - 0 1', arrows: [['e7', 'e8']] },
      { text: l('الأخذ بالتجاوز: إذا تقدم بيدق مربعين وتوقف بجانب بيدقك، يمكنك أخذه كأنه تقدم مربعًا واحدًا — في النقلة التالية فقط.', 'En passant: if a pawn advances two squares and lands beside yours, you may capture it as if it moved one — on the very next move only.', 'Prise en passant : si un pion avance de deux cases à côté du tien, tu peux le prendre comme s’il n’avait avancé que d’une — au coup suivant uniquement.'), fen: '4k3/8/8/2Pp4/8/8/8/4K3 w - d6 0 1', arrows: [['c5', 'd6']] },
      { text: l('الخنق (Stalemate): لا كش ولا نقلات قانونية = تعادل.', 'Stalemate: no check and no legal move = a draw.', 'Pat : pas d’échec et aucun coup légal = nulle.'), fen: 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1', highlights: ['a8'] },
    ],
    example: {
      text: l('بيّت تبييتًا قصيرًا.', 'Castle kingside.', 'Fais le petit roque.'),
      fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      move: 'e1g1',
      success: l('ملكك الآن في أمان، والقلعة جاهزة للقتال.', 'Your king is safe and the rook is ready to fight.', 'Ton roi est à l’abri et la tour prête au combat.'),
    },
    exercises: ['w1-castle-both', 'w1-do-castle', 'w1-promote', 'w1-ep'],
    masteryPool: ['w1-castle-check', 'w1-castle-q', 'w1-stalemate', 'w1-ep', 'w1-promote', 'w1-castle-both'],
    masteryCount: 5,
    passRatio: 0.8,
    match: { bot: 'lumo', nominal: 350, playerColor: 'w' },
  },
  {
    id: 'w1-l4',
    world: 1,
    index: 4,
    title: l('حماية القطع', 'Keeping your pieces safe', 'Protéger ses pièces'),
    skills: ['safety.threats', 'safety.protect'],
    ustadIntro: l(
      'أكثر المباريات بين المبتدئين تُحسم بقطعة تُركت بلا حماية. قبل كل نقلة اسأل: ماذا يهاجم خصمي؟',
      'Most beginner games are decided by a piece left unprotected. Before every move, ask: what does my opponent attack?',
      'La plupart des parties de débutants se jouent sur une pièce laissée sans défense. Avant chaque coup : qu’attaque mon adversaire ?',
    ),
    lesson: [
      { text: l('قطعة «مهددة» = يستطيع الخصم أخذها. قطعة «محمية» = إذا أُخذت تستطيع الأخذ بالمقابل.', '"Attacked" = the opponent can take it. "Protected" = if taken, you can take back.', '« Attaquée » = l’adversaire peut la prendre. « Protégée » = tu peux reprendre.'), fen: 'k7/8/8/3n4/8/2B1Q3/8/4K3 w - - 0 1', highlights: ['c3', 'e3'], arrows: [['d5', 'e3'], ['d5', 'c3']] },
      { text: l('روتين الأمان قبل كل نقلة: 1) ماذا يهدد خصمي؟ 2) هل كل قطعي محمية؟ 3) ماذا ستهاجم نقلتي؟', 'Safety routine before every move: 1) What does my opponent threaten? 2) Are all my pieces protected? 3) What does my move attack?', 'Routine de sécurité : 1) Que menace l’adversaire ? 2) Mes pièces sont-elles protégées ? 3) Qu’attaque mon coup ?') },
      { text: l('أحيانًا أفضل دفاع هو أخذ المهاجم إذا كان غير محمي.', 'Sometimes the best defence is to capture an unprotected attacker.', 'Parfois la meilleure défense est de prendre l’attaquant non protégé.'), fen: '4k3/8/8/8/8/2n5/1P6/3QK3 w - - 0 1', arrows: [['b2', 'c3']] },
    ],
    example: {
      text: l('الحصان الأسود يهاجم وزيرك. خذه بالبيدق.', 'The black knight attacks your queen. Take it with the pawn.', 'Le cavalier noir attaque ta dame. Prends-le avec le pion.'),
      fen: '4k3/8/8/8/8/2n5/1P6/3QK3 w - - 0 1',
      move: 'b2c3',
      success: l('رائع! ربحت حصانًا وأنقذت الوزير.', 'Great! You won a knight and saved the queen.', 'Bravo ! Tu gagnes un cavalier et sauves la dame.'),
    },
    exercises: ['w1-attacked', 'w1-pawn-fork', 'w1-undefended', 'w1-take-attacker'],
    masteryPool: ['d-time-1', 'w1-undefended', 'w1-pawn-fork', 'w1-attacked', 'w1-take-attacker', 'd-threat-1'],
    masteryCount: 5,
    passRatio: 0.8,
    match: { bot: 'lumo', nominal: 400, playerColor: 'b' },
  },
  {
    id: 'w1-l5',
    world: 1,
    index: 5,
    title: l('المات الأساسي', 'Basic checkmates', 'Les mats de base'),
    skills: ['mate.one', 'endgame.basic-mates'],
    ustadIntro: l(
      'آخر اختبار في هذا البعد: أن تُنهي المباراة بنفسك. حارس البوابة LUMO ينتظرك.',
      'The last test of this dimension: finishing the game yourself. LUMO, guardian of the gate, awaits.',
      'Dernière épreuve de cette dimension : conclure toi-même. LUMO, gardien de la porte, t’attend.',
    ),
    lesson: [
      { text: l('مات الصف الأخير: الملك محبوس خلف بيادقه، وقلعة أو وزير يعطي الكش.', 'Back-rank mate: the king is locked behind its pawns while a rook or queen checks.', 'Mat du couloir : le roi est enfermé derrière ses pions.'), fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', arrows: [['a1', 'a8']] },
      { text: l('الوزير والملك معًا: الملك يغطي مربعات الهروب، والوزير يعطي الكش.', 'Queen and king together: the king covers escape squares, the queen checks.', 'Dame et roi ensemble : le roi couvre les cases de fuite, la dame fait échec.'), fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', arrows: [['b1', 'b8']] },
      { text: l('«السلّم» بقلعتين: قلعة تغلق صفًا، والأخرى تعطي الكش على الصف التالي.', 'The two-rook "ladder": one rook seals a rank, the other checks on the next.', 'L’« escalier » à deux tours : l’une ferme une rangée, l’autre fait échec.'), fen: 'k7/7R/8/8/8/8/8/6RK w - - 0 1', arrows: [['g1', 'g8']] },
    ],
    example: {
      text: l('أعطِ كش مات بالوزير.', 'Deliver checkmate with the queen.', 'Mate avec la dame.'),
      fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1',
      move: 'b1b8',
      success: l('كش مات! الملك والوزير فريق واحد.', 'Checkmate! King and queen work as a team.', 'Mat ! Roi et dame forment une équipe.'),
    },
    exercises: ['w1-mate-rook', 'w1-mate-queen', 'w1-mate-rook2', 'w1-mate-ladder'],
    masteryPool: ['w1-mate-queen2', 'w1-mate-battery', 'w1-mate-scholar', 'd-mate-backrank', 'd-mate-arabian', 'w1-mate-ladder', 'd-end-kq'],
    masteryCount: 5,
    passRatio: 0.8,
    match: { bot: 'lumo', nominal: 500, playerColor: 'w' },
  },
];

const soon = (index: number, key: string, name: string, title: L, subtitle: L, topics: L[], guardian: CharacterId, hue: number): WorldDef => ({
  index,
  key,
  name,
  title,
  subtitle,
  topics,
  difficulty: index,
  guardian,
  hue,
  available: false,
  levels: [],
});

export const WORLDS: WorldDef[] = [
  {
    index: 1,
    key: 'awakening',
    name: 'THE AWAKENING',
    title: l('الاستيقاظ', 'The Awakening', 'L’Éveil'),
    subtitle: l('بُعد المبتدئين: قواعد اللعب الأولى', 'The beginners’ dimension: the first rules', 'La dimension des débutants : les premières règles'),
    topics: [l('حركة القطع', 'Piece movement', 'Déplacements'), l('الكش والكش مات', 'Check & mate', 'Échec et mat'), l('الحركات الخاصة', 'Special moves', 'Coups spéciaux'), l('حماية القطع', 'Safety', 'Sécurité'), l('المات الأساسي', 'Basic mates', 'Mats de base')],
    difficulty: 1,
    guardian: 'lumo',
    hue: 205,
    available: true,
    levels: W1_LEVELS,
  },
  soon(2, 'storm', 'TACTICAL STORM', l('عاصفة التكتيكات', 'Tactical Storm', 'Tempête tactique'), l('الشوكة والتثبيت والسيخ والهجوم المكشوف', 'Forks, pins, skewers, discovered attacks', 'Fourchettes, clouages, enfilades, découvertes'), [l('الشوكة', 'Fork', 'Fourchette'), l('التثبيت', 'Pin', 'Clouage'), l('السيخ', 'Skewer', 'Enfilade'), l('إزالة المدافع', 'Removing the defender', 'Élimination du défenseur')], 'nova', 280),
  soon(3, 'gate', 'THE OPENING GATE', l('بوابة الافتتاح', 'The Opening Gate', 'La Porte des ouvertures'), l('المركز والتطوير وسلامة الملك', 'Centre, development and king safety', 'Centre, développement, sécurité du roi'), [l('السيطرة على المركز', 'Centre control', 'Contrôle du centre'), l('التطوير', 'Development', 'Développement'), l('الفخاخ الشائعة', 'Common traps', 'Pièges courants')], 'shadow', 250),
  soon(4, 'nexus', 'STRATEGY NEXUS', l('ملتقى الاستراتيجية', 'Strategy Nexus', 'Nexus stratégique'), l('المربعات الضعيفة والأعمدة المفتوحة والخطط', 'Weak squares, open files, plans', 'Cases faibles, colonnes ouvertes, plans'), [l('الأعمدة المفتوحة', 'Open files', 'Colonnes ouvertes'), l('البيدق المعزول', 'Isolated pawn', 'Pion isolé'), l('تحسين أسوأ قطعة', 'Improve the worst piece', 'Améliorer la pire pièce')], 'architect', 170),
  soon(5, 'realm', 'ENDGAME REALM', l('مملكة النهايات', 'Endgame Realm', 'Royaume des finales'), l('المعارضة والمربعات الحرجة ونهايات القلاع', 'Opposition, key squares, rook endings', 'Opposition, cases critiques, finales de tours'), [l('المعارضة', 'Opposition', 'Opposition'), l('تفعيل الملك', 'King activity', 'Activité du roi'), l('نهايات القلاع', 'Rook endings', 'Finales de tours')], 'oracle', 45),
  soon(6, 'void', 'CALCULATION VOID', l('فراغ الحساب', 'Calculation Void', 'Le Vide du calcul'), l('النقلات المرشحة والخطوط الإجبارية', 'Candidate moves and forcing lines', 'Coups candidats et lignes forcées'), [l('النقلات المرشحة', 'Candidate moves', 'Coups candidats'), l('تقييم التبادلات', 'Evaluating trades', 'Évaluer les échanges')], 'vektor', 320),
  soon(7, 'path', 'GRANDMASTER PATH', l('طريق الأستاذ الكبير', 'Grandmaster Path', 'La Voie du Grand Maître'), l('مسار تدريبي متقدم — وليس منحًا للقب رسمي', 'An advanced training path — not an official title', 'Un parcours avancé — pas un titre officiel'), [l('مباريات طويلة', 'Long games', 'Parties longues'), l('تحليل مباريات احترافية', 'Master-game study', 'Étude de parties de maîtres'), l('إدارة الوقت', 'Time management', 'Gestion du temps')], 'grandmaster', 0),
];

export const LEVELS_BY_ID: Record<string, LevelDef> = Object.fromEntries(WORLDS.flatMap((w) => w.levels).map((lv) => [lv.id, lv]));
