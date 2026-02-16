export type CelesteBlockId = 'bloque1' | 'bloque2Celeste' | 'bloque3Celeste' | 'bloque4Celeste';

export type CelesteFlow = 'sindicado' | 'condenado';

export type CelesteRecord = Record<string, unknown>;

export interface FieldRef {
  key: string;
  label: string;
  optional?: boolean;
}

export interface CloseCaseRule {
  id: string;
  questionKey: string;
  description: string;
  matches: string[];
}

export interface JumpRule {
  id: string;
  sourceField: string;
  description: string;
  when: (answers: CelesteRecord) => boolean;
  targetFlow: 'aurora';
  targetBlock: 'bloque2Aurora';
  saveBeforeRedirect: boolean;
}

export type CelesteDerivedStatus = 'Caso cerrado' | 'En gestión' | 'Pendiente de análisis';

const FIELD = {
  q17: 'Situación Jurídica actualizada (de conformidad con la rama judicial)',
  q24: '¿ES MUJER CABEZA DE FAMILIA?',
  q26: 'Decisión del usuario',
  q31: 'CONFIRMACIÓN DE LA PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS',
  q34: 'SENTIDO DE LA DECISIÓN',
  q36: '¿SE RECURRIÓ EN CASO DE DECISIÓN NEGATIVA?',
  q38: 'SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO',
} as const;

function text(v: unknown): string {
  return String(v ?? '').trim();
}

export function normalizeCelesteValue(v: unknown): string {
  return text(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function equalsInsensitive(a: unknown, b: string): boolean {
  return normalizeCelesteValue(a) === normalizeCelesteValue(b);
}

export function isFilled(v: unknown): boolean {
  const t = text(v);
  if (!t) return false;
  const n = normalizeCelesteValue(t);
  return n !== '-' && n !== 'n/a' && n !== 'na' && n !== 'seleccione' && n !== 'todos';
}

export function normalizeYesNo(v: unknown): 'si' | 'no' | '' {
  if (typeof v === 'boolean') return v ? 'si' : 'no';
  const n = normalizeCelesteValue(v);
  if (n === 'si' || n === 'sí') return 'si';
  if (n.startsWith('no')) return 'no';
  return '';
}

// Bloque 1 no tiene obligatorios.
// Para Celeste, se usan claves existentes del formulario actual (sin inventar preguntas).
export const mandatoryByBlock: Record<CelesteBlockId, FieldRef[]> = {
  bloque1: [],
  bloque2Celeste: [
    { key: 'Autoridad a cargo', label: '14 Autoridad judicial a cargo' },
    { key: 'Número de proceso', label: '15 Número de proceso' },
    { key: 'Delitos', label: '16 Delitos' },
    { key: FIELD.q17, label: '17 Situación jurídica actualizada' },
    { key: 'Fecha de captura', label: '18 Fecha de captura' },
    { key: 'Fecha de análisis jurídico del caso', label: '20 Fecha de análisis jurídico del caso' },
    { key: 'PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS', label: '21 Procedencia vencimiento' },
    { key: '¿REQUIERE ATENCIÓN MÉDICA PERMANENTE?', label: '22 Requiere atención médica permanente' },
    { key: '¿ESTÁ EN ESTADO DE GESTACIÓN?', label: '23 Estado de gestación' },
    { key: FIELD.q24, label: '24 Mujer cabeza de familia' },
  ],
  bloque3Celeste: [
    { key: 'Defensor(a) Público(a) Asignado para tramitar la solicitud', label: '25 Defensor(a) público(a)' },
    { key: 'Fecha de entrevista', label: '26 Fecha de la entrevista' },
    { key: FIELD.q26, label: '27 Decisión del usuario' },
    { key: 'Poder en caso de avanzar con la solicitud', label: '28 Poder en caso de avanzar' },
    { key: 'RESUMEN DEL ANÁLISIS JURÍDICO DEL PRESENTE CASO', label: '29 Resumen del análisis jurídico' },
  ],
  bloque4Celeste: [
    { key: 'FECHA DE REVISIÓN DEL EXPEDIENTE Y ELEMENTOS MATERIALES PROBATORIOS', label: '30 Fecha revisión' },
    { key: FIELD.q31, label: '31 Confirmación procedencia' },
    {
      key: 'FECHA DE SOLICITUD DE AUDIENCIA DE CONTROL DE GARANTÍAS PARA SUSTENTAR REVOCATORIA',
      label: '32 Fecha solicitud audiencia',
    },
    { key: 'FECHA DE REALIZACIÓN DE AUDIENCIA', label: '33 Fecha realización de audiencia' },
    { key: FIELD.q34, label: '34 Sentido de la decisión' },
    { key: 'MOTIVO DE LA DECISIÓN NEGATIVA', label: '35 Motivo decisión negativa' },
    { key: FIELD.q36, label: '36 ¿Se recurrió en caso de decisión negativa?' },
    { key: 'Fecha de presentación del recurso', label: '37 Fecha presentación del recurso', optional: true },
    { key: FIELD.q38, label: '38 Sentido de la decisión que resuelve recurso', optional: true },
  ],
};

export const blockOrder: CelesteBlockId[] = ['bloque1', 'bloque2Celeste', 'bloque3Celeste', 'bloque4Celeste'];

export const initialVisibleBlocks: CelesteBlockId[] = ['bloque1', 'bloque2Celeste'];

export const jumpRules: JumpRule[] = [
  {
    id: 'celeste_q17_condenado_saltta_aurora',
    sourceField: FIELD.q17,
    description: 'Si Q17 = CONDENADO, guardar Celeste y redirigir a AURORA bloque 2.',
    when: (answers) => equalsInsensitive(answers?.[FIELD.q17], 'CONDENADO'),
    targetFlow: 'aurora',
    targetBlock: 'bloque2Aurora',
    saveBeforeRedirect: true,
  },
];

export const closeCaseRules: CloseCaseRule[] = [
  {
    id: 'cerrar_q24_no_procede_tiempo_1_ano',
    questionKey: 'PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS',
    description: 'Q24 no procede por no cumplir 1 año.',
    matches: [
      'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva',
      'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva (Se cierra el caso)',
    ],
  },
  {
    id: 'cerrar_q26_defensor_confianza',
    questionKey: FIELD.q26,
    description: 'Q26 decide tramitar con defensor de confianza.',
    matches: [
      'Desea tramitar el trámite de levantamiento de detención preventiva a través de su defensor de confianza',
      'Desea tramitar el trámite de levantamiento de detención preventiva a través de su defensor de confianza (Se cierra el caso)',
    ],
  },
  {
    id: 'cerrar_q31_no_procede_tiempo_1_ano',
    questionKey: FIELD.q31,
    description: 'Q31 no procede por no cumplir 1 año.',
    matches: [
      'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva',
      'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva (Se cierra el caso)',
    ],
  },
  {
    id: 'cerrar_q34_concede_levantamiento',
    questionKey: FIELD.q34,
    description: 'Q34 concede levantamiento de medida de aseguramiento.',
    matches: ['Concede levantamiento de medida de aseguramiento'],
  },
  {
    id: 'cerrar_q36_no_recurre',
    questionKey: FIELD.q36,
    description: 'Q36 no recurre en caso de decisión negativa.',
    matches: ['No'],
  },
  {
    id: 'cerrar_q38_concede_levantamiento',
    questionKey: FIELD.q38,
    description: 'Q38 concede levantamiento.',
    matches: ['Concede levantamiento de medida de aseguramiento'],
  },
  {
    id: 'cerrar_q38_no_concede_levantamiento',
    questionKey: FIELD.q38,
    description: 'Q38 no concede levantamiento.',
    matches: ['No concede levantamiento de medida de aseguramiento'],
  },
];

function isRuleMatch(value: unknown, matches: string[]): boolean {
  return matches.some((m) => equalsInsensitive(value, m));
}

export function getCloseCaseMatch(answers: CelesteRecord): CloseCaseRule | null {
  for (const rule of closeCaseRules) {
    if (isRuleMatch(answers?.[rule.questionKey], rule.matches)) return rule;
  }
  return null;
}

export function isCaseClosedCeleste(answers: CelesteRecord): boolean {
  return Boolean(getCloseCaseMatch(answers));
}

export function areMandatoryFieldsFilledCeleste(answers: CelesteRecord, blockId: CelesteBlockId): boolean {
  const fields = mandatoryByBlock[blockId] || [];
  return fields.every((f) => f.optional || isFilled(answers?.[f.key]));
}

export function resolveVisibleBlocksCeleste(answers: CelesteRecord): CelesteBlockId[] {
  const visible: CelesteBlockId[] = [...initialVisibleBlocks];
  if (isCaseClosedCeleste(answers)) return visible;

  if (areMandatoryFieldsFilledCeleste(answers, 'bloque2Celeste')) visible.push('bloque3Celeste');
  if (visible.includes('bloque3Celeste') && areMandatoryFieldsFilledCeleste(answers, 'bloque3Celeste')) {
    visible.push('bloque4Celeste');
  }

  return visible;
}

export function deriveStatusCeleste(answers: CelesteRecord): CelesteDerivedStatus {
  if (isCaseClosedCeleste(answers)) return 'Caso cerrado';
  const visible = resolveVisibleBlocksCeleste(answers);
  if (visible.includes('bloque4Celeste')) return 'En gestión';
  if (visible.includes('bloque3Celeste')) return 'En gestión';
  return 'Pendiente de análisis';
}

export const celesteFormRules = {
  blockOrder,
  initialVisibleBlocks,
  mandatoryByBlock,
  jumpRules,
  closeCaseRules,
  helpers: {
    normalizeCelesteValue,
    normalizeYesNo,
    equalsInsensitive,
    isFilled,
    isCaseClosedCeleste,
    getCloseCaseMatch,
    areMandatoryFieldsFilledCeleste,
    resolveVisibleBlocksCeleste,
    deriveStatusCeleste,
  },
};

export default celesteFormRules;
