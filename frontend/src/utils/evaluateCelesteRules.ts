import celesteFormRules, {
  type CelesteBlockId,
  type CelesteRecord,
} from '../config/formRules.celeste';

export interface EvaluateCelesteRulesInput {
  answers: CelesteRecord;
}

export interface EvaluateCelesteRulesResult {
  visibleBlocks: string[];
  locked: boolean;
  lockReason?: string;
  jumpToAurora: boolean;
  jumpPayload?: { target: 'aurora'; startBlock: 2 };
}

const PLACEHOLDERS = new Set(['', '-', '--', 'n/a', 'na', 'null', 'undefined', 'seleccione', 'todos']);

function toText(v: unknown): string {
  return String(v ?? '').trim();
}

export function normalize(v: unknown): string {
  return toText(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function isFilled(v: unknown): boolean {
  const n = normalize(v);
  return !PLACEHOLDERS.has(n);
}

function getAnswerByKey(answers: CelesteRecord, key: string): unknown {
  if (Object.prototype.hasOwnProperty.call(answers, key)) return answers[key];
  const target = normalize(key);
  const hit = Object.keys(answers || {}).find((k) => normalize(k) === target);
  return hit ? answers[hit] : undefined;
}

function areMandatoryFieldsFilled(answers: CelesteRecord, blockId: CelesteBlockId): boolean {
  const fields = celesteFormRules.mandatoryByBlock?.[blockId] || [];
  return fields.every((f) => f.optional || isFilled(getAnswerByKey(answers, f.key)));
}

function getCloseCaseReason(answers: CelesteRecord): string | undefined {
  const match = celesteFormRules.closeCaseRules.find((rule) => {
    const value = getAnswerByKey(answers, rule.questionKey);
    return rule.matches.some((m) => normalize(value) === normalize(m));
  });
  if (!match) return undefined;
  return `Se cierra el caso (${match.description})`;
}

function shouldJumpToAurora(answers: CelesteRecord): boolean {
  return celesteFormRules.jumpRules.some((rule) => rule.when(answers));
}

function resolveVisibleBlocks(answers: CelesteRecord, locked: boolean): CelesteBlockId[] {
  const visible: CelesteBlockId[] = ['bloque1', 'bloque2Celeste'];
  if (!locked) visible.push('bloque3Celeste');
  if (locked) return visible;

  if (visible.includes('bloque3Celeste') && areMandatoryFieldsFilled(answers, 'bloque3Celeste')) {
    visible.push('bloque4Celeste');
  }
  return visible;
}

export function evaluateCelesteRules({ answers }: EvaluateCelesteRulesInput): EvaluateCelesteRulesResult {
  const safeAnswers = (answers || {}) as CelesteRecord;

  const lockReason = getCloseCaseReason(safeAnswers);
  const locked = Boolean(lockReason);
  const jumpToAurora = shouldJumpToAurora(safeAnswers);
  const visibleBlocks = resolveVisibleBlocks(safeAnswers, locked);

  return {
    visibleBlocks,
    locked,
    lockReason,
    jumpToAurora,
    jumpPayload: jumpToAurora ? { target: 'aurora', startBlock: 2 } : undefined,
  };
}

export default evaluateCelesteRules;
