import auroraFormRules, {
  type AuroraBlockId,
  type DerivedStatus,
  type FormRecord,
} from '../config/formRules.aurora';

type VariantState = 'default' | 'utilidadPublica' | 'tramiteNormal';

export interface EvaluateAuroraRulesInput {
  answers: FormRecord;
}

export interface EvaluateAuroraRulesResult {
  visibleBlocks: string[];
  blockVariants: Record<string, VariantState>;
  locked: boolean;
  lockReason?: string;
  disabledFields: string[];
  derivedStatus: DerivedStatus;
}

const PLACEHOLDER_VALUES = new Set(['-', '--', 'n/a', 'na', 'null', 'undefined', 'seleccione', 'todos']);

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeText(value: unknown): string {
  return toText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function normalizeYesNo(value: unknown): 'si' | 'no' | '' {
  if (typeof value === 'boolean') return value ? 'si' : 'no';
  const n = normalizeText(value);
  if (n === 'si' || n === 'sí') return 'si';
  if (n === 'no') return 'no';
  return '';
}

export function includesInsensitive(haystack: unknown, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle));
}

export function isFilled(value: unknown): boolean {
  const raw = toText(value);
  if (!raw) return false;
  return !PLACEHOLDER_VALUES.has(normalizeText(raw));
}

function firstLockMatch(answers: FormRecord) {
  return auroraFormRules.lockRules.find((rule) => rule.when(answers));
}

function getActiveBlock5Variant(answers: FormRecord): {
  id: AuroraBlockId;
  state: VariantState;
} {
  const ruleEnabled = auroraFormRules.conditionalBlockVisibility.some((rule) => rule.when(answers));
  if (ruleEnabled) return { id: 'bloque5UtilidadPublica', state: 'utilidadPublica' };

  const defaultVariant = auroraFormRules.blockVariants.bloque5.defaultVariant;
  if (defaultVariant === 'bloque5TramiteNormal') return { id: defaultVariant, state: 'default' };
  return { id: defaultVariant, state: 'tramiteNormal' };
}

function areMandatoryFieldsFilled(answers: FormRecord, blockId: string): boolean {
  const fields = auroraFormRules.mandatoryByBlock?.[blockId] || [];
  return fields.every((field) => field.optional || isFilled(answers?.[field.key]));
}

function evaluateVisibleBlocks(answers: FormRecord, locked: boolean, activeBlock5: AuroraBlockId): AuroraBlockId[] {
  const visible: AuroraBlockId[] = ['bloque1', 'bloque2Aurora'];
  if (!locked) visible.push('bloque3');

  // Progresión: 2 -> 3 -> 4 -> 5
  if (visible.includes('bloque3') && areMandatoryFieldsFilled(answers, 'bloque3')) {
    visible.push('bloque4');
  }
  if (!locked && visible.includes('bloque4') && areMandatoryFieldsFilled(answers, 'bloque4')) {
    visible.push(activeBlock5);
  }

  return visible;
}

function evaluateDisabledFields(answers: FormRecord): string[] {
  const disabled = new Set<string>();

  for (const rule of auroraFormRules.dependencyRules) {
    if (!rule.when(answers)) continue;
    (rule.effects.disable || []).forEach((field) => disabled.add(field));
  }

  // Reglas de habilitación que remueven de deshabilitados si estaban.
  for (const rule of auroraFormRules.dependencyRules) {
    if (!rule.when(answers)) continue;
    (rule.effects.enable || []).forEach((field) => disabled.delete(field));
  }

  return Array.from(disabled);
}

function normalizeDerivedStatus(status: string): DerivedStatus {
  const n = normalizeText(status);
  if (n.includes('caso cerrado')) return 'Caso cerrado';
  if (n.includes('analizar el caso')) return 'Analizar el caso';
  if (n.includes('entrevistar al usuario')) return 'Entrevistar al usuario';
  if (n.includes('presentar solicitud')) return 'Presentar solicitud';
  if (n.includes('pendiente')) return 'Pendiente decisión';
  return 'Analizar el caso';
}

function evaluateDerivedStatus(answers: FormRecord): DerivedStatus {
  const hit = auroraFormRules.derivedStatusRules.find((rule) => rule.when(answers));
  return normalizeDerivedStatus(hit?.status || 'Analizar el caso');
}

export function evaluateAuroraRules({ answers }: EvaluateAuroraRulesInput): EvaluateAuroraRulesResult {
  const safeAnswers = (answers || {}) as FormRecord;

  const lockHit = firstLockMatch(safeAnswers);
  const locked = Boolean(lockHit);
  const activeVariant = getActiveBlock5Variant(safeAnswers);

  const visibleBlocks = evaluateVisibleBlocks(safeAnswers, locked, activeVariant.id);
  const disabledFields = evaluateDisabledFields(safeAnswers);
  const derivedStatus = evaluateDerivedStatus(safeAnswers);

  return {
    visibleBlocks,
    blockVariants: {
      bloque5: activeVariant.state,
    },
    locked,
    lockReason: lockHit?.description,
    disabledFields,
    derivedStatus,
  };
}

export default evaluateAuroraRules;
