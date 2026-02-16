export type AuroraBlockId =
  | 'bloque1'
  | 'bloque2Aurora'
  | 'bloque3'
  | 'bloque4'
  | 'bloque5UtilidadPublica'
  | 'bloque5TramiteNormal';

export type AuroraFlow = 'condenado' | 'sindicado';

export type FormRecord = Record<string, unknown>;

export interface FieldRef {
  key: string;
  label: string;
  optional?: boolean;
}

export interface MandatoryByBlock {
  [blockId: string]: FieldRef[];
}

export interface BlockVariantRule {
  id: string;
  description: string;
  when: (record: FormRecord) => boolean;
  show: AuroraBlockId[];
  hide: AuroraBlockId[];
}

export interface LockRule {
  id: string;
  description: string;
  when: (record: FormRecord) => boolean;
}

export interface DependencyRule {
  id: string;
  source: FieldRef;
  description: string;
  when: (record: FormRecord) => boolean;
  effects: {
    disable?: string[];
    enable?: string[];
  };
}

export type DerivedStatus =
  | 'Analizar el caso'
  | 'Entrevistar al usuario'
  | 'Presentar solicitud'
  | 'Pendiente decisión'
  | 'Caso cerrado';

export interface DerivedStatusRule {
  id: string;
  status: DerivedStatus;
  when: (record: FormRecord) => boolean;
}

const FIELD = {
  q30: 'Procedencia de libertad condicional',
  q31: 'Procedencia de prisión domiciliaria de mitad de pena',
  q32: 'Procedencia de utilidad pública (solo para mujeres)',
  q33: 'Procedencia de pena cumplida',
  q34: 'Procedencia de acumulación de penas',
  q35: 'Con qué proceso(s) debe acumular penas (si aplica)',
  q36: 'Otras solicitudes a tramitar',
  q37: 'Resumen del análisis del caso',
  q38: 'Fecha de entrevista',
  q39: 'Decisión del usuario',
  q40: 'Actuación a adelantar',
  q44: 'Cumple el requisito de marginalidad',
  q45: 'Cumple el requisito de jefatura de hogar',
  q46: 'Se requiere misión de trabajo',
  q47: 'Fecha de solicitud de misión de trabajo',
  q48: 'Fecha de asignación de investigador',
  q49: 'Fecha en la que se reciben todas las pruebas',
  q50: 'Fecha de presentación de solicitud a la autoridad',
  q51: 'Fecha de decisión de la autoridad',
  q52: 'Sentido de la decisión',
  q53: 'Motivo de la decisión negativa',
  q54: 'Se presenta recurso',
  q55: 'Fecha de recurso en caso desfavorable',
  q56: 'Sentido de la decisión que resuelve recurso',
  // Variante bloque 5 normal (placeholder compatible con mapeos actuales)
  b5NormalRadicacion: 'Fecha de presentación de solicitud a la autoridad',
  b5NormalDecision: 'Fecha de decisión de la autoridad',
} as const;

function toText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalize(value: unknown): string {
  return toText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isFilled(value: unknown): boolean {
  return toText(value) !== '';
}

function get(record: FormRecord, key: string): string {
  return toText(record?.[key]);
}

function includesAnyInsensitive(value: unknown, needles: string[]): boolean {
  const haystack = normalize(value);
  return needles.some((n) => haystack.includes(normalize(n)));
}

function equalsInsensitive(value: unknown, expected: string): boolean {
  return normalize(value) === normalize(expected);
}

function hasNoInProcedencias30a36(record: FormRecord): boolean {
  const keys = [FIELD.q30, FIELD.q31, FIELD.q32, FIELD.q33, FIELD.q34, FIELD.q35, FIELD.q36];
  return keys.some((k) => {
    const v = get(record, k);
    if (!v) return false;
    return equalsInsensitive(v, 'No');
  });
}

function isUtilidadPublicaFlow(record: FormRecord): boolean {
  return includesAnyInsensitive(get(record, FIELD.q40), [
    'Utilidad pública (solo para mujeres)',
    'Utilidad pública y prisión domiciliaria',
    'Utilidad pública y libertad condicional',
  ]);
}

function isFormularioBloqueado(record: FormRecord): boolean {
  return lockRules.some((r) => r.when(record));
}

function isCasoCerrado(record: FormRecord): boolean {
  const decisionUsuario = get(record, FIELD.q39);
  const actuacion = get(record, FIELD.q40);
  const q44 = get(record, FIELD.q44);
  const q45 = get(record, FIELD.q45);
  const q54 = get(record, FIELD.q54);
  const q56 = get(record, FIELD.q56);

  if (hasNoInProcedencias30a36(record)) return true;
  if (
    decisionUsuario &&
    !equalsInsensitive(decisionUsuario, 'Desea que el defensor(a) público(a) avance con la solicitud')
  ) {
    return true;
  }
  if (includesAnyInsensitive(actuacion, ['ninguna'])) return true;
  if (equalsInsensitive(q44, 'No') || equalsInsensitive(q45, 'No')) return true;
  if (q54 && equalsInsensitive(q54, 'No')) return true;
  if (isFilled(q56)) return true;
  return false;
}

export const mandatoryByBlock: MandatoryByBlock = {
  bloque1: [],
  bloque2Aurora: [
    { key: 'Autoridad a cargo', label: '14 Autoridad a cargo' },
    { key: 'Número de proceso', label: '15 Número de proceso' },
    { key: 'Delitos', label: '16 Delitos' },
    { key: 'Fecha de captura', label: '17 Fecha de captura' },
    { key: 'Pena (años, meses y días)', label: '18 Pena (años, meses y días)' },
    { key: 'Pena total en días', label: '19 Pena total en días' },
    { key: 'Tiempo que la persona lleva privada de la libertad (en días)', label: '20 Tiempo privada de libertad' },
    { key: 'Redención total acumulada en días', label: '21 Redención total acumulada en días' },
    { key: 'Tiempo efectivo de pena cumplida en días (teniendo en cuenta la redención)', label: '22 Tiempo efectivo cumplido' },
    { key: 'Porcentaje de avance de pena cumplida', label: '23 Porcentaje de avance de pena cumplida' },
    { key: 'Fase de tramiento', label: '24 Fase de tratamiento' },
    { key: '¿ Cuenta con requerimientos judiciales por otros procesos ?', label: '25 Requerimientos judiciales por otros procesos' },
    { key: 'Fecha última calificación ', label: '26 Fecha última calificación' },
    { key: 'Calificación de conducta', label: '27 Calificación de conducta' },
  ],
  bloque3: [
    { key: 'Defensor(a) Público(a) Asignado para tramitar la solicitud', label: '28 Defensor(a) público(a)' },
    { key: 'Fecha de análisis jurídico del caso', label: '29 Fecha de análisis jurídico del caso' },
    { key: FIELD.q30, label: '30 Procedencia de libertad condicional' },
    { key: FIELD.q31, label: '31 Procedencia de prisión domiciliaria de mitad de pena' },
    { key: FIELD.q32, label: '32 Procedencia de utilidad pública (solo para mujeres)' },
    { key: FIELD.q33, label: '33 Procedencia de pena cumplida' },
    { key: FIELD.q34, label: '34 Procedencia de acumulación de penas' },
    { key: FIELD.q36, label: '36 Otras solicitudes a tramitar' },
    { key: FIELD.q37, label: '37 Resumen del análisis del caso' },
  ],
  bloque4: [
    { key: FIELD.q38, label: '38 Fecha de la entrevista' },
    { key: FIELD.q39, label: '39 Decisión del usuario' },
    { key: FIELD.q40, label: '40 Actuación a adelantar' },
    { key: 'Requiere pruebas', label: '41 Requiere pruebas' },
    { key: 'Poder en caso de avanzar con la solicitud', label: '42 Poder en caso de avanzar con la solicitud' },
  ],
  bloque5UtilidadPublica: [
    { key: FIELD.q44, label: '44 Cumple requisito de marginalidad' },
    { key: FIELD.q45, label: '45 Cumple requisito de jefatura de hogar' },
    { key: FIELD.q46, label: '46 Se requiere misión de trabajo' },
    { key: FIELD.q49, label: '49 Fecha en la que se reciben todas las pruebas' },
    { key: FIELD.q50, label: '50 Fecha de radicación de utilidad pública' },
    { key: FIELD.q51, label: '51 Fecha de decisión de la autoridad' },
    { key: FIELD.q52, label: '52 Sentido de la decisión' },
  ],
  bloque5TramiteNormal: [
    // Placeholder compatible con el mapeo actual. Ajustar si cambian las claves en UI/config.
    { key: FIELD.b5NormalRadicacion, label: 'Hito principal de radicación (bloque 5 normal)' },
    { key: FIELD.b5NormalDecision, label: 'Fecha de decisión (bloque 5 normal)' },
  ],
};

export const blockOrder: AuroraBlockId[] = ['bloque1', 'bloque2Aurora', 'bloque3', 'bloque4'];

export const blockVariants = {
  bloque5: {
    defaultVariant: 'bloque5TramiteNormal' as const,
    variants: ['bloque5UtilidadPublica', 'bloque5TramiteNormal'] as const,
  },
};

export const conditionalBlockVisibility: BlockVariantRule[] = [
  {
    id: 'b5_utilidad_publica_por_q40',
    description: 'Si Q40 es utilidad pública, mostrar 5A y ocultar 5 normal.',
    when: (record) => isUtilidadPublicaFlow(record),
    show: ['bloque5UtilidadPublica'],
    hide: ['bloque5TramiteNormal'],
  },
];

export const lockRules: LockRule[] = [
  {
    id: 'lock_por_decision_usuario_39',
    description:
      'Bloquea resto del formulario si Q39 = "Tiene abogado de confianza, pero desea que la defensoría pública lo asesore en la solicitud".',
    when: (record) =>
      equalsInsensitive(
        get(record, FIELD.q39),
        'Tiene abogado de confianza, pero desea que la defensoría pública lo asesore en la solicitud'
      ),
  },
  {
    id: 'lock_por_actuacion_40_sindicada',
    description: 'Bloquea resto del formulario si Q40 incluye "Ninguna porque la persona está sindicada".',
    when: (record) => includesAnyInsensitive(get(record, FIELD.q40), ['Ninguna porque la persona está sindicada']),
  },
];

export const dependencyRules: DependencyRule[] = [
  {
    id: 'dep_q46_no_deshabilita_47_48',
    source: { key: FIELD.q46, label: '46 Se requiere misión de trabajo' },
    description: 'Si Q46 = NO, deshabilita 47 y 48.',
    when: (record) => equalsInsensitive(get(record, FIELD.q46), 'No'),
    effects: {
      disable: [FIELD.q47, FIELD.q48],
    },
  },
  {
    id: 'dep_q52_niega_utilidad_publica',
    source: { key: FIELD.q52, label: '52 Sentido de la decisión' },
    description: 'Si Q52 = Niega utilidad pública, habilita las siguientes 3 preguntas dependientes.',
    when: (record) => equalsInsensitive(get(record, FIELD.q52), 'Niega utilidad pública'),
    effects: {
      enable: [FIELD.q53, FIELD.q54, FIELD.q55],
    },
  },
  {
    id: 'dep_q56_niega_utilidad_publica',
    source: { key: FIELD.q56, label: '56 Sentido de la decisión que resuelve recurso' },
    description: 'Si Q56 = Niega utilidad pública, habilita las siguientes 3 preguntas dependientes (si existen).',
    when: (record) => equalsInsensitive(get(record, FIELD.q56), 'Niega utilidad pública'),
    effects: {
      enable: [
        // placeholders opcionales para la rama posterior
        '57_DEPENDIENTE_POST_56',
        '58_DEPENDIENTE_POST_56',
        '59_DEPENDIENTE_POST_56',
      ],
    },
  },
];

export const derivedStatusRules: DerivedStatusRule[] = [
  {
    id: 'estado_caso_cerrado',
    status: 'Caso cerrado',
    when: (record) => isCasoCerrado(record),
  },
  {
    id: 'estado_analizar_el_caso',
    status: 'Analizar el caso',
    when: (record) => !isFilled(get(record, 'Fecha de análisis jurídico del caso')) || !isFilled(get(record, FIELD.q37)),
  },
  {
    id: 'estado_entrevistar_al_usuario',
    status: 'Entrevistar al usuario',
    when: (record) =>
      isFilled(get(record, 'Fecha de análisis jurídico del caso')) &&
      isFilled(get(record, FIELD.q37)) &&
      (!isFilled(get(record, FIELD.q38)) || !isFilled(get(record, FIELD.q40))),
  },
  {
    id: 'estado_presentar_solicitud',
    status: 'Presentar solicitud',
    when: (record) => {
      const baseReady =
        isFilled(get(record, 'Fecha de análisis jurídico del caso')) &&
        isFilled(get(record, FIELD.q37)) &&
        isFilled(get(record, FIELD.q38)) &&
        isFilled(get(record, FIELD.q40));
      if (!baseReady) return false;
      if (isUtilidadPublicaFlow(record)) return !isFilled(get(record, FIELD.q50));
      return !isFilled(get(record, FIELD.b5NormalRadicacion));
    },
  },
  {
    id: 'estado_pendiente_decision',
    status: 'Pendiente decisión',
    when: (record) => {
      const baseReady =
        isFilled(get(record, 'Fecha de análisis jurídico del caso')) &&
        isFilled(get(record, FIELD.q37)) &&
        isFilled(get(record, FIELD.q38)) &&
        isFilled(get(record, FIELD.q40));
      if (!baseReady) return false;
      if (isUtilidadPublicaFlow(record)) {
        return isFilled(get(record, FIELD.q50)) && !isFilled(get(record, FIELD.q51));
      }
      return isFilled(get(record, FIELD.b5NormalRadicacion)) && !isFilled(get(record, FIELD.b5NormalDecision));
    },
  },
];

function areMandatoryFieldsFilled(record: FormRecord, blockId: AuroraBlockId): boolean {
  const fields = mandatoryByBlock[blockId] || [];
  return fields.every((f) => f.optional || isFilled(get(record, f.key)));
}

function getSelectedBlock5Variant(record: FormRecord): AuroraBlockId {
  return isUtilidadPublicaFlow(record) ? 'bloque5UtilidadPublica' : 'bloque5TramiteNormal';
}

export function resolveVisibleBlocksAurora(record: FormRecord, flow: AuroraFlow = 'condenado'): AuroraBlockId[] {
  // Este archivo define reglas de Aurora (condenados). Para sindicado se retorna base mínima.
  if (flow !== 'condenado') return ['bloque1'];

  const visible: AuroraBlockId[] = ['bloque1', 'bloque2Aurora'];
  const blocked = isFormularioBloqueado(record);
  if (blocked) return visible;

  // Regla global: para mostrar el siguiente bloque, deben estar completos los obligatorios visibles hasta el momento.
  const progression: AuroraBlockId[] = ['bloque3', 'bloque4', getSelectedBlock5Variant(record)];

  for (const candidate of progression) {
    const allVisibleMandatoryDone = visible.every((b) => areMandatoryFieldsFilled(record, b));
    if (!allVisibleMandatoryDone) break;
    visible.push(candidate);
  }

  // Excepción condicional: fuerza visibilidad/ocultamiento por reglas de variante.
  conditionalBlockVisibility.forEach((rule) => {
    if (!rule.when(record)) return;
    rule.hide.forEach((b) => {
      const idx = visible.indexOf(b);
      if (idx >= 0) visible.splice(idx, 1);
    });
    rule.show.forEach((b) => {
      if (!visible.includes(b)) visible.push(b);
    });
  });

  return visible;
}

export function deriveEstadoTramiteAurora(record: FormRecord): DerivedStatus {
  const hit = derivedStatusRules.find((r) => r.when(record));
  return hit?.status || 'Analizar el caso';
}

export const auroraFormRules = {
  mandatoryByBlock,
  blockOrder,
  blockVariants,
  conditionalBlockVisibility,
  lockRules,
  dependencyRules,
  derivedStatusRules,
  helpers: {
    isUtilidadPublicaFlow,
    isFormularioBloqueado,
    isCasoCerrado,
    resolveVisibleBlocksAurora,
    deriveEstadoTramiteAurora,
  },
};

export default auroraFormRules;
