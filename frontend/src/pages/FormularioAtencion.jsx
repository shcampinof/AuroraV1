import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPplActuacion, getPplByDocumento, updatePpl } from '../services/api.js';
import Toast from '../components/Toast.jsx';
import HistorialActuacionesPPL from '../components/HistorialActuacionesPPL.jsx';
import { evaluateAuroraRules } from '../utils/evaluateAuroraRules.ts';
import { evaluateCelesteRules } from '../utils/evaluateCelesteRules.ts';
import { AURORA_FIELD_IDS } from '../config/auroraFieldIds.ts';
import { reportError } from '../utils/reportError.js';
import { getLabelAccionCaso } from '../utils/actuacionesLabels.js';

const OPCIONES_TIPO_IDENTIFICACION = ['CC', 'CE', 'PASAPORTE', 'OTRA'];
const OPCIONES_SI_NO = ['Sí', 'No'];
const OPCIONES_PODER = ['Sí se requiere', 'Ya se cuenta con poder'];
const KEY_Q35_LEGACY = 'Con qu? proceso(s) debe acumular penas (si aplica)';
const KEY_Q35_UTF8 = 'Con quÃƒÂ© proceso(s) debe acumular penas (si aplica)';

// AURORA (PPL CONDENADOS)
const OPCIONES_SITUACION_JURIDICA = ['Condenado', 'Sindicado'];
const OPCIONES_GENERO_AURORA = [
  'Masculino',
  'Femenino',
  'Queer',
  'Mujer trans',
  'Hombre trans',
  'Persona no binaria',
  'Prefiere no responder',
  'Otra identidad',
];
const OPCIONES_ENFOQUE_ETNICO = [
  'Negro',
  'Afrocolombiano (a) / Afrodescendiente',
  'Raizal',
  'Palenquero',
  'Gitano (a) o Rrom',
  'IndÃƒÂ­gena',
];
const OPCIONES_LUGAR_PRIVACION = ['CDT', 'ERON'];
const OPCIONES_FASE_TRATAMIENTO = [
  'ObservaciÃƒÂ³n',
  'Alta',
  'Mediana',
  'MÃƒÂ­nima',
  'Confianza',
  'No reporta',
];
const OPCIONES_CALIFICACION_CONDUCTA = [
  'Ejemplar',
  'Excelente',
  'Buena',
  'Regular',
  'Mala',
  'Pendiente',
  'Sin registro',
];

const OPCIONES_PROCEDENCIA_LIBERTAD_CONDICIONAL = [
  'SÃƒÂ­ procede solicitud de libertad condicional',
  'No aplica porque ya hay solicitud de libertad o subrogado penal en trÃƒÂ¡mite',
  'No aplica porque ya est? en libertad por pena cumplida',
  'No aplica porque ya se concediÃƒÂ³ libertad condicional',
  'No aplica porque ya se concediÃƒÂ³ prisiÃƒÂ³n domiciliaria',
  'No aplica porque ya se concediÃƒÂ³ utilidad pÃƒÂºblica',
  'No aplica porque el proceso no ha sido asignado a JEPMS',
  'No aplica porque el proceso est? en otro circuito judicial (falta trasladar el proceso al actual)',
  'No aplica porque la condena est? por delito excluido del subrogado',
  'No aplica porque recientemente se le revocÃƒÂ³ subrogado penal',
  'No aplica porque recientemente se le negÃƒÂ³ subrogado penal',
  'No aplica porque la evaluaciÃƒÂ³n de conducta es negativa',
  'No aplica porque se determinÃƒÂ³ que no ha cumplido requisito temporal para acceder',
  'No aplica porque tiene acumulaciÃƒÂ³n de penas',
  'No aplica porque la persona fue trasladada a otro ERON',
  'No aplica porque la persona est? sindicada',
  'No aplica porque la cartilla biogrÃƒÂ¡fica no est? actualizada',
  'RevisiÃƒÂ³n suspendida porque se requiere primero trÃƒÂ¡mite de acumulaciÃƒÂ³n de penas',
  'No aplica porque el usuario no puede demostrar arraigo',
];

const OPCIONES_PROCEDENCIA_PRISION_DOMICILIARIA = [
  'SÃƒÂ­ procede solicitud de prisiÃƒÂ³n domiciliaria de mitad de pena',
  'No aplica porque ya hay solicitud de libertad o subrogado penal en trÃƒÂ¡mite',
  'No aplica porque ya est? en libertad por pena cumplida',
  'No aplica porque ya se concediÃƒÂ³ libertad condicional',
  'No aplica porque ya se concediÃƒÂ³ prisiÃƒÂ³n domiciliaria',
  'No aplica porque ya se concediÃƒÂ³ utilidad pÃƒÂºblica',
  'No aplica porque el proceso no ha sido asignado a jepms',
  'No aplica porque el proceso est? en otro circuito judicial (falta trasladar el proceso al actual)',
  'No aplica porque la condena est? por delito excluido del subrogado',
  'No aplica porque recientemente se le revocÃƒÂ³ un subrogado penal',
  'No aplica porque recientemente se le negÃƒÂ³ subrogado penal',
  'No aplica porque la evaluaciÃƒÂ³n de conducta es negativa',
  'No aplica porque se determinÃƒÂ³ que no ha cumplido requisito temporal para acceder',
  'No aplica porque tiene acumulaciÃƒÂ³n de penas',
  'No aplica porque la persona fue trasladada a otro ERON',
  'No aplica porque la persona est? sindicada',
  'No aplica porque la cartilla biogrÃƒÂ¡fica no est? actualizada',
  'RevisiÃƒÂ³n suspendida porque se requiere primero trÃƒÂ¡mite de acumulaciÃƒÂ³n de penas',
  'No aplica porque el usuario no puede demostrar arraigo',
];

const OPCIONES_PROCEDENCIA_UTILIDAD_PUBLICA = [
  'SÃƒÂ­ cumple requisitos objetivos',
  'No cumple por tipo de delito',
  'No cumple monto de pena',
  'No cumple por reincidencia',
  'No cumple por delito excluido',
];

const OPCIONES_OTRAS_SOLICITUDES = [
  'Ninguna',
  'Solicitud de actualizaciÃƒÂ³n de conducta',
  'Solicitud de asignaciÃƒÂ³n de JEPMS',
  'Solicitud de traslado del proceso al distrito judicial correspondiente',
  'Solicitud de actualizaciÃƒÂ³n de cartilla biogrÃƒÂ¡fica',
  'Solicitud de redenciÃƒÂ³n de pena 2x3 trabajo',
  'Solicitud de redenciÃƒÂ³n de pena 2x3 analÃƒÂ³gica en actividades distintas a trabajo',
  'Permiso de 72 horas',
  'Otra',
];

const OPCIONES_AURORA_DECISION_USUARIO = [
  'SÃƒÂ­, desea que el defensor(a) pÃƒÂºblico(a) avance con la solicitud',
  'SÃƒÂ­ desea que el defensor presente solicitud, pero suscrita por la persona privada de la Libertad.',
  'No, porque desea tramitar la solicitud a travÃƒÂ©s de su defensor de confianza',
  'No desea tramitar la solicitud',
  'No avanzar? porque no puede demostar arraigo fuera de prisiÃƒÂ³n',
  'El usuario es renuente a la atenciÃƒÂ³n',
];

const OPCIONES_AURORA_ACTUACION_A_ADELANTAR = [
  'Libertad condicional',
  'PrisiÃƒÂ³n domiciliaria',
  'Utilidad pÃƒÂºblica (solo para mujeres)',
  'Utilidad pÃƒÂºblica y prisiÃƒÂ³n domiciliaria',
  'Utilidad pÃƒÂºblica y libertad condicional',
  'RedenciÃƒÂ³n de pena y libertad condicional',
  'RedenciÃƒÂ³n de pena y prisiÃƒÂ³n domiciliaria',
  'Libertad condicional y en subsidio prisiÃƒÂ³n domiciliaria',
  'AcumulaciÃƒÂ³n de penas',
  'Libertad por pena cumplida',
  'RedenciÃƒÂ³n de pena y libertad por pena cumplida',
  'RedenciÃƒÂ³n de pena',
  'Permiso de 72 horas',
  'Solicitud de actualizaciÃƒÂ³n de conducta',
  'Solicitud de asginaciÃƒÂ³n de JEPMS',
  'Solicitud de traslado del proceso al distrito judicial correspondiente',
  'Solicitud de actualizaciÃƒÂ³n de cartilla biogrÃƒÂ¡fica',
  'Otra',
  'Ninguna porque la persona est? sindicada',
  'Ninguna porque est? en trÃƒÂ¡mite una solicitud de subrogado penal o pena cumplida',
  'Ninguna porque no procede subrogado penal en este momento por falta de cumplimiento de requisitos',
  'Ninguna porque no procede subrogado penal por exclusiÃƒÂ³n de delito',
  'Ninguna porque ya no est? en prisiÃƒÂ³n',
];

const ACTUACIONES_UTILIDAD_PUBLICA = new Set([
  'Utilidad pública (solo para mujeres)',
  'Utilidad pública y prisión domiciliaria',
  'Utilidad pública y libertad condicional',
]);
const ACTUACIONES_UTILIDAD_PUBLICA_NORMALIZADAS = new Set(
  Array.from(ACTUACIONES_UTILIDAD_PUBLICA).map((v) => norm(maybeDecodeUtf8Mojibake(v)))
);

const OPCIONES_BLOQUE_5A_SENTIDO_DECISION = ['Otorga utilidad pÃƒÂºblica', 'Niega utilidad pÃƒÂºblica'];
const OPCIONES_BLOQUE_5A_MOTIVO_DECISION_NEGATIVA = [
  'No concede por requisito objetivo',
  'No concende por requisito subjetivo',
  'No concede por requisitos objetivos y subjetivos',
  'Niega por falta de pruebas',
  'Concede otro beneficio',
  'Pena cumplida',
];
const OPCIONES_BLOQUE_5A_SENTIDO_DECISION_RESUELVE_RECURSO = [
  'Otorga utilidad pÃƒÂºblica',
  'Niega utilidad pÃƒÂºblica',
];

const OPCIONES_BLOQUE_5B_SENTIDO_DECISION = ['Concede subrogado penal', 'No concede subrogado penal'];
const OPCIONES_BLOQUE_5B_MOTIVO_DECISION_NEGATIVA = [
  'Porque no cumple aÃƒÂºn con el tiempo para aplicar al subrogado',
  'Porque falta documentaciÃƒÂ³n a remitir por parte del Inpec',
  'Porque la autoridad judicial no tuvo en cuenta todo el tiempo de privaciÃƒÂ³n de libertad de la persona en otros ERON o centro de detenciÃƒÂ³n transitoria',
  'Por la valoraciÃƒÂ³n de la conducta punible contenida en la sentencia',
  'Porque el juez encuentra que el avance en el tratamiento penitenciario de la persona aÃƒÂºn no es suficiente',
  'Porque tiene calificaciones de conducta negativa de periodos anteriores',
  'Porque no se demostrÃƒÂ³ el arraigo familiar o social de la persona privada de la libertad',
  'Porque no se ha reparado a la vÃƒÂ­ctima o asegurado el pago de la indemnizaciÃƒÂ³n a esta a travÃƒÂ©s de garantÃƒÂ­a personal, real, bancaria o acuerdo de pago y tampoco se ha demostrado la insolvencia del condenado',
  'Porque determinÃƒÂ³ que hay un delito excluido que impide concesiÃƒÂ³n',
  'Porque la persona privada de la libertad pertenece al grupo familiar de la vÃƒÂ­ctima',
  'Porque no se demostrÃƒÂ³ el arraigo familiar o social de la persona privada de la libertad',
  'Porque la persona no tiene un lugar al que ir por fuera de prisiÃƒÂ³n (no tiene arraigo)',
  'Porque no cumple requisito de jefatura de hogar para utilidad pÃƒÂºblica',
  'Porque no cumple requisito de marginalidad para utilidad pÃƒÂºblica',
  'Se considerÃƒÂ³ que no cumple algÃƒÂºn requisito para su procedencia',
];
const OPCIONES_BLOQUE_5B_SENTIDO_DECISION_RESUELVE_SOLICITUD = ['Favorable', 'Desfavorable'];
const OPCIONES_CIERRE_CASO_IMPOSIBILIDAD_AVANZAR = [
  '-',
  'Se cierra porque la persona ya no est\u00e1 en el ERON por raz\u00f3n ajena a este tr\u00e1mite.',
  'Otro motivo.',
];

// CELESTE (PPL SINDICADOS)
const OPCIONES_SITUACION_JURIDICA_ACTUALIZADA = ['Condenado', 'Sindicado'];
const OPCIONES_CELESTE_ANALISIS_ACTUACION = [
  'Se avanzar? con solicitud de revocatoria o sustituciÃƒÂ³n de la medida',
  'No se avanzar? con la revocatoria porque la persona ya fue condenada',
  'No se avanzar? con la revocatoria porque aÃƒÂºn no reÃƒÂºne el tiempo exigido por la norma para solicitar el levantamiento de la detenciÃƒÂ³n preventiva',
  'No se avanzar? con la revocatoria porque la persona est? procesada por delitos en los que procede prÃƒÂ³rroga de la detenciÃƒÂ³n preventiva y aÃƒÂºn no cumple ese tiempo',
  'No se avanzar? con la revocatoria porque son tres o mÃƒÂ¡s los acusados y aÃƒÂºn no se cumple el tiempo para solicitar el levantamiento de la detenciÃƒÂ³n preventiva en este supuesto',
  'No se avanzar? con la revocatoria porque la persona est? procesada por delitos atribuibles a Grupos Delictivos Organizados (GDO) o Grupos Armados Organizados (GAO) y aÃƒÂºn no cumple el tiempo permitido',
  'No se avanzar? con la revocatoria porque ya hay una solicitud en trÃƒÂ¡mite',
];
const OPCIONES_SENTIDO_DECISION_CELESTE = [
  'Revoca medida de aseguramiento privativa de la libertad',
  'Sustituye medida de aseguramiento privativa de la libertad',
  'Niega la solicitud',
];
const OPCIONES_MOTIVO_DECISION_NEGATIVA_CELESTE = [
  'Porque no cumple aÃƒÂºn con los tÃƒÂ©rminos exigidos',
  'Porque est? procesado por causales en las que procede la prÃƒÂ³rroga de la medida',
  'Otra',
];
const OPCIONES_SENTIDO_DECISION_RECURSO_CELESTE = [
  'Concede levantamiento de medida de aseguramiento',
  'No concede levantamiento de medida de aseguramiento',
];

function norm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isFilled(value) {
  return String(value ?? '').trim() !== '';
}

function isCierreImposibilidadSeleccionado(value) {
  const v = String(value ?? '').trim();
  return v !== '' && v !== '-';
}

function computeFlow(formData) {
  // REGLA DE NEGOCIO: el flujo depende exclusivamente de "SituaciÃƒÂ³n JurÃƒÂ­dica".
  const base = norm(formData?.['SituaciÃƒÂ³n JurÃƒÂ­dica']);
  if (!base || base === '-') return null;
  if (base.includes('condenad')) return 'condenado';
  if (base.includes('sindicad')) return 'sindicado';
  return null;
}

function isEquivalenteNo(valor) {
  const v = norm(valor);
  if (!v) return false;
  if (v === 'no') return true;
  if (v.startsWith('no aplica')) return true;
  if (v.startsWith('no cumple')) return true;
  return false;
}

function isEquivalenteSi(valor) {
  const v = norm(valor);
  return v === 'si' || v === 's?';
}

function isNoConcedeSubrogadoPenal(valor) {
  return norm(valor) === norm('No concede subrogado penal');
}

function decisionUsuarioPermiteAvance(valor) {
  const v = norm(valor);
  if (!v) return false;
  if (v.startsWith('si')) return true;
  if (v.includes('desea que el defensor') && v.includes('avance con la solicitud')) return true;
  if (v.includes('desea que el defensor presente solicitud')) return true;
  return false;
}

function decodeUnicodeEscapes(text) {
  return String(text ?? '')
    .replace(/\\\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

const CP1252_REVERSE_MAP = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function cp1252CharsToBytes(input) {
  const text = String(input ?? '');
  const bytes = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = CP1252_REVERSE_MAP.get(code);
    if (mapped != null) {
      bytes.push(mapped);
      continue;
    }
    return null;
  }
  return Uint8Array.from(bytes);
}

function maybeDecodeUtf8Mojibake(text) {
  let out = String(text ?? '');
  for (let pass = 0; pass < 3; pass += 1) {
    if (!/[ÃƒÃ‚Ã¢Â]/.test(out)) break;
    try {
      const bytes = cp1252CharsToBytes(out);
      if (!bytes) break;
      const decoded = new TextDecoder('utf-8').decode(bytes);
      if (!decoded || decoded === out) break;
      out = decoded;
    } catch {
      break;
    }
  }
  return out;
}

function normalizeFieldName(value) {
  return maybeDecodeUtf8Mojibake(decodeUnicodeEscapes(String(value ?? '')))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const REGISTRO_PROXY_TARGET = new WeakMap();

function wrapRegistroForLookup(rawRegistro) {
  if (!rawRegistro || typeof rawRegistro !== 'object') return null;
  if (REGISTRO_PROXY_TARGET.has(rawRegistro)) return rawRegistro;

  const target = { ...rawRegistro };
  const normalizedIndex = new Map();
  Object.keys(target).forEach((key) => {
    const nk = normalizeFieldName(key);
    if (nk && !normalizedIndex.has(nk)) normalizedIndex.set(nk, key);
  });

  const proxy = new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop !== 'string') return Reflect.get(obj, prop, receiver);
      if (Reflect.has(obj, prop)) return Reflect.get(obj, prop, receiver);
      const alt = normalizedIndex.get(normalizeFieldName(prop));
      if (alt && Reflect.has(obj, alt)) return Reflect.get(obj, alt, receiver);
      return undefined;
    },
  });

  REGISTRO_PROXY_TARGET.set(proxy, target);
  return proxy;
}

function unwrapRegistro(record) {
  if (!record || typeof record !== 'object') return {};
  return REGISTRO_PROXY_TARGET.get(record) || record;
}

function displayText(value) {
  let out = decodeUnicodeEscapes(String(value ?? ''));
  out = maybeDecodeUtf8Mojibake(out);
  out = out
    .replace(/Â(?=[¿¡])/g, '')
    .replace(/\best\?/gi, 'est\u00e1')
    .replace(/\bavanzar\?/gi, 'avanzar\u00e1')
    .replace(/\bdemostar\b/gi, 'demostrar')
    .replace(/\?ltima/gi, '\u00faltima');
  return out;
}

function parsePercentageValue(rawValue) {
  const text = String(rawValue ?? '').trim().replace(',', '.');
  if (!text) return null;
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, parsed));
}

const META_REGISTRO_KEYS = new Set(['casos', 'activeCaseId', 'caseId']);
const CAMPOS_BASE_NUEVA_ACTUACION = new Set([
  'nombre',
  'nombre usuario',
  'tipo de indentificacion',
  'tipo de identificacion',
  'numero de identificacion',
  'situacion juridica',
  'situacion juridica actualizada (de conformidad con la rama judicial)',
  'genero',
  'enfoque etnico/racial/cultural',
  'nacionalidad',
  'fecha de nacimiento',
  'edad',
  'lugar de privacion de la libertad',
  'nombre del lugar de privacion de la libertad',
  'departamento del lugar de privacion de la libertad',
  'distrito municipio del lugar de privacion de la libertad',
  'la persona sigue en el cdt',
  'autoridad a cargo',
  'numero de proceso',
  'delitos',
  'fecha de captura',
  'pena anos meses y dias',
  'pena total en dias',
  'tiempo que la persona lleva privada de la libertad en dias',
  'redencion total acumulada en dias',
  'tiempo efectivo de pena cumplida en dias teniendo en cuenta la redencion',
  'porcentaje de avance de pena cumplida',
  'fase de tramiento',
  'cuenta con requerimientos judiciales por otros procesos',
  'fecha ultima calificacion',
  'calificacion de conducta',
  'defensor(a) publico(a) asignado para tramitar la solicitud',
  'pag',
  '__rowindex',
]);

function normalizeFieldKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function isBaseFieldForNuevaActuacion(key) {
  return CAMPOS_BASE_NUEVA_ACTUACION.has(normalizeFieldKey(key));
}

function buildNuevaActuacionDraft(source) {
  const target = source && typeof source === 'object' ? source : {};
  const next = {};

  Object.keys(target).forEach((key) => {
    if (META_REGISTRO_KEYS.has(key)) return;

    const value = target[key];
    if (Array.isArray(value)) return;
    if (value && typeof value === 'object') return;

    if (isBaseFieldForNuevaActuacion(key)) {
      next[key] = value;
      return;
    }
    next[key] = '';
  });

  return next;
}

function Campo({
  label,
  name,
  type = 'text',
  value,
  onChange,
  options,
  readOnly = false,
  disabled = false,
  required = true,
  showObligatoria = false,
}) {
  const isDisabled = Boolean(readOnly || disabled);
  const labelNode = (
    <label>
      {displayText(label)}
      {showObligatoria && <span className="required-note"> *Obligatoria*</span>}
    </label>
  );
  if (type === 'select') {
    const normalizedValue = value === '-' ? '' : value ?? '';
    return (
      <div className={`form-field${isDisabled ? ' is-disabled' : ''}`}>
        {labelNode}
        <select
          name={name}
          value={normalizedValue}
          onChange={(e) => onChange(name, e.target.value)}
          disabled={isDisabled}
          required={required}
        >
          <option value="" disabled hidden />
          {(options || OPCIONES_SI_NO).map((opt, idx) => {
            const optionValue = typeof opt === 'string' ? opt : String(opt?.value ?? '');
            const optionLabel = typeof opt === 'string' ? opt : String(opt?.label ?? opt?.value ?? '');
            return (
              <option key={`${idx}-${optionValue}`} value={optionValue}>
                {displayText(optionLabel)}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div className={`form-field${isDisabled ? ' is-disabled' : ''}`}>
        {labelNode}
        <textarea
          name={name}
          value={value ?? ''}
          onChange={(e) => {
            if (!isDisabled) onChange(name, e.target.value);
          }}
          rows={4}
          readOnly={isDisabled}
          disabled={isDisabled}
          required={required}
        />
      </div>
    );
  }

  return (
    <div className={`form-field${isDisabled ? ' is-disabled' : ''}`}>
      {labelNode}
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={(e) => {
          if (!isDisabled) onChange(name, e.target.value);
        }}
        readOnly={isDisabled}
        disabled={isDisabled}
        required={required}
      />
    </div>
  );
}

export default function FormularioAtencion({ numeroInicial }) {
  const [numeroBusqueda, setNumeroBusqueda] = useState(numeroInicial || '');
  const [registro, setRegistro] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('Aurora - Cambios guardados correctamente');
  const [saltoCelesteGuardando, setSaltoCelesteGuardando] = useState(false);
  const [auroraAbrirBloque2, setAuroraAbrirBloque2] = useState(false);
  const [historialRefreshToken, setHistorialRefreshToken] = useState(0);
  const [actuacionActivaId, setActuacionActivaId] = useState('');
  const [textoAccionCaso, setTextoAccionCaso] = useState(getLabelAccionCaso(false));
  const [creandoActuacion, setCreandoActuacion] = useState(false);
  const [mostrarFormularioDetalle, setMostrarFormularioDetalle] = useState(false);
  const bloque2AuroraRef = useRef(null);

  useEffect(() => {
    if (numeroInicial) buscarRegistro(numeroInicial);
  }, [numeroInicial]);

  const flow = useMemo(() => (registro ? computeFlow(registro) : null), [registro]);
  const tiempoPrivacionMeses = useMemo(() => {
    if (!registro) return '';

    const rawDays = String(registro['Tiempo que la persona lleva privada de la libertad (en dÃƒÂ­as)'] ?? '').trim();
    const days = Number(rawDays.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(days)) return String(Math.floor(days / 30));

    const rawFecha = String(registro['Fecha de captura'] ?? '').trim();
    if (!rawFecha) return '';
    const fc = new Date(rawFecha);
    if (Number.isNaN(fc.getTime())) return '';
    const diffDays = Math.floor((Date.now() - fc.getTime()) / 86400000);
    if (!Number.isFinite(diffDays) || diffDays < 0) return '';
    return String(Math.floor(diffDays / 30));
  }, [registro]);

  const getDocumentoActual = useCallback(
    (fromRegistro = registro) => {
      const source = fromRegistro && typeof fromRegistro === 'object' ? fromRegistro : {};
      const explicit = source.numeroIdentificacion ?? source['NÃƒÂºmero de identificaciÃƒÂ³n'] ?? source['Numero de identificacion'];
      if (String(explicit ?? '').trim()) return String(explicit).trim();

      const docKey = Object.keys(source).find((k) => {
        const normalized = String(k || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
        return normalized === 'numero de identificacion' || normalized === 'numeroidentificacion';
      });

      return String((docKey ? source[docKey] : '') ?? numeroBusqueda ?? '').trim();
    },
    [numeroBusqueda, registro]
  );

  const buildUpdatePayload = useCallback(
    (nextData) => {
      const payload = { data: nextData };
      const id = String(actuacionActivaId || '').trim();
      if (id) payload.actuacionId = id;
      return payload;
    },
    [actuacionActivaId]
  );

  const handleActionLabelChange = useCallback((nextLabel) => {
    const incoming = String(nextLabel || '').trim();
    if (!incoming) return;
    setTextoAccionCaso((prev) => (prev === incoming ? prev : incoming));
  }, []);

  async function buscarRegistro(numero) {
    const doc = String(numero || '').trim();
    if (!doc) {
      setError('Ingrese un numero de identificacion.');
      return;
    }

    setCargando(true);
    setError('');
    setGuardadoOk(false);
    setToastOpen(false);
    try {
      const data = await getPplByDocumento(doc);
      setNumeroBusqueda(doc);
      setRegistro(wrapRegistroForLookup(data?.registro || null));
      setActuacionActivaId('');
      setTextoAccionCaso(getLabelAccionCaso(false));
      setMostrarFormularioDetalle(false);
      setHistorialRefreshToken((prev) => prev + 1);
    } catch (e) {
      reportError(e, 'formulario-entrevista:buscar');
      setRegistro(null);
      setActuacionActivaId('');
      setTextoAccionCaso(getLabelAccionCaso(false));
      setMostrarFormularioDetalle(false);
      setError('No se encontro el usuario con ese numero.');
    } finally {
      setCargando(false);
    }
  }

  function handleConsultarOtro() {
    setRegistro(null);
    setNumeroBusqueda('');
    setActuacionActivaId('');
    setTextoAccionCaso(getLabelAccionCaso(false));
    setMostrarFormularioDetalle(false);
    setError('');
    setGuardadoOk(false);
    setToastOpen(false);
  }

  function handleChange(name, value) {
    setRegistro((prev) => {
      const base = { ...unwrapRegistro(prev) };
      const normalizedName = normalizeFieldName(name);
      const existingKey = Object.keys(base).find((k) => normalizeFieldName(k) === normalizedName);
      if (existingKey) {
        base[existingKey] = value;
      } else {
        base[name] = value;
      }
      return wrapRegistroForLookup(base);
    });
  }

  function handleSeleccionarActuacion(actuacion) {
    const selectedRegistro = actuacion?.registro && typeof actuacion.registro === 'object' ? actuacion.registro : null;
    if (!selectedRegistro) return;

    const selectedDoc = getDocumentoActual(selectedRegistro);
    if (selectedDoc) setNumeroBusqueda(selectedDoc);

    setError('');
    setGuardadoOk(false);
    setToastOpen(false);
    setRegistro(wrapRegistroForLookup(selectedRegistro));
    setActuacionActivaId(String(actuacion?.id ?? ''));
    setMostrarFormularioDetalle(true);
  }

  async function handleCrearNuevaActuacion(options = {}) {
    if (!registro) {
      setError('Debe cargar un usuario antes de crear una nueva actuacion.');
      return;
    }

    const doc = getDocumentoActual(registro);
    if (!doc) {
      setError('Debe cargar un usuario antes de crear una nueva actuacion.');
      return;
    }

    setCreandoActuacion(true);
    try {
      const nextDraft = buildNuevaActuacionDraft(registro);
      const response = await createPplActuacion(doc, { data: nextDraft });
      const createdActuacion =
        response?.actuacion && typeof response.actuacion === 'object' ? response.actuacion : null;
      const createdRegistro =
        createdActuacion?.registro && typeof createdActuacion.registro === 'object'
          ? createdActuacion.registro
          : response?.registro && typeof response.registro === 'object'
            ? response.registro
            : null;

      if (!createdRegistro) throw new Error('Respuesta invalida al crear actuacion');

      setRegistro(wrapRegistroForLookup(createdRegistro));
      setActuacionActivaId(String(createdActuacion?.id ?? ''));
      setError('');
      setGuardadoOk(false);
      setToastMessage('Nueva actuacion iniciada. Complete el formulario y guarde cuando finalice.');
      setToastOpen(true);
      setMostrarFormularioDetalle(Boolean(options?.abrirFormulario));
      setHistorialRefreshToken((prev) => prev + 1);
    } catch (e) {
      reportError(e, 'formulario-entrevista:crear-actuacion');
      setError('No fue posible iniciar una nueva actuacion para este PPL.');
    } finally {
      setCreandoActuacion(false);
    }
  }

  const habilitarPregunta35 = useMemo(() => {
    const v = String(registro?.['Procedencia de acumulaciÃƒÂ³n de penas'] ?? '').trim();
    return norm(v) === 'si';
  }, [registro]);

  const cierreRegla1Bloque3 = useMemo(() => {
    if (!registro) return false;

    const respuestas30a33 = [
      registro['Procedencia de libertad condicional'],
      registro['Procedencia de prisiÃƒÂ³n domiciliaria de mitad de pena'],
      registro['Procedencia de utilidad pÃƒÂºblica (solo para mujeres)'],
      registro['Procedencia de pena cumplida'],
    ];

    const todasRespondidas = respuestas30a33.every((v) => isFilled(v));
    if (!todasRespondidas) return false;

    return respuestas30a33.every((v) => isEquivalenteNo(v));
  }, [registro]);

  const decisionUsuario = useMemo(() => String(registro?.['DecisiÃƒÂ³n del usuario'] ?? '').trim(), [registro]);
  const decisionUsuarioDesbloquea = useMemo(() => decisionUsuarioPermiteAvance(decisionUsuario), [decisionUsuario]);
  const decisionUsuarioBloquea = useMemo(() => Boolean(decisionUsuario && !decisionUsuarioDesbloquea), [
    decisionUsuario,
    decisionUsuarioDesbloquea,
  ]);

  const actuacionAdelantar = useMemo(() => String(registro?.['ActuaciÃƒÂ³n a adelantar'] ?? '').trim(), [registro]);
  const actuacionBloqueaPorNinguna = useMemo(
    () => Boolean(actuacionAdelantar && actuacionAdelantar.startsWith('Ninguna')),
    [actuacionAdelantar]
  );
  const actuacionIncluyeUtilidadPublica = useMemo(
    () => ACTUACIONES_UTILIDAD_PUBLICA_NORMALIZADAS.has(norm(maybeDecodeUtf8Mojibake(actuacionAdelantar))),
    [actuacionAdelantar]
  );
  const cierreImposibilidadTramite = useMemo(
    () => String(registro?.['Cierre del caso por imposibilidad de avanzar (si aplica)'] ?? '').trim(),
    [registro]
  );
  const cierreImposibilidadUtilidad = useMemo(
    () =>
      String(
        registro?.['Cierre del caso por imposibilidad de avanzar (si aplica) - Utilidad pública'] ??
          registro?.['Cierre del caso por imposibilidad de avanzar (si aplica) - Utilidad pÃºblica'] ??
          ''
      ).trim(),
    [registro]
  );
  const sentidoDecisionBloque5 = useMemo(
    () => String(registro?.['Sentido de la decisión'] ?? registro?.['Sentido de la decisiÃƒÂ³n'] ?? '').trim(),
    [registro]
  );

  const saltoAuroraDesdeCeleste = false;
  const auroraActivo = useMemo(() => flow === 'condenado' || saltoAuroraDesdeCeleste, [flow, saltoAuroraDesdeCeleste]);
  const cierrePorDecisionFinalBloque5 = useMemo(() => {
    if (!auroraActivo) return false;
    const cierrePorQ57 =
      isCierreImposibilidadSeleccionado(cierreImposibilidadTramite) ||
      isCierreImposibilidadSeleccionado(cierreImposibilidadUtilidad);
    const cierrePorQ52Utilidad = actuacionIncluyeUtilidadPublica && isFilled(sentidoDecisionBloque5);
    return cierrePorQ57 || cierrePorQ52Utilidad;
  }, [
    auroraActivo,
    cierreImposibilidadTramite,
    cierreImposibilidadUtilidad,
    actuacionIncluyeUtilidadPublica,
    sentidoDecisionBloque5,
  ]);
  const auroraRuleState = useMemo(
    () => evaluateAuroraRules({ answers: registro || {} }),
    [registro]
  );
  const auroraVisibleBlocks = useMemo(
    () => new Set(auroraRuleState?.visibleBlocks || []),
    [auroraRuleState]
  );
  const auroraDisabledFields = useMemo(
    () => new Set(auroraRuleState?.disabledFields || []),
    [auroraRuleState]
  );
  const isAuroraFieldDisabled = (name, base = false) =>
    Boolean(base || auroraDisabledFields.has(String(name || '')));
  const celesteRuleState = useMemo(
    () => evaluateCelesteRules({ answers: registro || {} }),
    [registro]
  );
  const celesteVisibleBlocks = useMemo(
    () => new Set(celesteRuleState?.visibleBlocks || []),
    [celesteRuleState]
  );

  const defensorAsignadoBloque3 = useMemo(() => {
    const a = String(registro?.['Defensor(a) PÃƒÂºblico(a) Asignado para tramitar la solicitud'] ?? '').trim();
    if (a) return a;
    const b = String(registro?.['Defensor(a) Publico(a) Asignado para tramitar la solicitud'] ?? '').trim();
    return b;
  }, [registro]);

  const mensajeBloqueoAvanceBloque3 = useMemo(() => {
    if (!registro || !auroraActivo) return '';
    if (!auroraVisibleBlocks.has('bloque3') || auroraVisibleBlocks.has('bloque4')) return '';
    if (auroraRuleState?.locked) return '';
    if (!defensorAsignadoBloque3) {
      return 'No se puede avanzar al Bloque 4. Falta completar la pregunta 28 (Defensor(a) publico(a) asignado para tramitar la solicitud).';
    }
    return 'No se puede avanzar al Bloque 4. Completa los campos obligatorios del Bloque 3.';
  }, [registro, auroraActivo, auroraVisibleBlocks, auroraRuleState, defensorAsignadoBloque3]);

  const casoCerrado = useMemo(() => {
    if (auroraActivo && cierrePorDecisionFinalBloque5) return true;

    // BLOQUE 4
    if (auroraActivo && decisionUsuarioBloquea) return true;
    if (auroraActivo && actuacionBloqueaPorNinguna) return true;

    // BLOQUE 3 (Caso cerrado Ã¢â‚¬â€ Regla 1)
    if (auroraActivo && cierreRegla1Bloque3) return true;

    // BLOQUE 5A
    const cumpleMarginalidad = String(registro?.['Cumple el requisito de marginalidad'] ?? '').trim();
    const cumpleJefatura = String(registro?.['Cumple el requisito de jefatura de hogar'] ?? '').trim();
    if (auroraActivo && actuacionIncluyeUtilidadPublica) {
      if (cumpleMarginalidad === 'No' || cumpleJefatura === 'No') return true;

      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return true;

      const sentidoResuelveRecurso = String(registro?.['Sentido de la decisiÃƒÂ³n que resuelve recurso'] ?? '').trim();
      if (sentidoResuelveRecurso) return true;
    }

    // BLOQUE 5B
    if (auroraActivo && !actuacionIncluyeUtilidadPublica) {
      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return true;

      const sentidoResuelveSolicitud = String(
        registro?.['Sentido de la decisiÃƒÂ³n que resuelve la solicitud'] ?? ''
      ).trim();
      if (sentidoResuelveSolicitud) return true;
    }
    return false;
  }, [
    registro,
    actuacionAdelantar,
    actuacionIncluyeUtilidadPublica,
    decisionUsuarioBloquea,
    actuacionBloqueaPorNinguna,
    cierreRegla1Bloque3,
    auroraActivo,
    cierrePorDecisionFinalBloque5,
  ]);

  const motivoCierre = useMemo(() => {
    if (!registro) return '';
    if (auroraActivo && cierrePorDecisionFinalBloque5) {
      return 'Caso cerrado';
    }
    if (auroraActivo && cierreRegla1Bloque3) {
      return 'Caso cerrado: en las preguntas 30 a 33 se marco que no procede la solicitud (No/No aplica/No cumple).';
    }
    if (auroraActivo && decisionUsuarioBloquea) return 'Caso cerrado';
    if (auroraActivo && actuacionBloqueaPorNinguna) return 'Caso cerrado';
    const cumpleMarginalidad = String(registro?.['Cumple el requisito de marginalidad'] ?? '').trim();
    const cumpleJefatura = String(registro?.['Cumple el requisito de jefatura de hogar'] ?? '').trim();
    if (auroraActivo && actuacionIncluyeUtilidadPublica) {
      if (cumpleMarginalidad === 'No' || cumpleJefatura === 'No') return 'Caso cerrado';
      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return 'Caso cerrado';
      const sentidoResuelveRecurso = String(registro?.['Sentido de la decisiÃƒÂ³n que resuelve recurso'] ?? '').trim();
      if (sentidoResuelveRecurso) return 'Caso cerrado';
    }

    if (auroraActivo && !actuacionIncluyeUtilidadPublica) {
      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return 'Caso cerrado';
      const sentidoResuelveSolicitud = String(
        registro?.['Sentido de la decisiÃƒÂ³n que resuelve la solicitud'] ?? ''
      ).trim();
      if (sentidoResuelveSolicitud) return 'Caso cerrado';
    }

    return '';
  }, [
    registro,
    actuacionAdelantar,
    actuacionIncluyeUtilidadPublica,
    cierreRegla1Bloque3,
    decisionUsuarioBloquea,
    actuacionBloqueaPorNinguna,
    auroraActivo,
    cierrePorDecisionFinalBloque5,
  ]);

  useEffect(() => {
    if (!registro) return;
    const next = casoCerrado ? 'Cerrado' : 'Activo';
    const current = String(registro['Estado del caso'] ?? '').trim();
    if (current === next) return;
    setRegistro((prev) => {
      if (!prev) return prev;
      const cur = String(prev['Estado del caso'] ?? '').trim();
      if (cur === next) return prev;
      return wrapRegistroForLookup({ ...unwrapRegistro(prev), 'Estado del caso': next });
    });
  }, [registro, casoCerrado]);

  useEffect(() => {
    if (!registro || !auroraActivo || !cierrePorDecisionFinalBloque5) return;
    const doc = getDocumentoActual(registro);
    if (!doc) return;
    const estadoActual = String(registro['Estado del caso'] ?? '').trim();
    if (estadoActual === 'Cerrado') return;

    const persistirCierreAutomatico = async () => {
      try {
        const nextRecord = { ...unwrapRegistro(registro), 'Estado del caso': 'Cerrado' };
        await updatePpl(doc, buildUpdatePayload(nextRecord));
        setRegistro(wrapRegistroForLookup(nextRecord));
        setToastMessage('Caso cerrado y avances guardados automáticamente');
        setToastOpen(true);
        setGuardadoOk(true);
        setHistorialRefreshToken((prev) => prev + 1);
      } catch (e) {
        reportError(e, 'formulario-entrevista:cierre-automatico');
        setError('Se intentó guardar el cierre automático, pero ocurrió un error.');
      }
    };

    persistirCierreAutomatico();
  }, [registro, auroraActivo, cierrePorDecisionFinalBloque5, getDocumentoActual, buildUpdatePayload]);

  useEffect(() => {
    if (!registro || !auroraActivo) return;
    const next = String(auroraRuleState?.derivedStatus || '').trim();
    if (!next) return;
    const current = String(registro['Estado del trÃƒÂ¡mite'] ?? '').trim();
    if (current === next) return;
    setRegistro((prev) => {
      if (!prev) return prev;
      const cur = String(prev['Estado del trÃƒÂ¡mite'] ?? '').trim();
      if (cur === next) return prev;
      return wrapRegistroForLookup({ ...unwrapRegistro(prev), 'Estado del trÃƒÂ¡mite': next });
    });
  }, [registro, auroraActivo, auroraRuleState]);

  useEffect(() => {
    if (!registro || !auroraActivo) return;
    if (!auroraRuleState?.locked) return;
    const reason = String(auroraRuleState.lockReason || 'El formulario est? bloqueado por reglas de negocio.');
    setError(reason);
  }, [registro, auroraActivo, auroraRuleState]);

  useEffect(() => {
    if (!registro || flow !== 'sindicado') return;
    if (!celesteRuleState?.locked) return;
    const reason = String(celesteRuleState.lockReason || 'Se cierra el caso');
    setError(reason);
  }, [registro, flow, celesteRuleState]);

  useEffect(() => {
    // REGLA: P35 solo se habilita si P34 = "SÃƒÂ­". Si no, queda deshabilitada y vacÃƒÂ­a.
    if (habilitarPregunta35) return;
    setRegistro((prev) => {
      if (!prev) return prev;
      const currentLegacy = String(prev[KEY_Q35_LEGACY] ?? '');
      const currentUtf8 = String(prev[KEY_Q35_UTF8] ?? '');
      if (currentLegacy === '' && currentUtf8 === '') return prev;
      return wrapRegistroForLookup({ ...unwrapRegistro(prev), [KEY_Q35_LEGACY]: '', [KEY_Q35_UTF8]: '' });
    });
  }, [habilitarPregunta35]);

  const habilitarNegativaUtilidadPublica = useMemo(() => {
    const sentido = String(registro?.['Sentido de la decisiÃƒÂ³n'] ?? '').trim();
    const sentidoResuelve = String(registro?.['Sentido de la decisiÃƒÂ³n que resuelve recurso'] ?? '').trim();
    return sentido === 'Niega utilidad pÃƒÂºblica' || sentidoResuelve === 'Niega utilidad pÃƒÂºblica';
  }, [registro]);

  const habilitarNegativaTramiteNormal = useMemo(() => {
    if (!auroraActivo) return false;
    if (actuacionIncluyeUtilidadPublica) return false;
    const sentido = String(registro?.['Sentido de la decisiÃƒÂ³n'] ?? '').trim();
    return isNoConcedeSubrogadoPenal(sentido);
  }, [auroraActivo, actuacionIncluyeUtilidadPublica, registro]);

  useEffect(() => {
    // Regla: AURORA.B5A.LIMPIEZA.1
    // Si no aplica negativa de utilidad publica, limpiar campos de motivo/recurso en 5A.
    if (!registro) return;
    if (habilitarNegativaUtilidadPublica) return;

    const keys = ['Motivo de la decisiÃƒÂ³n negativa', 'Se presenta recurso', 'Fecha de recurso en caso desfavorable'];
    setRegistro((prev) => {
      if (!prev) return prev;
      let changed = false;
      const next = { ...unwrapRegistro(prev) };
      for (const k of keys) {
        const cur = String(prev[k] ?? '');
        if (cur === '') continue;
        next[k] = '';
        changed = true;
      }
      return changed ? wrapRegistroForLookup(next) : prev;
    });
  }, [registro, habilitarNegativaUtilidadPublica]);

  useEffect(() => {
    // Regla: AURORA.B5B.DEPENDENCIA.4
    // Si en tramite normal Q47 != "No concede subrogado penal", limpiar motivo y campos de recurso.
    if (!registro || !auroraActivo || actuacionIncluyeUtilidadPublica) return;
    if (habilitarNegativaTramiteNormal) return;

    const keys = [
      'Motivo de la decisiÃƒÂ³n negativa',
      'Se presenta recurso',
      'Fecha de recurso en caso desfavorable',
      'Sentido de la decisiÃƒÂ³n que resuelve la solicitud',
    ];

    setRegistro((prev) => {
      if (!prev) return prev;
      let changed = false;
      const next = { ...unwrapRegistro(prev) };
      for (const k of keys) {
        const cur = String(prev[k] ?? '');
        if (cur === '') continue;
        next[k] = '';
        changed = true;
      }
      return changed ? wrapRegistroForLookup(next) : prev;
    });
  }, [registro, auroraActivo, actuacionIncluyeUtilidadPublica, habilitarNegativaTramiteNormal]);

  useEffect(() => {
    // Regla: AURORA.B5B.DEPENDENCIA.1
    // Si no hay recurso en 5B, limpiar fecha y sentido que resuelve la solicitud.
    if (!registro || !auroraActivo || actuacionIncluyeUtilidadPublica) return;
    if (!habilitarNegativaTramiteNormal) return;
    if (isEquivalenteSi(registro?.['Se presenta recurso'])) return;

    const keys = ['Fecha de recurso en caso desfavorable', 'Sentido de la decisiÃƒÂ³n que resuelve la solicitud'];
    setRegistro((prev) => {
      if (!prev) return prev;
      let changed = false;
      const next = { ...unwrapRegistro(prev) };
      for (const k of keys) {
        const cur = String(prev[k] ?? '');
        if (cur === '') continue;
        next[k] = '';
        changed = true;
      }
      return changed ? wrapRegistroForLookup(next) : prev;
    });
  }, [registro, auroraActivo, actuacionIncluyeUtilidadPublica, habilitarNegativaTramiteNormal]);

  const habilitarCelesteMotivoNegativa = useMemo(() => {
    const sentido = String(registro?.['SENTIDO DE LA DECISIÃƒâ€œN'] ?? '').trim();
    return norm(sentido) === norm('Niega la solicitud');
  }, [registro]);

  const habilitarCelesteRecurso = useMemo(() => {
    const v = String(registro?.['Ã‚Â¿SE RECURRIÃƒâ€œ EN CASO DE DECISIÃƒâ€œN NEGATIVA?'] ?? '').trim();
    return isEquivalenteSi(v);
  }, [registro]);

  useEffect(() => {
    // Regla: CELESTE.B5.DEPENDENCIA.3
    // Si C_Q26 != "Niega la solicitud", limpiar motivo de decision negativa.
    if (!registro || flow !== 'sindicado') return;
    if (habilitarCelesteMotivoNegativa) return;

    const key = 'MOTIVO DE LA DECISIÃƒâ€œN NEGATIVA';
    setRegistro((prev) => {
      if (!prev) return prev;
      const cur = String(prev[key] ?? '');
      if (cur === '') return prev;
      return wrapRegistroForLookup({ ...unwrapRegistro(prev), [key]: '' });
    });
  }, [registro, flow, habilitarCelesteMotivoNegativa]);

  useEffect(() => {
    // Regla: CELESTE.B5.LIMPIEZA.1
    // Si no se presenta recurso, limpiar fecha y sentido de recurso.
    if (!registro) return;
    if (habilitarCelesteRecurso) return;
    setRegistro((prev) => {
      if (!prev) return prev;
      const keys = ['Fecha de presentaciÃƒÂ³n del recurso', 'SENTIDO DE LA DECISIÃƒâ€œN QUE RESUELVE RECURSO'];
      let changed = false;
      const next = { ...unwrapRegistro(prev) };
      for (const k of keys) {
        const cur = String(prev[k] ?? '');
        if (cur === '') continue;
        next[k] = '';
        changed = true;
      }
      return changed ? wrapRegistroForLookup(next) : prev;
    });
  }, [registro, habilitarCelesteRecurso]);

  async function handleGuardar() {
    const doc = getDocumentoActual(registro);
    if (!doc) {
      setError('Debe cargar un usuario antes de guardar.');
      return;
    }

    try {
      setError('');
      setToastOpen(false);
      await updatePpl(doc, buildUpdatePayload(unwrapRegistro(registro)));
      setToastMessage('Aurora - Cambios guardados correctamente');
      setToastOpen(true);
      setGuardadoOk(true);
      setHistorialRefreshToken((prev) => prev + 1);
    } catch (e) {
      reportError(e, 'formulario-entrevista:guardar');
      setError('Error al guardar el registro.');
    }
  }

  const handleSaltoCelesteAAurora = useCallback(async (nextSituacionActualizada) => {
    const celesteEval = evaluateCelesteRules({
      answers: {
        ...(registro || {}),
        'SituaciÃƒÂ³n JurÃƒÂ­dica actualizada (de conformidad con la rama judicial)': nextSituacionActualizada,
      },
    });
    if (!celesteEval.jumpToAurora) return;

    const doc = getDocumentoActual(registro);
    if (!doc) {
      setError('Debe cargar un usuario antes de guardar.');
      return;
    }

    const yaRedirigido = String(registro?.redirectedToAurora ?? '').trim().toLowerCase() === 'true';
    if (yaRedirigido) {
      // Evita bucle de redirecciÃƒÂ³n: no vuelve a guardar/redirigir. Solo navega a AURORA (BLOQUE 2).
      setRegistro((prev) => ({
        ...(prev || {}),
        redirectedToAurora: true,
        'SituaciÃƒÂ³n JurÃƒÂ­dica': 'Condenado',
        'SituaciÃƒÂ³n JurÃƒÂ­dica actualizada (de conformidad con la rama judicial)': 'CONDENADO',
      }));
      setAuroraAbrirBloque2(celesteEval.jumpPayload?.startBlock === 2);
      return;
    }

    if (saltoCelesteGuardando) return;

    const next = {
      ...(registro || {}),
      'SituaciÃƒÂ³n JurÃƒÂ­dica actualizada (de conformidad con la rama judicial)': 'CONDENADO',
      redirectedToAurora: true,
    };

    setSaltoCelesteGuardando(true);
    setError('');
    setToastOpen(false);

    try {
      await updatePpl(doc, buildUpdatePayload(next));
      setToastMessage('Formulario guardado');
      setToastOpen(true);

      // Redirigir/navegar a AURORA del mismo usuario y abrir Bloque 2 como siguiente paso.
      const refreshed = await getPplByDocumento(doc);
      const r = refreshed?.registro || next;

      setRegistro({
        ...(r || next),
        // Fuerza el flujo AURORA por regla de salto (sin reiniciar caso).
        redirectedToAurora: true,
        'SituaciÃƒÂ³n JurÃƒÂ­dica': 'Condenado',
        'SituaciÃƒÂ³n JurÃƒÂ­dica actualizada (de conformidad con la rama judicial)': 'CONDENADO',
      });
      setAuroraAbrirBloque2(celesteEval.jumpPayload?.startBlock === 2);
    } catch (e) {
      reportError(e, 'formulario-entrevista:salto-celeste-aurora');
      setError('Error al guardar el formulario. No se redirigiÃƒÂ³ a AURORA.');
    } finally {
      setSaltoCelesteGuardando(false);
    }
  }, [buildUpdatePayload, getDocumentoActual, registro, saltoCelesteGuardando]);

  useEffect(() => {
    if (!auroraAbrirBloque2) return;
    if (flow !== 'condenado') return;
    const el = bloque2AuroraRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setAuroraAbrirBloque2(false);
  }, [auroraAbrirBloque2, flow]);

  useEffect(() => {
    if (!registro) return;
    if (flow !== 'sindicado') return;
    if (!celesteRuleState?.jumpToAurora) return;
    const value =
      registro?.['SituaciÃƒÂ³n JurÃƒÂ­dica actualizada (de conformidad con la rama judicial)'] ??
      '';
    handleSaltoCelesteAAurora(String(value));
  }, [registro, flow, celesteRuleState?.jumpToAurora, handleSaltoCelesteAAurora]);

  const porcentajeAvancePena = parsePercentageValue(registro?.['Porcentaje de avance de pena cumplida']);

  return (
    <>
      <div className="card">
        <h2>Buscar Usuario</h2>

        <Toast
          open={toastOpen}
          message={toastMessage}
          durationMs={3000}
          placement="center"
          emphasis
          onClose={() => setToastOpen(false)}
        />

        <div className="search-row search-row--form-main">
          <div className="form-field">
            <label>Numero de Identificacion</label>
            <input
              type="text"
              placeholder="Ingrese Documento"
              value={numeroBusqueda}
              onChange={(e) => setNumeroBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  buscarRegistro(numeroBusqueda);
                }
              }}
            />
          </div>
          <button
            className="primary-button primary-button--search"
            type="button"
            onClick={() => buscarRegistro(numeroBusqueda)}
          >
            CONSULTAR PPL
          </button>
        </div>

        {cargando && <p>{displayText('Cargando informaciÃ³n...')}</p>}
        {error && <p className="hint-text">{displayText(error)}</p>}
      </div>

      {!cargando && registro && (
        <>
          <div className="card" style={{ marginTop: '1rem' }}>
            <HistorialActuacionesPPL
              registro={registro}
              numeroDocumento={getDocumentoActual(registro)}
              onSelectActuacion={handleSeleccionarActuacion}
              onCrearNuevaActuacion={handleCrearNuevaActuacion}
              onIniciarActuacion={() => handleCrearNuevaActuacion({ abrirFormulario: true })}
              refreshToken={historialRefreshToken}
              actuacionActivaId={actuacionActivaId}
              creandoActuacion={creandoActuacion}
              onActionLabelChange={handleActionLabelChange}
            />
          </div>

          {!mostrarFormularioDetalle && (
            <p className="hint-text" style={{ marginTop: '0.75rem' }}>
              {displayText(`Vista previa activa. Seleccione "${textoAccionCaso}" para abrir el formulario precargado.`)}
            </p>
          )}

          {mostrarFormularioDetalle && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3 className="block-title">{displayText('BLOQUE 1. InformaciÃ³n de la persona privada de la libertad')}</h3>

          <div className="grid-2">
            <Campo label="1. Nombre" name="Nombre" value={registro['Nombre']} onChange={handleChange} />

            <Campo
              label="2. Tipo de indentificaciÃƒÂ³n"
              name="Tipo de indentificaciÃƒÂ³n"
              type="select"
              value={registro['Tipo de indentificaciÃƒÂ³n']}
              onChange={handleChange}
              options={OPCIONES_TIPO_IDENTIFICACION}
            />

            <Campo
              label="3. NÃƒÂºmero de identificaciÃƒÂ³n"
              name="NÃƒÂºmero de identificaciÃƒÂ³n"
              value={registro['NÃƒÂºmero de identificaciÃƒÂ³n']}
              onChange={handleChange}
              readOnly={Boolean(String(registro['NÃƒÂºmero de identificaciÃƒÂ³n'] ?? '').trim())}
            />

            <Campo
              label="4. SituaciÃƒÂ³n JurÃƒÂ­dica"
              name="SituaciÃƒÂ³n JurÃƒÂ­dica"
              type="select"
              value={registro['SituaciÃƒÂ³n JurÃƒÂ­dica']}
              onChange={handleChange}
              options={OPCIONES_SITUACION_JURIDICA}
              disabled
            />

            <Campo
              label="5. GÃƒÂ©nero"
              name="GÃƒÂ©nero"
              type="select"
              value={registro['GÃƒÂ©nero']}
              onChange={handleChange}
              options={OPCIONES_GENERO_AURORA}
            />

            <Campo
              label="6. Enfoque Ãƒâ€°tnico/Racial/Cultural"
              name="Enfoque Ãƒâ€°tnico/Racial/Cultural"
              type="select"
              value={registro['Enfoque Ãƒâ€°tnico/Racial/Cultural']}
              onChange={handleChange}
              options={OPCIONES_ENFOQUE_ETNICO}
            />

            <Campo
              label="7. Nacionalidad"
              name="Nacionalidad"
              value={registro['Nacionalidad']}
              onChange={handleChange}
            />

            <Campo
              label="8. Fecha de nacimiento"
              name="Fecha de nacimiento"
              type="date"
              value={registro['Fecha de nacimiento']}
              onChange={handleChange}
            />

            <Campo label="9. Edad" name="Edad" type="number" value={registro['Edad']} onChange={handleChange} />

            <Campo
              label="10. Lugar de privaciÃƒÂ³n de la libertad"
              name="Lugar de privaciÃƒÂ³n de la libertad"
              type="select"
              value={registro['Lugar de privaciÃƒÂ³n de la libertad']}
              onChange={handleChange}
              options={OPCIONES_LUGAR_PRIVACION}
            />

            <Campo
              label="11. Nombre del lugar de privaciÃƒÂ³n de la libertad"
              name="Nombre del lugar de privaciÃƒÂ³n de la libertad"
              value={registro['Nombre del lugar de privaciÃƒÂ³n de la libertad']}
              onChange={handleChange}
            />

            <Campo
              label="12. Departamento del lugar de privaciÃƒÂ³n de la libertad"
              name="Departamento del lugar de privaciÃƒÂ³n de la libertad"
              value={registro['Departamento del lugar de privaciÃƒÂ³n de la libertad']}
              onChange={handleChange}
            />

            <Campo
              label="13. Distrito/municipio del lugar de privaciÃƒÂ³n de la libertad"
              name="Distrito/municipio del lugar de privaciÃƒÂ³n de la libertad"
              value={registro['Distrito/municipio del lugar de privaciÃƒÂ³n de la libertad']}
              onChange={handleChange}
            />
          </div>

          {flow === 'condenado' && (
            <>
              <fieldset
                disabled={Boolean(auroraRuleState?.locked)}
                style={{ border: 'none', margin: 0, padding: 0, minInlineSize: 0 }}
              >
              {auroraVisibleBlocks.has('bloque2Aurora') && (
                <>
                <h3 className="block-title" ref={bloque2AuroraRef}>
                  {displayText('BLOQUE 2 (AURORA) - InformaciÃ³n del proceso SISIPEC')}
                </h3>
                <div className="grid-2">
                <Campo
                  label="14. Autoridad a cargo"
                  name="Autoridad a cargo"
                  value={registro['Autoridad a cargo']}
                  onChange={handleChange}
                />
                <Campo
                  label="15. NÃƒÂºmero de proceso"
                  name="NÃƒÂºmero de proceso"
                  value={registro['NÃƒÂºmero de proceso']}
                  onChange={handleChange}
                />
                <Campo
                  label="16. Delitos"
                  name="Delitos"
                  type="textarea"
                  value={registro['Delitos']}
                  onChange={handleChange}
                />
                <Campo
                  label="17. Fecha de captura"
                  name="Fecha de captura"
                  type="date"
                  value={registro['Fecha de captura']}
                  onChange={handleChange}
                />
                <Campo
                  label="18. Pena (aÃƒÂ±os, meses y dÃƒÂ­as)"
                  name="Pena (aÃƒÂ±os, meses y dÃƒÂ­as)"
                  value={registro['Pena (aÃƒÂ±os, meses y dÃƒÂ­as)']}
                  onChange={handleChange}
                />
                <Campo
                  label="19. Pena total en dÃƒÂ­as"
                  name="Pena total en dÃƒÂ­as"
                  type="number"
                  value={registro['Pena total en dÃƒÂ­as']}
                  onChange={handleChange}
                />
                <Campo
                  label="20. Tiempo que la persona lleva privada de la libertad (en dÃƒÂ­as)"
                  name="Tiempo que la persona lleva privada de la libertad (en dÃƒÂ­as)"
                  type="number"
                  value={registro['Tiempo que la persona lleva privada de la libertad (en dÃƒÂ­as)']}
                  onChange={handleChange}
                />
                <Campo
                  label="21. RedenciÃƒÂ³n total acumulada en dÃƒÂ­as"
                  name="RedenciÃƒÂ³n total acumulada en dÃƒÂ­as"
                  type="number"
                  value={registro['RedenciÃƒÂ³n total acumulada en dÃƒÂ­as']}
                  onChange={handleChange}
                />
                <Campo
                  label="22. Tiempo efectivo de pena cumplida en dÃƒÂ­as (teniendo en cuenta la redenciÃƒÂ³n)"
                  name="Tiempo efectivo de pena cumplida en dÃƒÂ­as (teniendo en cuenta la redenciÃƒÂ³n)"
                  type="number"
                  value={registro['Tiempo efectivo de pena cumplida en dÃƒÂ­as (teniendo en cuenta la redenciÃƒÂ³n)']}
                  onChange={handleChange}
                />
                <div className="form-field">
                  <label>{displayText('23. Porcentaje de avance de pena cumplida')}</label>
                  <input
                    type="text"
                    name="Porcentaje de avance de pena cumplida"
                    value={registro['Porcentaje de avance de pena cumplida'] ?? ''}
                    onChange={(e) => handleChange('Porcentaje de avance de pena cumplida', e.target.value)}
                  />
                  {porcentajeAvancePena != null && (
                    <div className="progress-wrap progress-wrap--q23" aria-label="Barra de avance de pena cumplida">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${porcentajeAvancePena}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <Campo
                  label="24. Fase de tramiento"
                  name="Fase de tramiento"
                  type="select"
                  value={registro['Fase de tramiento']}
                  onChange={handleChange}
                  options={OPCIONES_FASE_TRATAMIENTO}
                />
                <Campo
                  label="25. Ã‚Â¿Cuenta con requerimientos judiciales por otros procesos?"
                  name="Ã‚Â¿ Cuenta con requerimientos judiciales por otros procesos ?"
                  type="select"
                  value={registro['Ã‚Â¿ Cuenta con requerimientos judiciales por otros procesos ?']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                />
                <Campo
                  label="26. Fecha ?ltima calificaciÃƒÂ³n"
                  name="Fecha ?ltima calificaciÃƒÂ³n"
                  type="date"
                  value={registro['Fecha ?ltima calificaciÃƒÂ³n']}
                  onChange={handleChange}
                />
                <Campo
                  label="27. CalificaciÃƒÂ³n de conducta"
                  name="CalificaciÃƒÂ³n de conducta"
                  type="select"
                  value={registro['CalificaciÃƒÂ³n de conducta']}
                  onChange={handleChange}
                  options={OPCIONES_CALIFICACION_CONDUCTA}
                />
              </div>
                </>
              )}

              {auroraVisibleBlocks.has('bloque3') && (
                <>
                <h3 className="block-title">{displayText('BLOQUE 3 - AnÃ¡lisis jurÃ­dico')}</h3>
                <div className="grid-2">
                <Campo
                  label="28. Defensor(a) pÃƒÂºblico(a) asignado para tramitar la solicitud"
                  name="Defensor(a) PÃƒÂºblico(a) Asignado para tramitar la solicitud"
                  value={registro['Defensor(a) PÃƒÂºblico(a) Asignado para tramitar la solicitud']}
                  onChange={handleChange}
                  showObligatoria
                />

                <Campo
                  label="29. Fecha de anÃƒÂ¡lisis jurÃƒÂ­dico del caso"
                  name="Fecha de anÃƒÂ¡lisis jurÃƒÂ­dico del caso"
                  type="date"
                  value={registro['Fecha de anÃƒÂ¡lisis jurÃƒÂ­dico del caso']}
                  onChange={handleChange}
                  showObligatoria
                />

                <Campo
                  label="30. Procedencia de libertad condicional"
                  name="Procedencia de libertad condicional"
                  type="select"
                  value={registro['Procedencia de libertad condicional']}
                  onChange={handleChange}
                  options={OPCIONES_PROCEDENCIA_LIBERTAD_CONDICIONAL}
                  showObligatoria
                />

                <Campo
                  label="31. Procedencia de prisiÃƒÂ³n domiciliaria de mitad de pena"
                  name="Procedencia de prisiÃƒÂ³n domiciliaria de mitad de pena"
                  type="select"
                  value={registro['Procedencia de prisiÃƒÂ³n domiciliaria de mitad de pena']}
                  onChange={handleChange}
                  options={OPCIONES_PROCEDENCIA_PRISION_DOMICILIARIA}
                  showObligatoria
                />

                <Campo
                  label="32. Procedencia de utilidad pÃƒÂºblica (solo para mujeres)"
                  name="Procedencia de utilidad pÃƒÂºblica (solo para mujeres)"
                  type="select"
                  value={registro['Procedencia de utilidad pÃƒÂºblica (solo para mujeres)']}
                  onChange={handleChange}
                  options={OPCIONES_PROCEDENCIA_UTILIDAD_PUBLICA}
                  showObligatoria
                />

                <Campo
                  label="33. Procedencia de pena cumplida"
                  name="Procedencia de pena cumplida"
                  type="select"
                  value={registro['Procedencia de pena cumplida']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                  showObligatoria
                />

                <Campo
                  label="34. Procedencia de acumulaciÃƒÂ³n de penas"
                  name="Procedencia de acumulaciÃƒÂ³n de penas"
                  type="select"
                  value={registro['Procedencia de acumulaciÃƒÂ³n de penas']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                  showObligatoria
                />

                <Campo
                  label="35. Con quÃƒÂ© proceso(s) debe acumular penas (si aplica)"
                  name={KEY_Q35_LEGACY}
                  value={registro[KEY_Q35_LEGACY] ?? registro[KEY_Q35_UTF8] ?? ''}
                  onChange={handleChange}
                  required={false}
                  disabled={!habilitarPregunta35}
                  showObligatoria
                />

                <Campo
                  label="36. Otras solicitudes a tramitar"
                  name="Otras solicitudes a tramitar"
                  type="select"
                  value={registro['Otras solicitudes a tramitar']}
                  onChange={handleChange}
                  options={OPCIONES_OTRAS_SOLICITUDES}
                />

                <Campo
                  label="37. Resumen del anÃƒÂ¡lisis del caso"
                  name="Resumen del anÃƒÂ¡lisis del caso"
                  type="textarea"
                  value={registro['Resumen del anÃƒÂ¡lisis del caso']}
                  onChange={handleChange}
                  showObligatoria
                />

                {motivoCierre && (
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <p className="hint-text">{displayText(motivoCierre)}</p>
                  </div>
                )}
                {mensajeBloqueoAvanceBloque3 && (
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <p className="hint-text">{displayText(mensajeBloqueoAvanceBloque3)}</p>
                  </div>
                )}
              </div>
                </>
              )}

              {auroraVisibleBlocks.has('bloque4') && (
                <>
                <h3 className="block-title">{displayText('BLOQUE 4 - Entrevista con el usuario')}</h3>
                <div className="grid-2">
                <Campo
                  label="38. Fecha de la entrevista"
                  name="Fecha de entrevista"
                  type="date"
                  value={registro['Fecha de entrevista']}
                  onChange={handleChange}
                  disabled={cierreRegla1Bloque3}
                  showObligatoria
                />

                <Campo
                  label="39. DecisiÃƒÂ³n del usuario"
                  name="DecisiÃƒÂ³n del usuario"
                  type="select"
                  value={registro['DecisiÃƒÂ³n del usuario']}
                  onChange={handleChange}
                  options={OPCIONES_AURORA_DECISION_USUARIO}
                  disabled={cierreRegla1Bloque3}
                  showObligatoria
                />

                <div className="question-40-highlight">
                <Campo
                  label="40. ActuaciÃƒÂ³n a adelantar"
                  name="ActuaciÃƒÂ³n a adelantar"
                  type="select"
                  value={registro['ActuaciÃƒÂ³n a adelantar']}
                  onChange={handleChange}
                  options={OPCIONES_AURORA_ACTUACION_A_ADELANTAR}
                  disabled={cierreRegla1Bloque3 || decisionUsuarioBloquea}
                  showObligatoria
                />
                {cierreRegla1Bloque3 && (
                  <p className="hint-text">
                    La pregunta 40 esta bloqueada porque el caso se cerro en Bloque 3 (preguntas 30 a 33 sin procedencia).
                  </p>
                )}
                </div>

                <Campo
                  label="41. Requiere pruebas"
                  name="Requiere pruebas"
                  type="select"
                  value={registro['Requiere pruebas']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                  disabled={cierreRegla1Bloque3 || decisionUsuarioBloquea || actuacionBloqueaPorNinguna}
                  showObligatoria
                />

                <Campo
                  label="42. Poder en caso de avanzar con la solicitud"
                  name="Poder en caso de avanzar con la solicitud"
                  type="select"
                  value={registro['Poder en caso de avanzar con la solicitud']}
                  onChange={handleChange}
                  options={OPCIONES_PODER}
                  disabled={cierreRegla1Bloque3 || decisionUsuarioBloquea || actuacionBloqueaPorNinguna}
                  showObligatoria
                />

                {decisionUsuarioBloquea && (
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <p className="hint-text">
                      {displayText('El resto del formulario estÃ¡ bloqueado por la selecciÃ³n en "DecisiÃ³n del usuario".')}
                    </p>
                  </div>
                )}
              </div>
                </>
              )}

              {auroraRuleState?.locked && (
                <div className="form-field" style={{ marginTop: '0.35rem' }}>
                  <p className="hint-text">{displayText(auroraRuleState.lockReason || 'Formulario bloqueado por reglas de negocio.')}</p>
                </div>
              )}

              {(
                auroraVisibleBlocks.has('bloque5UtilidadPublica') ||
                auroraVisibleBlocks.has('bloque5TramiteNormal') ||
                (auroraVisibleBlocks.has('bloque4') && isFilled(actuacionAdelantar))
              ) ? (() => {
                const show5A = auroraVisibleBlocks.has('bloque4') && actuacionIncluyeUtilidadPublica;
                const show5B = auroraVisibleBlocks.has('bloque4') && !show5A && isFilled(actuacionAdelantar);

                const bloquearBloque5 = cierreRegla1Bloque3 || decisionUsuarioBloquea || actuacionBloqueaPorNinguna;

                const requiereMisionTrabajo = String(registro?.['Se requiere misiÃƒÂ³n de trabajo'] ?? '').trim();
                const deshabilitarMision = requiereMisionTrabajo === 'No';

                return (
                  <>
                    {show5A && (
                      <>
                        <h3 className="block-title">{displayText('BLOQUE 5. Utilidad pÃºblica')}</h3>
                        <div className="grid-2">
                          <Campo
                            label="43. Fecha de entrevista psicosocial"
                            name="Fecha de entrevista psicosocial"
                            type="date"
                            value={registro['Fecha de entrevista psicosocial']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="44. Cumple el requisito de marginalidad"
                            name="Cumple el requisito de marginalidad"
                            type="select"
                            value={registro['Cumple el requisito de marginalidad']}
                            onChange={handleChange}
                            options={OPCIONES_SI_NO}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="45. Cumple el requisito de jefatura de hogar"
                            name="Cumple el requisito de jefatura de hogar"
                            type="select"
                            value={registro['Cumple el requisito de jefatura de hogar']}
                            onChange={handleChange}
                            options={OPCIONES_SI_NO}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="46. Se requiere misiÃƒÂ³n de trabajo"
                            name="Se requiere misiÃƒÂ³n de trabajo"
                            type="select"
                            value={registro['Se requiere misiÃƒÂ³n de trabajo']}
                            onChange={handleChange}
                            options={OPCIONES_SI_NO}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="47. Fecha de solicitud de misiÃƒÂ³n de trabajo"
                            name="Fecha de solicitud de misiÃƒÂ³n de trabajo"
                            type="date"
                            value={registro['Fecha de solicitud de misiÃƒÂ³n de trabajo']}
                            onChange={handleChange}
                            required={false}
                            disabled={isAuroraFieldDisabled('Fecha de solicitud de misiÃƒÂ³n de trabajo', bloquearBloque5 || deshabilitarMision)}
                          />
                          <Campo
                            label="48. Fecha de asignaciÃƒÂ³n de investigador"
                            name="Fecha de asignaciÃƒÂ³n de investigador"
                            type="date"
                            value={registro['Fecha de asignaciÃƒÂ³n de investigador']}
                            onChange={handleChange}
                            required={false}
                            disabled={isAuroraFieldDisabled('Fecha de asignaciÃƒÂ³n de investigador', bloquearBloque5 || deshabilitarMision)}
                          />
                          <Campo
                            label="49. Fecha en la que se reciben todas las pruebas"
                            name="Fecha en la que se reciben todas las pruebas"
                            type="date"
                            value={registro['Fecha en la que se reciben todas las pruebas']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="50. Fecha de radicaciÃƒÂ³n de solicitud de utilidad pÃƒÂºblica"
                            name="Fecha de radicaciÃƒÂ³n de solicitud de utilidad pÃƒÂºblica"
                            type="date"
                            value={registro['Fecha de radicaciÃƒÂ³n de solicitud de utilidad pÃƒÂºblica']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="51. Fecha de decisiÃƒÂ³n de la autoridad"
                            name="Fecha de decisiÃƒÂ³n de la autoridad"
                            type="date"
                            value={registro['Fecha de decisiÃƒÂ³n de la autoridad']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="52. Sentido de la decisiÃƒÂ³n"
                            name="Sentido de la decisiÃƒÂ³n"
                            type="select"
                            value={registro['Sentido de la decisiÃƒÂ³n']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5A_SENTIDO_DECISION}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="53. Motivo de la decisiÃƒÂ³n negativa"
                            name="Motivo de la decisiÃƒÂ³n negativa"
                            type="select"
                            value={registro['Motivo de la decisiÃƒÂ³n negativa']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5A_MOTIVO_DECISION_NEGATIVA}
                            required={false}
                            disabled={bloquearBloque5 || !habilitarNegativaUtilidadPublica}
                          />
                          <Campo
                            label="54. Se presenta recurso"
                            name="Se presenta recurso"
                            type="select"
                            value={registro['Se presenta recurso']}
                            onChange={handleChange}
                            options={OPCIONES_SI_NO}
                            required={false}
                            disabled={bloquearBloque5 || !habilitarNegativaUtilidadPublica}
                          />
                          <Campo
                            label="55. Fecha de recurso en caso desfavorable"
                            name="Fecha de recurso en caso desfavorable"
                            type="date"
                            value={registro['Fecha de recurso en caso desfavorable']}
                            onChange={handleChange}
                            required={false}
                            disabled={
                              bloquearBloque5 ||
                              !habilitarNegativaUtilidadPublica ||
                              !isEquivalenteSi(registro?.['Se presenta recurso'])
                            }
                          />
                          <Campo
                            label="56. Sentido de la decisiÃƒÂ³n que resuelve recurso"
                            name="Sentido de la decisiÃƒÂ³n que resuelve recurso"
                            type="select"
                            value={registro['Sentido de la decisiÃƒÂ³n que resuelve recurso']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5A_SENTIDO_DECISION_RESUELVE_RECURSO}
                            required={false}
                            disabled={bloquearBloque5 || !isEquivalenteSi(registro?.['Se presenta recurso'])}
                          />
                          <Campo
                            label="57. Cierre del caso por imposibilidad de avanzar (si aplica)"
                            name="Cierre del caso por imposibilidad de avanzar (si aplica) - Utilidad pÃºblica"
                            type="select"
                            value={registro['Cierre del caso por imposibilidad de avanzar (si aplica) - Utilidad pÃºblica']}
                            onChange={handleChange}
                            options={OPCIONES_CIERRE_CASO_IMPOSIBILIDAD_AVANZAR}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                        </div>
                      </>
                    )}

                    {show5B && (
                      <>
                        <h3 className="block-title">{displayText('BLOQUE 5. TrÃ¡mite de la solicitud')}</h3>
                        <div className="grid-2">
                          <Campo
                            label="43. Fecha de recepciÃƒÂ³n de pruebas aportadas por el usuario (si aplica)"
                            name="Fecha de recepciÃƒÂ³n de pruebas aportadas por el usuario (si aplica)"
                            type="date"
                            value={registro['Fecha de recepciÃƒÂ³n de pruebas aportadas por el usuario (si aplica)']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="44. Fecha de solicitud de documentos al Inpec (si aplica)"
                            name="Fecha de solicitud de documentos al Inpec (si aplica)"
                            type="date"
                            value={registro['Fecha de solicitud de documentos al Inpec (si aplica)']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="45. Fecha de presentaciÃƒÂ³n de la solicitud a la autoridad"
                            name="Fecha de presentaciÃƒÂ³n de la solicitud a la autoridad"
                            type="date"
                            value={registro['Fecha de presentaciÃƒÂ³n de la solicitud a la autoridad']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="46. Fecha de decisiÃƒÂ³n de la autoridad"
                            name="Fecha de decisiÃƒÂ³n de la autoridad"
                            type="date"
                            value={registro['Fecha de decisiÃƒÂ³n de la autoridad']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="47. Sentido de la decisiÃƒÂ³n"
                            name="Sentido de la decisiÃƒÂ³n"
                            type="select"
                            value={registro['Sentido de la decisiÃƒÂ³n']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5B_SENTIDO_DECISION}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="48. Motivo de la decisiÃƒÂ³n negativa"
                            name="Motivo de la decisiÃƒÂ³n negativa"
                            type="select"
                            value={registro['Motivo de la decisiÃƒÂ³n negativa']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5B_MOTIVO_DECISION_NEGATIVA}
                            required={false}
                            disabled={bloquearBloque5 || !habilitarNegativaTramiteNormal}
                          />
                          <Campo
                            label="49. Se presenta recurso"
                            name="Se presenta recurso"
                            type="select"
                            value={registro['Se presenta recurso']}
                            onChange={handleChange}
                            options={OPCIONES_SI_NO}
                            required={false}
                            disabled={bloquearBloque5 || !habilitarNegativaTramiteNormal}
                          />
                          <Campo
                            label="50. Fecha de recurso en caso desfavorable"
                            name="Fecha de recurso en caso desfavorable"
                            type="date"
                            value={registro['Fecha de recurso en caso desfavorable']}
                            onChange={handleChange}
                            required={false}
                            disabled={
                              bloquearBloque5 ||
                              !habilitarNegativaTramiteNormal ||
                              !isEquivalenteSi(registro?.['Se presenta recurso'])
                            }
                          />
                          <Campo
                            label="51. Sentido de la decisiÃƒÂ³n que resuelve recurso"
                            name="Sentido de la decisiÃƒÂ³n que resuelve la solicitud"
                            type="select"
                            value={registro['Sentido de la decisiÃƒÂ³n que resuelve la solicitud']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5B_SENTIDO_DECISION_RESUELVE_SOLICITUD}
                            required={false}
                            disabled={
                              bloquearBloque5 ||
                              !habilitarNegativaTramiteNormal ||
                              !isEquivalenteSi(registro?.['Se presenta recurso'])
                            }
                          />
                          <Campo
                            label="52. Cierre del caso por imposibilidad de avanzar (si aplica)"
                            name="Cierre del caso por imposibilidad de avanzar (si aplica)"
                            type="select"
                            value={registro['Cierre del caso por imposibilidad de avanzar (si aplica)']}
                            onChange={handleChange}
                            options={OPCIONES_CIERRE_CASO_IMPOSIBILIDAD_AVANZAR}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                        </div>
                      </>
                    )}
                  </>
                );
              })() : null}
              </fieldset>
            </>
          )}

          {flow === 'sindicado' && (
            <>
              {celesteVisibleBlocks.has('bloque2Celeste') && (
                <>
                  <h3 className="block-title">{displayText('BLOQUE 2 (CELESTE) - InformaciÃ³n del proceso SISIPEC')}</h3>
                  <div className="grid-2">
                    <Campo
                      label="14. Autoridad a cargo"
                      name="Autoridad a cargo"
                      value={registro['Autoridad a cargo']}
                      onChange={handleChange}
                      required
                    />
                    <Campo
                      label="15. NÃƒÂºmero de proceso"
                      name="NÃƒÂºmero de proceso"
                      value={registro['NÃƒÂºmero de proceso']}
                      onChange={handleChange}
                      required
                    />
                    <Campo
                      label="16. Delitos"
                      name="Delitos"
                      type="textarea"
                      value={registro['Delitos']}
                      onChange={handleChange}
                      required
                    />
                    <Campo
                      label="17. Fecha de captura"
                      name="Fecha de captura"
                      type="date"
                      value={registro['Fecha de captura']}
                      onChange={handleChange}
                      required
                    />
                    <Campo
                      label="18. Tiempo que la persona lleva privada de la libertad (en meses)"
                      name="TIEMPO QUE LA PERSONA LLEVA PRIVADA DE LA LIBERTAD (EN MESES)"
                      type="number"
                      value={tiempoPrivacionMeses}
                      onChange={handleChange}
                      readOnly
                      required
                    />
                  </div>
                </>
              )}

              {celesteVisibleBlocks.has('bloque3Celeste') && (
                <>
                  <h3 className="block-title">{displayText('BLOQUE 3 (CELESTE) - AnÃ¡lisis jurÃ­dico')}</h3>
                  <div className="grid-2">
                    <Campo
                      label="19. Defensor(a) p\u00fablico(a) asignado para tramitar la solicitud"
                      name="Defensor(a) PÃƒÂºblico(a) Asignado para tramitar la solicitud"
                      value={registro['Defensor(a) PÃƒÂºblico(a) Asignado para tramitar la solicitud']}
                      onChange={handleChange}
                      required
                      showObligatoria
                    />
                    <Campo
                      label="20. Fecha de an\u00e1lisis jur\u00eddico del caso"
                      name="Fecha de anÃƒÂ¡lisis jurÃƒÂ­dico del caso"
                      type="date"
                      value={registro['Fecha de anÃƒÂ¡lisis jurÃƒÂ­dico del caso']}
                      onChange={handleChange}
                      required
                      showObligatoria
                    />
                    <div className="question-40-highlight">
                      <Campo
                        label="21. An\u00e1lisis jur\u00eddico y actuaci\u00f3n a desplegar"
                        name="PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÃƒâ€°RMINOS"
                        type="select"
                        value={registro['PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÃƒâ€°RMINOS']}
                        onChange={handleChange}
                        options={OPCIONES_CELESTE_ANALISIS_ACTUACION}
                        required
                        showObligatoria
                      />
                    </div>
                    <Campo
                      label="22. Resumen del an\u00e1lisis jur\u00eddico del caso"
                      name="RESUMEN DEL ANÃƒÂLISIS JURÃƒÂDICO DEL PRESENTE CASO"
                      type="textarea"
                      value={registro['RESUMEN DEL ANÃƒÂLISIS JURÃƒÂDICO DEL PRESENTE CASO']}
                      onChange={handleChange}
                      required={false}
                      showObligatoria
                    />
                  </div>
                </>
              )}

              {celesteVisibleBlocks.has('bloque4Celeste') && (
                <>
                  <h3 className="block-title">{displayText('BLOQUE 4 (CELESTE) - Entrevista con el usuario')}</h3>
                  <div className="grid-2">
                    <Campo
                      label="23. Fecha de la entrevista para informar al usuario"
                      name="Fecha de entrevista"
                      type="date"
                      value={registro['Fecha de entrevista']}
                      onChange={handleChange}
                      required
                      showObligatoria
                    />
                  </div>
                </>
              )}

              {celesteVisibleBlocks.has('bloque5Celeste') && (
                <>
                  <h3 className="block-title">{displayText('BLOQUE 5 (CELESTE) - TrÃ¡mite de la solicitud')}</h3>
                  <div className="grid-2">
                    <Campo
                      label="24. Fecha de presentaciÃƒÂ³n de la solicitud de audiencia"
                      name="FECHA DE SOLICITUD DE AUDIENCIA DE CONTROL DE GARANTÃƒÂAS PARA SUSTENTAR REVOCATORIA"
                      type="date"
                      value={registro['FECHA DE SOLICITUD DE AUDIENCIA DE CONTROL DE GARANTÃƒÂAS PARA SUSTENTAR REVOCATORIA']}
                      onChange={handleChange}
                      required={false}
                    />
                    <Campo
                      label="25. Fecha de realizaciÃƒÂ³n de la audiencia"
                      name="FECHA DE REALIZACIÃƒâ€œN DE AUDIENCIA"
                      type="date"
                      value={registro['FECHA DE REALIZACIÃƒâ€œN DE AUDIENCIA']}
                      onChange={handleChange}
                      required={false}
                    />
                    <Campo
                      label="26. Sentido de la decisiÃƒÂ³n"
                      name="SENTIDO DE LA DECISIÃƒâ€œN"
                      type="select"
                      value={registro['SENTIDO DE LA DECISIÃƒâ€œN']}
                      onChange={handleChange}
                      options={OPCIONES_SENTIDO_DECISION_CELESTE}
                      required={false}
                    />
                    <Campo
                      label="27. Motivo de la decisiÃƒÂ³n negativa"
                      name="MOTIVO DE LA DECISIÃƒâ€œN NEGATIVA"
                      type="select"
                      value={registro['MOTIVO DE LA DECISIÃƒâ€œN NEGATIVA']}
                      onChange={handleChange}
                      options={OPCIONES_MOTIVO_DECISION_NEGATIVA_CELESTE}
                      required={false}
                      disabled={!habilitarCelesteMotivoNegativa}
                    />
                    <Campo
                      label="28. Se presenta recurso"
                      name="Ã‚Â¿SE RECURRIÃƒâ€œ EN CASO DE DECISIÃƒâ€œN NEGATIVA?"
                      type="select"
                      value={registro['Ã‚Â¿SE RECURRIÃƒâ€œ EN CASO DE DECISIÃƒâ€œN NEGATIVA?']}
                      onChange={handleChange}
                      options={OPCIONES_SI_NO}
                      required={false}
                    />
                    <Campo
                      label="29. Fecha de recurso en caso desfavorable"
                      name="Fecha de presentaciÃƒÂ³n del recurso"
                      type="date"
                      value={registro['Fecha de presentaciÃƒÂ³n del recurso']}
                      onChange={handleChange}
                      required={false}
                      disabled={!habilitarCelesteRecurso}
                    />
                    <Campo
                      label="30. Sentido de la decisiÃƒÂ³n que resuelve recurso"
                      name="SENTIDO DE LA DECISIÃƒâ€œN QUE RESUELVE RECURSO"
                      type="select"
                      value={registro['SENTIDO DE LA DECISIÃƒâ€œN QUE RESUELVE RECURSO']}
                      onChange={handleChange}
                      options={OPCIONES_SENTIDO_DECISION_RECURSO_CELESTE}
                      required={false}
                      disabled={!habilitarCelesteRecurso}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="actions-center"> 
            <button className="save-button" type="button" onClick={handleGuardar}>
              GUARDAR ENTREVISTA
            </button>

            {guardadoOk && (
              <button className="save-button secondary" type="button" onClick={handleConsultarOtro}>
                CONSULTAR OTRO PPL
              </button>
            )}
          </div>
        </div>
          )}
        </>
      )}
    </>
  );
}

















