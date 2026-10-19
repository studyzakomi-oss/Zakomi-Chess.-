import { l, type L, type SkillId } from '../content/types';

export const SKILL_NAMES: Record<SkillId, L> = {
  'rules.movement': l('حركة القطع', 'Piece movement', 'Déplacements'),
  'rules.check': l('الكش والكش مات', 'Check & checkmate', 'Échec et mat'),
  'rules.special': l('الحركات الخاصة', 'Special moves', 'Coups spéciaux'),
  'rules.draws': l('التعادل والخنق', 'Draws & stalemate', 'Nulles et pat'),
  'safety.threats': l('اكتشاف التهديدات', 'Spotting threats', 'Repérer les menaces'),
  'safety.protect': l('حماية القطع', 'Protecting pieces', 'Protéger ses pièces'),
  'mate.one': l('المات في نقلة', 'Mate in one', 'Mat en un'),
  'mate.two': l('المات في نقلتين', 'Mate in two', 'Mat en deux'),
  'tactic.fork': l('الشوكة', 'Fork', 'Fourchette'),
  'tactic.pin': l('التثبيت', 'Pin', 'Clouage'),
  'tactic.skewer': l('السيخ', 'Skewer', 'Enfilade'),
  'tactic.discovered': l('الهجوم المكشوف', 'Discovered attack', 'Attaque à la découverte'),
  'tactic.deflection': l('الإبعاد', 'Deflection', 'Déviation'),
  'calc.candidates': l('النقلات المرشحة', 'Candidate moves', 'Coups candidats'),
  'strategy.opening': l('مبادئ الافتتاح', 'Opening principles', 'Principes d’ouverture'),
  'strategy.king-safety': l('سلامة الملك', 'King safety', 'Sécurité du roi'),
  'endgame.basic-mates': l('المات الأساسي', 'Basic mates', 'Mats de base'),
  'endgame.pawns': l('نهايات البيادق', 'Pawn endings', 'Finales de pions'),
  'time.quick': l('السرعة تحت الضغط', 'Speed under pressure', 'Vitesse sous pression'),
};
