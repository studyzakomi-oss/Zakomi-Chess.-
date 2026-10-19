import { l, type L } from './types';

export type CharacterId =
  | 'zakomi'
  | 'ustad'
  | 'lumo'
  | 'nova'
  | 'shadow'
  | 'architect'
  | 'oracle'
  | 'vektor'
  | 'grandmaster'
  | 'drone';

export type Mood = 'neutral' | 'focus' | 'think' | 'happy' | 'surprised' | 'sad' | 'celebrate';

export type DialogueEvent = 'greet' | 'playerGood' | 'playerBlunder' | 'botAdvantage' | 'check' | 'win' | 'lose' | 'draw';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: L;
  bio: L;
  /** Primary / accent colours used by the SVG portrait. */
  color: string;
  accent: string;
  style: L;
  lines: Partial<Record<DialogueEvent, L[]>>;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  zakomi: {
    id: 'zakomi',
    name: 'ZAKOMI',
    title: l('البطل', 'The Hero', 'Le héros'),
    bio: l('مستكشف شاب من نواكشوط يحمل شعار Z، يعبر الأبعاد ليصبح سيد الرقعة.', 'A young explorer from Nouakchott bearing the Z emblem, crossing dimensions to master the board.', 'Un jeune explorateur de Nouakchott, porteur du Z, qui traverse les dimensions.'),
    color: '#1d4ed8',
    accent: '#38bdf8',
    style: l('أنت', 'You', 'Toi'),
    lines: {},
  },
  ustad: {
    id: 'ustad',
    name: 'USTAD Z',
    title: l('الأستاذ', 'The Mentor', 'Le Maître'),
    bio: l('حكيم الأبعاد. هادئ، صبور، لا يسخر من الأخطاء — بل يحوّلها إلى دروس.', 'Sage of the dimensions. Calm and patient; he never mocks mistakes — he turns them into lessons.', 'Sage des dimensions. Calme et patient, il transforme chaque erreur en leçon.'),
    color: '#0b1f4d',
    accent: '#7dd3fc',
    style: l('مدرب', 'Coach', 'Entraîneur'),
    lines: {
      greet: [l('خذ نفسًا عميقًا. انظر إلى الرقعة كلها قبل أن تلمس قطعة.', 'Take a deep breath. Look at the whole board before you touch a piece.', 'Respire. Regarde tout l’échiquier avant de toucher une pièce.')],
      playerGood: [l('نقلة جميلة. هذا تفكير لاعب حقيقي.', 'A fine move. That is a real player’s thinking.', 'Beau coup. C’est la pensée d’un vrai joueur.'), l('أحسنت، حافظ على هذا التركيز.', 'Well done — keep that focus.', 'Bravo, garde cette concentration.')],
      playerBlunder: [l('توقّف لحظة... ماذا يهاجم خصمك الآن؟', 'Pause a moment… what does your opponent attack now?', 'Une pause… qu’attaque ton adversaire maintenant ?')],
      win: [l('انتصار مستحق. لكن لنراجع المباراة معًا — حتى الانتصارات فيها دروس.', 'A deserved win. Let’s review it together — even wins hold lessons.', 'Victoire méritée. Analysons-la — même les victoires enseignent.')],
      lose: [l('الهزيمة معلم صارم لكنه صادق. لنرَ ما الذي علّمتنا إياه.', 'Defeat is a strict but honest teacher. Let’s see what it taught us.', 'La défaite est un maître sévère mais honnête.')],
      draw: [l('تعادل. دعنا نبحث أين كانت فرص الفوز.', 'A draw. Let’s find where the winning chances were.', 'Nulle. Cherchons où étaient les chances de gain.')],
    },
  },
  lumo: {
    id: 'lumo',
    name: 'LUMO',
    title: l('حارس الاستيقاظ', 'Guardian of the Awakening', 'Gardien de l’Éveil'),
    bio: l('كائن ضوئي صغير وُلد مع أول نقلة في الكون. يحب الأخذ... أحيانًا أكثر من اللازم.', 'A little being of light born with the universe’s first move. Loves capturing — sometimes too much.', 'Petit être de lumière né avec le premier coup de l’univers. Adore prendre — parfois trop.'),
    color: '#0ea5e9',
    accent: '#fde047',
    style: l('مبتدئ متحمس', 'Eager beginner', 'Débutant enthousiaste'),
    lines: {
      greet: [l('مرحبًا! هل تريد أن نلعب؟ أنا أحب القطع اللامعة!', 'Hi! Want to play? I love shiny pieces!', 'Salut ! On joue ? J’adore les pièces brillantes !')],
      playerGood: [l('واو! كيف فعلت ذلك؟', 'Whoa! How did you do that?', 'Waouh ! Comment as-tu fait ?')],
      botAdvantage: [l('هيهي، أخذت قطعة!', 'Hehe, I took a piece!', 'Hihi, j’ai pris une pièce !')],
      check: [l('كش! هل هذا مسموح؟ نعم، إنه مسموح!', 'Check! Is that allowed? Yes it is!', 'Échec ! C’est permis ? Oui !')],
      win: [l('فزت! لكنك ستفوز في المرة القادمة، أنا متأكد.', 'I won! But you’ll win next time, I’m sure.', 'J’ai gagné ! Mais tu gagneras la prochaine fois.')],
      lose: [l('آه! لقد أطفأت ضوئي... لا بأس، البوابة مفتوحة لك.', 'Oh! You dimmed my light… fine, the gate is open for you.', 'Oh ! Tu as éteint ma lumière… la porte t’est ouverte.')],
      draw: [l('تعادل؟ هذا يعني أننا صديقان!', 'A draw? That means we’re friends!', 'Nulle ? Alors on est amis !')],
    },
  },
  nova: {
    id: 'nova',
    name: 'NOVA',
    title: l('عاصفة التكتيكات', 'The Tactical Storm', 'La Tempête'),
    bio: l('مقاتلة نجمية تؤمن أن أفضل دفاع هو هجوم مدمّر. تضحّي بالقطع بلا تردد.', 'A star-warrior who believes the best defence is a devastating attack. Sacrifices without hesitation.', 'Guerrière stellaire : la meilleure défense est une attaque dévastatrice.'),
    color: '#7c3aed',
    accent: '#f472b6',
    style: l('مهاجمة تكتيكية', 'Tactical attacker', 'Attaquante tactique'),
    lines: {
      greet: [l('أتمنى أن يكون ملكك شجاعًا، لأنني قادمة إليه.', 'I hope your king is brave, because I’m coming for him.', 'J’espère que ton roi est courageux : j’arrive.')],
      botAdvantage: [l('الهجوم لا يتوقف!', 'The attack never stops!', 'L’attaque ne s’arrête jamais !')],
      check: [l('كش! أتشعر بالعاصفة؟', 'Check! Feel the storm?', 'Échec ! Tu sens la tempête ?')],
      win: [l('العاصفة لا ترحم.', 'The storm shows no mercy.', 'La tempête est sans pitié.')],
      lose: [l('دفاع رائع... سأعود أقوى.', 'Great defence… I’ll be back stronger.', 'Belle défense… je reviendrai plus forte.')],
    },
  },
  shadow: {
    id: 'shadow',
    name: 'SHADOW',
    title: l('سيد الفخاخ', 'Master of Traps', 'Maître des pièges'),
    bio: l('يختبئ في الظل وينتظر خطأك. دفاعه صلب وهجماته المضادة مفاجئة.', 'Waits in the dark for your mistake. Rock-solid defence, sudden counter-attacks.', 'Attend ton erreur dans l’ombre. Défense solide, contre-attaques soudaines.'),
    color: '#111827',
    accent: '#22d3ee',
    style: l('مدافع صبور', 'Patient defender', 'Défenseur patient'),
    lines: { greet: [l('خذ وقتك... أنا لست مستعجلًا.', 'Take your time… I’m in no hurry.', 'Prends ton temps… je ne suis pas pressé.')] },
  },
  architect: {
    id: 'architect',
    name: 'THE ARCHITECT',
    title: l('المهندس', 'The Architect', 'L’Architecte'),
    bio: l('يبني موقعه حجرًا حجرًا ويسيطر على المربعات قبل أن يهاجم.', 'Builds his position stone by stone and controls squares before attacking.', 'Bâtit sa position pierre après pierre.'),
    color: '#0f766e',
    accent: '#a7f3d0',
    style: l('لاعب موقعي', 'Positional player', 'Joueur positionnel'),
    lines: { greet: [l('كل مربع له ثمن.', 'Every square has a price.', 'Chaque case a un prix.')] },
  },
  oracle: {
    id: 'oracle',
    name: 'ORACLE',
    title: l('عرّافة النهايات', 'Oracle of Endgames', 'Oracle des finales'),
    bio: l('ترى نهاية المباراة منذ بدايتها، وتحب التبسيط نحو نهايات دقيقة.', 'Sees the end of the game from its start; loves simplifying into precise endings.', 'Voit la fin dès le début ; adore simplifier vers des finales précises.'),
    color: '#b45309',
    accent: '#fde68a',
    style: l('متخصصة في النهايات', 'Endgame specialist', 'Spécialiste des finales'),
    lines: { greet: [l('النهاية مكتوبة... إلا إذا أثبتّ العكس.', 'The ending is written… unless you prove otherwise.', 'La fin est écrite… sauf si tu prouves le contraire.')] },
  },
  vektor: {
    id: 'vektor',
    name: 'VEKTOR',
    title: l('آلة الحساب', 'The Calculator', 'Le Calculateur'),
    bio: l('يحسب الخطوط الإجبارية بلا كلل. أي تسرّع منك سيُعاقب.', 'Calculates forcing lines tirelessly. Any haste is punished.', 'Calcule sans relâche. Toute précipitation est punie.'),
    color: '#334155',
    accent: '#f87171',
    style: l('حاسب دقيق', 'Precise calculator', 'Calculateur précis'),
    lines: { greet: [l('احتمال فوزك يتغير مع كل نقلة.', 'Your winning chances change with every move.', 'Tes chances changent à chaque coup.')] },
  },
  grandmaster: {
    id: 'grandmaster',
    name: 'THE GRANDMASTER',
    title: l('الخصم الأخير', 'The Final Opponent', 'L’Adversaire final'),
    bio: l('لا يظهر إلا لمن قطع الطريق كله. أقوى خصم في الأبعاد.', 'Appears only to those who walked the whole path. The strongest opponent in all dimensions.', 'N’apparaît qu’à ceux qui ont parcouru tout le chemin.'),
    color: '#020617',
    accent: '#facc15',
    style: l('قوة كاملة', 'Full strength', 'Pleine puissance'),
    lines: { greet: [l('أريني ما تعلمته.', 'Show me what you have learned.', 'Montre-moi ce que tu as appris.')] },
  },
  drone: {
    id: 'drone',
    name: 'Z-DRONE',
    title: l('طائرة التدريب', 'Training Drone', 'Drone d’entraînement'),
    bio: l('خصم تدريبي محايد تُضبط قوته حسب مستواك.', 'A neutral sparring partner tuned to your level.', 'Un sparring-partner neutre ajusté à ton niveau.'),
    color: '#1e3a8a',
    accent: '#93c5fd',
    style: l('متوازن', 'Balanced', 'Équilibré'),
    lines: {
      greet: [l('بدء جلسة التدريب.', 'Training session initialised.', 'Session d’entraînement lancée.')],
      win: [l('انتهت الجلسة: فوز للطائرة.', 'Session over: drone wins.', 'Session terminée : victoire du drone.')],
      lose: [l('انتهت الجلسة: فوزك.', 'Session over: you win.', 'Session terminée : tu gagnes.')],
    },
  },
};

export function lineFor(id: CharacterId, ev: DialogueEvent, seed = 0): L | null {
  const ls = CHARACTERS[id].lines[ev] ?? CHARACTERS.ustad.lines[ev];
  if (!ls?.length) return null;
  return ls[Math.abs(seed) % ls.length];
}
