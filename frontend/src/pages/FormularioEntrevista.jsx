import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPplByDocumento, updatePpl } from '../services/api.js';
import Toast from '../components/Toast.jsx';
import HistorialActuacionesPPL from '../components/HistorialActuacionesPPL.jsx';
import { evaluateAuroraRules } from '../utils/evaluateAuroraRules.ts';
import { evaluateCelesteRules } from '../utils/evaluateCelesteRules.ts';
import { AURORA_FIELD_IDS } from '../config/auroraFieldIds.ts';
import { reportError } from '../utils/reportError.js';

const OPCIONES_TIPO_IDENTIFICACION = ['CC', 'CE', 'PASAPORTE', 'OTRA'];
const OPCIONES_SI_NO = ['SÃ­', 'No'];
const OPCIONES_PODER = ['SÃ­ se requiere', 'Ya se cuenta con poder'];
const KEY_Q35_LEGACY = 'Con qu? proceso(s) debe acumular penas (si aplica)';
const KEY_Q35_UTF8 = 'Con quÃ© proceso(s) debe acumular penas (si aplica)';

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
  'IndÃ­gena',
];
const OPCIONES_LUGAR_PRIVACION = ['CDT', 'ERON'];
const OPCIONES_FASE_TRATAMIENTO = [
  'ObservaciÃ³n',
  'Alta',
  'Mediana',
  'MÃ­nima',
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
  'SÃ­ procede solicitud de libertad condicional',
  'No aplica porque ya hay solicitud de libertad o subrogado penal en trÃ¡mite',
  'No aplica porque ya est? en libertad por pena cumplida',
  'No aplica porque ya se concediÃ³ libertad condicional',
  'No aplica porque ya se concediÃ³ prisiÃ³n domiciliaria',
  'No aplica porque ya se concediÃ³ utilidad pÃºblica',
  'No aplica porque el proceso no ha sido asignado a JEPMS',
  'No aplica porque el proceso est? en otro circuito judicial (falta trasladar el proceso al actual)',
  'No aplica porque la condena est? por delito excluido del subrogado',
  'No aplica porque recientemente se le revocÃ³ subrogado penal',
  'No aplica porque recientemente se le negÃ³ subrogado penal',
  'No aplica porque la evaluaciÃ³n de conducta es negativa',
  'No aplica porque se determinÃ³ que no ha cumplido requisito temporal para acceder',
  'No aplica porque tiene acumulaciÃ³n de penas',
  'No aplica porque la persona fue trasladada a otro ERON',
  'No aplica porque la persona est? sindicada',
  'No aplica porque la cartilla biogrÃ¡fica no est? actualizada',
  'RevisiÃ³n suspendida porque se requiere primero trÃ¡mite de acumulaciÃ³n de penas',
  'No aplica porque el usuario no puede demostrar arraigo',
];

const OPCIONES_PROCEDENCIA_PRISION_DOMICILIARIA = [
  'SÃ­ procede solicitud de prisiÃ³n domiciliaria de mitad de pena',
  'No aplica porque ya hay solicitud de libertad o subrogado penal en trÃ¡mite',
  'No aplica porque ya est? en libertad por pena cumplida',
  'No aplica porque ya se concediÃ³ libertad condicional',
  'No aplica porque ya se concediÃ³ prisiÃ³n domiciliaria',
  'No aplica porque ya se concediÃ³ utilidad pÃºblica',
  'No aplica porque el proceso no ha sido asignado a jepms',
  'No aplica porque el proceso est? en otro circuito judicial (falta trasladar el proceso al actual)',
  'No aplica porque la condena est? por delito excluido del subrogado',
  'No aplica porque recientemente se le revocÃ³ un subrogado penal',
  'No aplica porque recientemente se le negÃ³ subrogado penal',
  'No aplica porque la evaluaciÃ³n de conducta es negativa',
  'No aplica porque se determinÃ³ que no ha cumplido requisito temporal para acceder',
  'No aplica porque tiene acumulaciÃ³n de penas',
  'No aplica porque la persona fue trasladada a otro ERON',
  'No aplica porque la persona est? sindicada',
  'No aplica porque la cartilla biogrÃ¡fica no est? actualizada',
  'RevisiÃ³n suspendida porque se requiere primero trÃ¡mite de acumulaciÃ³n de penas',
  'No aplica porque el usuario no puede demostrar arraigo',
];

const OPCIONES_PROCEDENCIA_UTILIDAD_PUBLICA = [
  'SÃ­ cumple requisitos objetivos',
  'No cumple por tipo de delito',
  'No cumple monto de pena',
  'No cumple por reincidencia',
  'No cumple por delito excluido',
];

const OPCIONES_OTRAS_SOLICITUDES = [
  'Ninguna',
  'Solicitud de actualizaciÃ³n de conducta',
  'Solicitud de asignaciÃ³n de JEPMS',
  'Solicitud de traslado del proceso al distrito judicial correspondiente',
  'Solicitud de actualizaciÃ³n de cartilla biogrÃ¡fica',
  'Solicitud de redenciÃ³n de pena 2x3 trabajo',
  'Solicitud de redenciÃ³n de pena 2x3 analÃ³gica en actividades distintas a trabajo',
  'Permiso de 72 horas',
  'Otra',
];

const OPCIONES_AURORA_DECISION_USUARIO = [
  'SÃ­, desea que el defensor(a) pÃºblico(a) avance con la solicitud',
  'SÃ­ desea que el defensor presente solicitud, pero suscrita por la persona privada de la Libertad.',
  'No, porque desea tramitar la solicitud a travÃ©s de su defensor de confianza',
  'No desea tramitar la solicitud',
  'No avanzar? porque no puede demostar arraigo fuera de prisiÃ³n',
  'El usuario es renuente a la atenciÃ³n',
];

const OPCIONES_AURORA_ACTUACION_A_ADELANTAR = [
  'Libertad condicional',
  'PrisiÃ³n domiciliaria',
  'Utilidad pÃºblica (solo para mujeres)',
  'Utilidad pÃºblica y prisiÃ³n domiciliaria',
  'Utilidad pÃºblica y libertad condicional',
  'RedenciÃ³n de pena y libertad condicional',
  'RedenciÃ³n de pena y prisiÃ³n domiciliaria',
  'Libertad condicional y en subsidio prisiÃ³n domiciliaria',
  'AcumulaciÃ³n de penas',
  'Libertad por pena cumplida',
  'RedenciÃ³n de pena y libertad por pena cumplida',
  'RedenciÃ³n de pena',
  'Permiso de 72 horas',
  'Solicitud de actualizaciÃ³n de conducta',
  'Solicitud de asginaciÃ³n de JEPMS',
  'Solicitud de traslado del proceso al distrito judicial correspondiente',
  'Solicitud de actualizaciÃ³n de cartilla biogrÃ¡fica',
  'Otra',
  'Ninguna porque la persona est? sindicada',
  'Ninguna porque est? en trÃ¡mite una solicitud de subrogado penal o pena cumplida',
  'Ninguna porque no procede subrogado penal en este momento por falta de cumplimiento de requisitos',
  'Ninguna porque no procede subrogado penal por exclusiÃ³n de delito',
  'Ninguna porque ya no est? en prisiÃ³n',
];

const ACTUACIONES_UTILIDAD_PUBLICA = new Set([
  'Utilidad pÃºblica (solo para mujeres)',
  'Utilidad pÃºblica y prisiÃ³n domiciliaria',
  'Utilidad pÃºblica y libertad condicional',
]);

const OPCIONES_BLOQUE_5A_SENTIDO_DECISION = ['Otorga utilidad pÃºblica', 'Niega utilidad pÃºblica'];
const OPCIONES_BLOQUE_5A_MOTIVO_DECISION_NEGATIVA = [
  'No concede por requisito objetivo',
  'No concende por requisito subjetivo',
  'No concede por requisitos objetivos y subjetivos',
  'Niega por falta de pruebas',
  'Concede otro beneficio',
  'Pena cumplida',
];
const OPCIONES_BLOQUE_5A_SENTIDO_DECISION_RESUELVE_RECURSO = [
  'Otorga utilidad pÃºblica',
  'Niega utilidad pÃºblica',
];

const OPCIONES_BLOQUE_5B_SENTIDO_DECISION = ['Concede subrogado penal', 'No concede subrogado penal'];
const OPCIONES_BLOQUE_5B_MOTIVO_DECISION_NEGATIVA = [
  'Porque no cumple aÃºn con el tiempo para aplicar al subrogado',
  'Porque falta documentaciÃ³n a remitir por parte del Inpec',
  'Porque la autoridad judicial no tuvo en cuenta todo el tiempo de privaciÃ³n de libertad de la persona en otros ERON o centro de detenciÃ³n transitoria',
  'Por la valoraciÃ³n de la conducta punible contenida en la sentencia',
  'Porque el juez encuentra que el avance en el tratamiento penitenciario de la persona aÃºn no es suficiente',
  'Porque tiene calificaciones de conducta negativa de periodos anteriores',
  'Porque no se demostrÃ³ el arraigo familiar o social de la persona privada de la libertad',
  'Porque no se ha reparado a la vÃ­ctima o asegurado el pago de la indemnizaciÃ³n a esta a travÃ©s de garantÃ­a personal, real, bancaria o acuerdo de pago y tampoco se ha demostrado la insolvencia del condenado',
  'Porque determinÃ³ que hay un delito excluido que impide concesiÃ³n',
  'Porque la persona privada de la libertad pertenece al grupo familiar de la vÃ­ctima',
  'Porque no se demostrÃ³ el arraigo familiar o social de la persona privada de la libertad',
  'Porque la persona no tiene un lugar al que ir por fuera de prisiÃ³n (no tiene arraigo)',
  'Porque no cumple requisito de jefatura de hogar para utilidad pÃºblica',
  'Porque no cumple requisito de marginalidad para utilidad pÃºblica',
  'Se considerÃ³ que no cumple algÃºn requisito para su procedencia',
];
const OPCIONES_BLOQUE_5B_SENTIDO_DECISION_RESUELVE_SOLICITUD = ['Favorable', 'Desfavorable'];

// CELESTE (PPL SINDICADOS)
const OPCIONES_SITUACION_JURIDICA_ACTUALIZADA = ['Condenado', 'Sindicado'];
const OPCIONES_CELESTE_ANALISIS_ACTUACION = [
  'Se avanzar? con solicitud de revocatoria o sustituciÃ³n de la medida',
  'No se avanzar? con la revocatoria porque la persona ya fue condenada',
  'No se avanzar? con la revocatoria porque aÃºn no reÃºne el tiempo exigido por la norma para solicitar el levantamiento de la detenciÃ³n preventiva',
  'No se avanzar? con la revocatoria porque la persona est? procesada por delitos en los que procede prÃ³rroga de la detenciÃ³n preventiva y aÃºn no cumple ese tiempo',
  'No se avanzar? con la revocatoria porque son tres o mÃ¡s los acusados y aÃºn no se cumple el tiempo para solicitar el levantamiento de la detenciÃ³n preventiva en este supuesto',
  'No se avanzar? con la revocatoria porque la persona est? procesada por delitos atribuibles a Grupos Delictivos Organizados (GDO) o Grupos Armados Organizados (GAO) y aÃºn no cumple el tiempo permitido',
  'No se avanzar? con la revocatoria porque ya hay una solicitud en trÃ¡mite',
];
const OPCIONES_SENTIDO_DECISION_CELESTE = [
  'Revoca medida de aseguramiento privativa de la libertad',
  'Sustituye medida de aseguramiento privativa de la libertad',
  'Niega la solicitud',
];
const OPCIONES_MOTIVO_DECISION_NEGATIVA_CELESTE = [
  'Porque no cumple aÃºn con los tÃ©rminos exigidos',
  'Porque est? procesado por causales en las que procede la prÃ³rroga de la medida',
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

function computeFlow(formData) {
  // REGLA DE NEGOCIO: el flujo depende exclusivamente de "SituaciÃ³n JurÃ­dica".
  const base = norm(formData?.['SituaciÃ³n JurÃ­dica']);
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
    if (!/[ÃÂâ]/.test(out)) break;
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
    .replace(/\best\?/gi, 'está')
    .replace(/\bavanzar\?/gi, 'avanzará')
    .replace(/\bdemostar\b/gi, 'demostrar')
    .replace(/\?ltima/gi, 'última');
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
  'distrito/municipio del lugar de privacion de la libertad',
  'defensor(a) publico(a) asignado para tramitar la solicitud',
  'pag',
  '__rowindex',
]);

function normalizeFieldKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
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
}) {
  const isDisabled = Boolean(readOnly || disabled);
  if (type === 'select') {
    const normalizedValue = value === '-' ? '' : value ?? '';
    return (
      <div className={`form-field${isDisabled ? ' is-disabled' : ''}`}>
        <label>{displayText(label)}</label>
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
        <label>{displayText(label)}</label>
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
      <label>{displayText(label)}</label>
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

export default function FormularioEntrevista({ numeroInicial }) {
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
  const [creandoActuacion, setCreandoActuacion] = useState(false);
  const [mostrarFormularioDetalle, setMostrarFormularioDetalle] = useState(false);
  const bloque2AuroraRef = useRef(null);

  useEffect(() => {
    if (numeroInicial) buscarRegistro(numeroInicial);
  }, [numeroInicial]);

  const flow = useMemo(() => (registro ? computeFlow(registro) : null), [registro]);
  const tiempoPrivacionMeses = useMemo(() => {
    if (!registro) return '';

    const rawDays = String(registro['Tiempo que la persona lleva privada de la libertad (en dÃ­as)'] ?? '').trim();
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
      const explicit = source.numeroIdentificacion ?? source['NÃºmero de identificaciÃ³n'] ?? source['Numero de identificacion'];
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
      setMostrarFormularioDetalle(false);
      setHistorialRefreshToken((prev) => prev + 1);
    } catch (e) {
      reportError(e, 'formulario-entrevista:buscar');
      setRegistro(null);
      setActuacionActivaId('');
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

  async function handleCrearNuevaActuacion() {
    if (!registro) {
      setError('Debe cargar un usuario antes de crear una nueva actuacion.');
      return;
    }

    setCreandoActuacion(true);
    try {
      const nextDraft = buildNuevaActuacionDraft(registro);
      setRegistro(wrapRegistroForLookup(nextDraft));
      setActuacionActivaId(`nueva-${Date.now()}`);
      setError('');
      setGuardadoOk(false);
      setToastMessage('Nueva actuacion iniciada. Complete el formulario y guarde cuando finalice.');
      setToastOpen(true);
      setMostrarFormularioDetalle(false);
    } catch (e) {
      reportError(e, 'formulario-entrevista:crear-actuacion');
      setError('No fue posible iniciar una nueva actuacion para este PPL.');
    } finally {
      setCreandoActuacion(false);
    }
  }

  const habilitarPregunta35 = useMemo(() => {
    const v = String(registro?.['Procedencia de acumulaciÃ³n de penas'] ?? '').trim();
    return norm(v) === 'si';
  }, [registro]);

  const cierreRegla1Bloque3 = useMemo(() => {
    if (!registro) return false;

    const respuestas30a33 = [
      registro['Procedencia de libertad condicional'],
      registro['Procedencia de prisiÃ³n domiciliaria de mitad de pena'],
      registro['Procedencia de utilidad pÃºblica (solo para mujeres)'],
      registro['Procedencia de pena cumplida'],
    ];

    const todasRespondidas = respuestas30a33.every((v) => isFilled(v));
    if (!todasRespondidas) return false;

    return respuestas30a33.every((v) => isEquivalenteNo(v));
  }, [registro]);

  const decisionUsuario = useMemo(() => String(registro?.['DecisiÃ³n del usuario'] ?? '').trim(), [registro]);
  const decisionUsuarioDesbloquea = useMemo(() => decisionUsuarioPermiteAvance(decisionUsuario), [decisionUsuario]);
  const decisionUsuarioBloquea = useMemo(() => Boolean(decisionUsuario && !decisionUsuarioDesbloquea), [
    decisionUsuario,
    decisionUsuarioDesbloquea,
  ]);

  const actuacionAdelantar = useMemo(() => String(registro?.['ActuaciÃ³n a adelantar'] ?? '').trim(), [registro]);
  const actuacionBloqueaPorNinguna = useMemo(
    () => Boolean(actuacionAdelantar && actuacionAdelantar.startsWith('Ninguna')),
    [actuacionAdelantar]
  );

  const saltoAuroraDesdeCeleste = false;
  const auroraActivo = useMemo(() => flow === 'condenado' || saltoAuroraDesdeCeleste, [flow, saltoAuroraDesdeCeleste]);
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
    const a = String(registro?.['Defensor(a) PÃºblico(a) Asignado para tramitar la solicitud'] ?? '').trim();
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
    // BLOQUE 4
    if (auroraActivo && decisionUsuarioBloquea) return true;
    if (auroraActivo && actuacionBloqueaPorNinguna) return true;

    // BLOQUE 3 (Caso cerrado â€” Regla 1)
    if (auroraActivo && cierreRegla1Bloque3) return true;

    // BLOQUE 5A
    const cumpleMarginalidad = String(registro?.['Cumple el requisito de marginalidad'] ?? '').trim();
    const cumpleJefatura = String(registro?.['Cumple el requisito de jefatura de hogar'] ?? '').trim();
    if (auroraActivo && ACTUACIONES_UTILIDAD_PUBLICA.has(actuacionAdelantar)) {
      if (cumpleMarginalidad === 'No' || cumpleJefatura === 'No') return true;

      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return true;

      const sentidoResuelveRecurso = String(registro?.['Sentido de la decisiÃ³n que resuelve recurso'] ?? '').trim();
      if (sentidoResuelveRecurso) return true;
    }

    // BLOQUE 5B
    if (auroraActivo && !ACTUACIONES_UTILIDAD_PUBLICA.has(actuacionAdelantar)) {
      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return true;

      const sentidoResuelveSolicitud = String(
        registro?.['Sentido de la decisiÃ³n que resuelve la solicitud'] ?? ''
      ).trim();
      if (sentidoResuelveSolicitud) return true;
    }
    return false;
  }, [
    registro,
    actuacionAdelantar,
    decisionUsuarioBloquea,
    actuacionBloqueaPorNinguna,
    cierreRegla1Bloque3,
    auroraActivo,
  ]);

  const motivoCierre = useMemo(() => {
    if (!registro) return '';
    if (auroraActivo && cierreRegla1Bloque3) {
      return 'Caso cerrado: en las preguntas 30 a 33 se marco que no procede la solicitud (No/No aplica/No cumple).';
    }
    if (auroraActivo && decisionUsuarioBloquea) return 'Caso cerrado';
    if (auroraActivo && actuacionBloqueaPorNinguna) return 'Caso cerrado';
    const cumpleMarginalidad = String(registro?.['Cumple el requisito de marginalidad'] ?? '').trim();
    const cumpleJefatura = String(registro?.['Cumple el requisito de jefatura de hogar'] ?? '').trim();
    if (auroraActivo && ACTUACIONES_UTILIDAD_PUBLICA.has(actuacionAdelantar)) {
      if (cumpleMarginalidad === 'No' || cumpleJefatura === 'No') return 'Caso cerrado';
      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return 'Caso cerrado';
      const sentidoResuelveRecurso = String(registro?.['Sentido de la decisiÃ³n que resuelve recurso'] ?? '').trim();
      if (sentidoResuelveRecurso) return 'Caso cerrado';
    }

    if (auroraActivo && !ACTUACIONES_UTILIDAD_PUBLICA.has(actuacionAdelantar)) {
      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return 'Caso cerrado';
      const sentidoResuelveSolicitud = String(
        registro?.['Sentido de la decisiÃ³n que resuelve la solicitud'] ?? ''
      ).trim();
      if (sentidoResuelveSolicitud) return 'Caso cerrado';
    }

    return '';
  }, [
    registro,
    actuacionAdelantar,
    cierreRegla1Bloque3,
    decisionUsuarioBloquea,
    actuacionBloqueaPorNinguna,
    auroraActivo,
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
    if (!registro || !auroraActivo) return;
    const next = String(auroraRuleState?.derivedStatus || '').trim();
    if (!next) return;
    const current = String(registro['Estado del trÃ¡mite'] ?? '').trim();
    if (current === next) return;
    setRegistro((prev) => {
      if (!prev) return prev;
      const cur = String(prev['Estado del trÃ¡mite'] ?? '').trim();
      if (cur === next) return prev;
      return wrapRegistroForLookup({ ...unwrapRegistro(prev), 'Estado del trÃ¡mite': next });
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
    // REGLA: P35 solo se habilita si P34 = "SÃ­". Si no, queda deshabilitada y vacÃ­a.
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
    const sentido = String(registro?.['Sentido de la decisiÃ³n'] ?? '').trim();
    const sentidoResuelve = String(registro?.['Sentido de la decisiÃ³n que resuelve recurso'] ?? '').trim();
    return sentido === 'Niega utilidad pÃºblica' || sentidoResuelve === 'Niega utilidad pÃºblica';
  }, [registro]);

  useEffect(() => {
    // DESBLOQUEOS CONDICIONALES 5A: si no aplica "Niega...", deshabilita y limpia 53-55 si existen.
    if (!registro) return;
    if (habilitarNegativaUtilidadPublica) return;

    const keys = ['Motivo de la decisiÃ³n negativa', 'Se presenta recurso', 'Fecha de recurso en caso desfavorable'];
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

  const habilitarCelesteRecurso = useMemo(() => {
    const v = String(registro?.['Â¿SE RECURRIÃ“ EN CASO DE DECISIÃ“N NEGATIVA?'] ?? '').trim();
    return isEquivalenteSi(v);
  }, [registro]);

  useEffect(() => {
    // REGLA 6 (CELESTE): si 36 != "SÃ­", 37 y 38 quedan deshabilitadas y vacÃ­as.
    if (!registro) return;
    if (habilitarCelesteRecurso) return;
    setRegistro((prev) => {
      if (!prev) return prev;
      const keys = ['Fecha de presentaciÃ³n del recurso', 'SENTIDO DE LA DECISIÃ“N QUE RESUELVE RECURSO'];
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
      await updatePpl(doc, { data: unwrapRegistro(registro) });
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
        'SituaciÃ³n JurÃ­dica actualizada (de conformidad con la rama judicial)': nextSituacionActualizada,
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
      // Evita bucle de redirecciÃ³n: no vuelve a guardar/redirigir. Solo navega a AURORA (BLOQUE 2).
      setRegistro((prev) => ({
        ...(prev || {}),
        redirectedToAurora: true,
        'SituaciÃ³n JurÃ­dica': 'Condenado',
        'SituaciÃ³n JurÃ­dica actualizada (de conformidad con la rama judicial)': 'CONDENADO',
      }));
      setAuroraAbrirBloque2(celesteEval.jumpPayload?.startBlock === 2);
      return;
    }

    if (saltoCelesteGuardando) return;

    const next = {
      ...(registro || {}),
      'SituaciÃ³n JurÃ­dica actualizada (de conformidad con la rama judicial)': 'CONDENADO',
      redirectedToAurora: true,
    };

    setSaltoCelesteGuardando(true);
    setError('');
    setToastOpen(false);

    try {
      await updatePpl(doc, { data: next });
      setToastMessage('Formulario guardado');
      setToastOpen(true);

      // Redirigir/navegar a AURORA del mismo usuario y abrir Bloque 2 como siguiente paso.
      const refreshed = await getPplByDocumento(doc);
      const r = refreshed?.registro || next;

      setRegistro({
        ...(r || next),
        // Fuerza el flujo AURORA por regla de salto (sin reiniciar caso).
        redirectedToAurora: true,
        'SituaciÃ³n JurÃ­dica': 'Condenado',
        'SituaciÃ³n JurÃ­dica actualizada (de conformidad con la rama judicial)': 'CONDENADO',
      });
      setAuroraAbrirBloque2(celesteEval.jumpPayload?.startBlock === 2);
    } catch (e) {
      reportError(e, 'formulario-entrevista:salto-celeste-aurora');
      setError('Error al guardar el formulario. No se redirigiÃ³ a AURORA.');
    } finally {
      setSaltoCelesteGuardando(false);
    }
  }, [getDocumentoActual, registro, saltoCelesteGuardando]);

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
      registro?.['SituaciÃ³n JurÃ­dica actualizada (de conformidad con la rama judicial)'] ??
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

        {cargando && <p>{displayText('Cargando información...')}</p>}
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
              refreshToken={historialRefreshToken}
              actuacionActivaId={actuacionActivaId}
              creandoActuacion={creandoActuacion}
            />
          </div>

          {!mostrarFormularioDetalle && (
            <p className="hint-text" style={{ marginTop: '0.75rem' }}>
              {displayText('Vista previa activa. Seleccione "Ver caso" para abrir el formulario precargado.')}
            </p>
          )}

          {mostrarFormularioDetalle && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3 className="block-title">{displayText('BLOQUE 1. Información de la persona privada de la libertad')}</h3>

          <div className="grid-2">
            <Campo label="1. Nombre" name="Nombre" value={registro['Nombre']} onChange={handleChange} />

            <Campo
              label="2. Tipo de indentificaciÃ³n"
              name="Tipo de indentificaciÃ³n"
              type="select"
              value={registro['Tipo de indentificaciÃ³n']}
              onChange={handleChange}
              options={OPCIONES_TIPO_IDENTIFICACION}
            />

            <Campo
              label="3. NÃºmero de identificaciÃ³n"
              name="NÃºmero de identificaciÃ³n"
              value={registro['NÃºmero de identificaciÃ³n']}
              onChange={handleChange}
              readOnly={Boolean(String(registro['NÃºmero de identificaciÃ³n'] ?? '').trim())}
            />

            <Campo
              label="4. SituaciÃ³n JurÃ­dica"
              name="SituaciÃ³n JurÃ­dica"
              type="select"
              value={registro['SituaciÃ³n JurÃ­dica']}
              onChange={handleChange}
              options={OPCIONES_SITUACION_JURIDICA}
              disabled
            />

            <Campo
              label="5. GÃ©nero"
              name="GÃ©nero"
              type="select"
              value={registro['GÃ©nero']}
              onChange={handleChange}
              options={OPCIONES_GENERO_AURORA}
            />

            <Campo
              label="6. Enfoque Ã‰tnico/Racial/Cultural"
              name="Enfoque Ã‰tnico/Racial/Cultural"
              type="select"
              value={registro['Enfoque Ã‰tnico/Racial/Cultural']}
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
              label="10. Lugar de privaciÃ³n de la libertad"
              name="Lugar de privaciÃ³n de la libertad"
              type="select"
              value={registro['Lugar de privaciÃ³n de la libertad']}
              onChange={handleChange}
              options={OPCIONES_LUGAR_PRIVACION}
            />

            <Campo
              label="11. Nombre del lugar de privaciÃ³n de la libertad"
              name="Nombre del lugar de privaciÃ³n de la libertad"
              value={registro['Nombre del lugar de privaciÃ³n de la libertad']}
              onChange={handleChange}
            />

            <Campo
              label="12. Departamento del lugar de privaciÃ³n de la libertad"
              name="Departamento del lugar de privaciÃ³n de la libertad"
              value={registro['Departamento del lugar de privaciÃ³n de la libertad']}
              onChange={handleChange}
            />

            <Campo
              label="13. Distrito/municipio del lugar de privaciÃ³n de la libertad"
              name="Distrito/municipio del lugar de privaciÃ³n de la libertad"
              value={registro['Distrito/municipio del lugar de privaciÃ³n de la libertad']}
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
                  {displayText('BLOQUE 2 (AURORA) - Información del proceso SISIPEC')}
                </h3>
                <div className="grid-2">
                <Campo
                  label="14. Autoridad a cargo"
                  name="Autoridad a cargo"
                  value={registro['Autoridad a cargo']}
                  onChange={handleChange}
                />
                <Campo
                  label="15. NÃºmero de proceso"
                  name="NÃºmero de proceso"
                  value={registro['NÃºmero de proceso']}
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
                  label="18. Pena (aÃ±os, meses y dÃ­as)"
                  name="Pena (aÃ±os, meses y dÃ­as)"
                  value={registro['Pena (aÃ±os, meses y dÃ­as)']}
                  onChange={handleChange}
                />
                <Campo
                  label="19. Pena total en dÃ­as"
                  name="Pena total en dÃ­as"
                  type="number"
                  value={registro['Pena total en dÃ­as']}
                  onChange={handleChange}
                />
                <Campo
                  label="20. Tiempo que la persona lleva privada de la libertad (en dÃ­as)"
                  name="Tiempo que la persona lleva privada de la libertad (en dÃ­as)"
                  type="number"
                  value={registro['Tiempo que la persona lleva privada de la libertad (en dÃ­as)']}
                  onChange={handleChange}
                />
                <Campo
                  label="21. RedenciÃ³n total acumulada en dÃ­as"
                  name="RedenciÃ³n total acumulada en dÃ­as"
                  type="number"
                  value={registro['RedenciÃ³n total acumulada en dÃ­as']}
                  onChange={handleChange}
                />
                <Campo
                  label="22. Tiempo efectivo de pena cumplida en dÃ­as (teniendo en cuenta la redenciÃ³n)"
                  name="Tiempo efectivo de pena cumplida en dÃ­as (teniendo en cuenta la redenciÃ³n)"
                  type="number"
                  value={registro['Tiempo efectivo de pena cumplida en dÃ­as (teniendo en cuenta la redenciÃ³n)']}
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
                    <div className="progress-wrap" aria-label="Barra de avance de pena cumplida">
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
                  label="25. Â¿Cuenta con requerimientos judiciales por otros procesos?"
                  name="Â¿ Cuenta con requerimientos judiciales por otros procesos ?"
                  type="select"
                  value={registro['Â¿ Cuenta con requerimientos judiciales por otros procesos ?']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                />
                <Campo
                  label="26. Fecha ?ltima calificaciÃ³n"
                  name="Fecha ?ltima calificaciÃ³n"
                  type="date"
                  value={registro['Fecha ?ltima calificaciÃ³n']}
                  onChange={handleChange}
                />
                <Campo
                  label="27. CalificaciÃ³n de conducta"
                  name="CalificaciÃ³n de conducta"
                  type="select"
                  value={registro['CalificaciÃ³n de conducta']}
                  onChange={handleChange}
                  options={OPCIONES_CALIFICACION_CONDUCTA}
                />
              </div>
                </>
              )}

              {auroraVisibleBlocks.has('bloque3') && (
                <>
                <h3 className="block-title">{displayText('BLOQUE 3 - Análisis jurídico')}</h3>
                <div className="grid-2">
                <Campo
                  label="28. Defensor(a) pÃºblico(a) asignado para tramitar la solicitud"
                  name="Defensor(a) PÃºblico(a) Asignado para tramitar la solicitud"
                  value={registro['Defensor(a) PÃºblico(a) Asignado para tramitar la solicitud']}
                  onChange={handleChange}
                />

                <Campo
                  label="29. Fecha de anÃ¡lisis jurÃ­dico del caso"
                  name="Fecha de anÃ¡lisis jurÃ­dico del caso"
                  type="date"
                  value={registro['Fecha de anÃ¡lisis jurÃ­dico del caso']}
                  onChange={handleChange}
                />

                <Campo
                  label="30. Procedencia de libertad condicional"
                  name="Procedencia de libertad condicional"
                  type="select"
                  value={registro['Procedencia de libertad condicional']}
                  onChange={handleChange}
                  options={OPCIONES_PROCEDENCIA_LIBERTAD_CONDICIONAL}
                />

                <Campo
                  label="31. Procedencia de prisiÃ³n domiciliaria de mitad de pena"
                  name="Procedencia de prisiÃ³n domiciliaria de mitad de pena"
                  type="select"
                  value={registro['Procedencia de prisiÃ³n domiciliaria de mitad de pena']}
                  onChange={handleChange}
                  options={OPCIONES_PROCEDENCIA_PRISION_DOMICILIARIA}
                />

                <Campo
                  label="32. Procedencia de utilidad pÃºblica (solo para mujeres)"
                  name="Procedencia de utilidad pÃºblica (solo para mujeres)"
                  type="select"
                  value={registro['Procedencia de utilidad pÃºblica (solo para mujeres)']}
                  onChange={handleChange}
                  options={OPCIONES_PROCEDENCIA_UTILIDAD_PUBLICA}
                />

                <Campo
                  label="33. Procedencia de pena cumplida"
                  name="Procedencia de pena cumplida"
                  type="select"
                  value={registro['Procedencia de pena cumplida']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                />

                <Campo
                  label="34. Procedencia de acumulaciÃ³n de penas"
                  name="Procedencia de acumulaciÃ³n de penas"
                  type="select"
                  value={registro['Procedencia de acumulaciÃ³n de penas']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                />

                <Campo
                  label="35. Con quÃ© proceso(s) debe acumular penas (si aplica)"
                  name={KEY_Q35_LEGACY}
                  value={registro[KEY_Q35_LEGACY] ?? registro[KEY_Q35_UTF8] ?? ''}
                  onChange={handleChange}
                  required={false}
                  disabled={!habilitarPregunta35}
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
                  label="37. Resumen del anÃ¡lisis del caso"
                  name="Resumen del anÃ¡lisis del caso"
                  type="textarea"
                  value={registro['Resumen del anÃ¡lisis del caso']}
                  onChange={handleChange}
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
                />

                <Campo
                  label="39. DecisiÃ³n del usuario"
                  name="DecisiÃ³n del usuario"
                  type="select"
                  value={registro['DecisiÃ³n del usuario']}
                  onChange={handleChange}
                  options={OPCIONES_AURORA_DECISION_USUARIO}
                  disabled={cierreRegla1Bloque3}
                />

                <div className="question-40-highlight">
                <Campo
                  label="40. ActuaciÃ³n a adelantar"
                  name="ActuaciÃ³n a adelantar"
                  type="select"
                  value={registro['ActuaciÃ³n a adelantar']}
                  onChange={handleChange}
                  options={OPCIONES_AURORA_ACTUACION_A_ADELANTAR}
                  disabled={cierreRegla1Bloque3 || decisionUsuarioBloquea}
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
                />

                <Campo
                  label="42. Poder en caso de avanzar con la solicitud"
                  name="Poder en caso de avanzar con la solicitud"
                  type="select"
                  value={registro['Poder en caso de avanzar con la solicitud']}
                  onChange={handleChange}
                  options={OPCIONES_PODER}
                  disabled={cierreRegla1Bloque3 || decisionUsuarioBloquea || actuacionBloqueaPorNinguna}
                />

                {decisionUsuarioBloquea && (
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <p className="hint-text">
                      {displayText('El resto del formulario está bloqueado por la selección en "Decisión del usuario".')}
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

              {auroraVisibleBlocks.has('bloque5UtilidadPublica') || auroraVisibleBlocks.has('bloque5TramiteNormal') ? (() => {
                const show5A =
                  auroraVisibleBlocks.has('bloque5UtilidadPublica') ||
                  (auroraRuleState?.blockVariants?.bloque5 === 'utilidadPublica');
                const show5B =
                  auroraVisibleBlocks.has('bloque5TramiteNormal') ||
                  (!show5A && auroraRuleState?.blockVariants?.bloque5 !== 'utilidadPublica');

                const bloquearBloque5 = cierreRegla1Bloque3 || decisionUsuarioBloquea || actuacionBloqueaPorNinguna;

                const requiereMisionTrabajo = String(registro?.['Se requiere misiÃ³n de trabajo'] ?? '').trim();
                const deshabilitarMision = requiereMisionTrabajo === 'No';

                return (
                  <>
                    {show5A && (
                      <>
                        <h3 className="block-title">{displayText('BLOQUE 5. Utilidad pública')}</h3>
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
                            label="46. Se requiere misiÃ³n de trabajo"
                            name="Se requiere misiÃ³n de trabajo"
                            type="select"
                            value={registro['Se requiere misiÃ³n de trabajo']}
                            onChange={handleChange}
                            options={OPCIONES_SI_NO}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="47. Fecha de solicitud de misiÃ³n de trabajo"
                            name="Fecha de solicitud de misiÃ³n de trabajo"
                            type="date"
                            value={registro['Fecha de solicitud de misiÃ³n de trabajo']}
                            onChange={handleChange}
                            required={false}
                            disabled={isAuroraFieldDisabled('Fecha de solicitud de misiÃ³n de trabajo', bloquearBloque5 || deshabilitarMision)}
                          />
                          <Campo
                            label="48. Fecha de asignaciÃ³n de investigador"
                            name="Fecha de asignaciÃ³n de investigador"
                            type="date"
                            value={registro['Fecha de asignaciÃ³n de investigador']}
                            onChange={handleChange}
                            required={false}
                            disabled={isAuroraFieldDisabled('Fecha de asignaciÃ³n de investigador', bloquearBloque5 || deshabilitarMision)}
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
                            label="50. Fecha de radicaciÃ³n de solicitud de utilidad pÃºblica"
                            name="Fecha de radicaciÃ³n de solicitud de utilidad pÃºblica"
                            type="date"
                            value={registro['Fecha de radicaciÃ³n de solicitud de utilidad pÃºblica']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="51. Fecha de decisiÃ³n de la autoridad"
                            name="Fecha de decisiÃ³n de la autoridad"
                            type="date"
                            value={registro['Fecha de decisiÃ³n de la autoridad']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="52. Sentido de la decisiÃ³n"
                            name="Sentido de la decisiÃ³n"
                            type="select"
                            value={registro['Sentido de la decisiÃ³n']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5A_SENTIDO_DECISION}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="53. Motivo de la decisiÃ³n negativa"
                            name="Motivo de la decisiÃ³n negativa"
                            type="select"
                            value={registro['Motivo de la decisiÃ³n negativa']}
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
                            label="56. Sentido de la decisiÃ³n que resuelve recurso"
                            name="Sentido de la decisiÃ³n que resuelve recurso"
                            type="select"
                            value={registro['Sentido de la decisiÃ³n que resuelve recurso']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5A_SENTIDO_DECISION_RESUELVE_RECURSO}
                            required={false}
                            disabled={bloquearBloque5 || !isEquivalenteSi(registro?.['Se presenta recurso'])}
                          />
                        </div>
                      </>
                    )}

                    {show5B && (
                      <>
                        <h3 className="block-title">{displayText('BLOQUE 5. Trámite de la solicitud')}</h3>
                        <div className="grid-2">
                          <Campo
                            label="43. Fecha de recepciÃ³n de pruebas aportadas por el usuario (si aplica)"
                            name="Fecha de recepciÃ³n de pruebas aportadas por el usuario (si aplica)"
                            type="date"
                            value={registro['Fecha de recepciÃ³n de pruebas aportadas por el usuario (si aplica)']}
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
                            label="45. Fecha de presentaciÃ³n de la solicitud a la autoridad"
                            name="Fecha de presentaciÃ³n de la solicitud a la autoridad"
                            type="date"
                            value={registro['Fecha de presentaciÃ³n de la solicitud a la autoridad']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="46. Fecha de decisiÃ³n de la autoridad"
                            name="Fecha de decisiÃ³n de la autoridad"
                            type="date"
                            value={registro['Fecha de decisiÃ³n de la autoridad']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="47. Sentido de la decisiÃ³n"
                            name="Sentido de la decisiÃ³n"
                            type="select"
                            value={registro['Sentido de la decisiÃ³n']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5B_SENTIDO_DECISION}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="48. Motivo de la decisiÃ³n negativa"
                            name="Motivo de la decisiÃ³n negativa"
                            type="select"
                            value={registro['Motivo de la decisiÃ³n negativa']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5B_MOTIVO_DECISION_NEGATIVA}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="49. Se presenta recurso"
                            name="Se presenta recurso"
                            type="select"
                            value={registro['Se presenta recurso']}
                            onChange={handleChange}
                            options={OPCIONES_SI_NO}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="50. Fecha de recurso en caso desfavorable"
                            name="Fecha de recurso en caso desfavorable"
                            type="date"
                            value={registro['Fecha de recurso en caso desfavorable']}
                            onChange={handleChange}
                            required={false}
                            disabled={
                              bloquearBloque5 || !isEquivalenteSi(registro?.['Se presenta recurso'])
                            }
                          />
                          <Campo
                            label="51. Sentido de la decisiÃ³n que resuelve recurso"
                            name="Sentido de la decisiÃ³n que resuelve la solicitud"
                            type="select"
                            value={registro['Sentido de la decisiÃ³n que resuelve la solicitud']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5B_SENTIDO_DECISION_RESUELVE_SOLICITUD}
                            required={false}
                            disabled={
                              bloquearBloque5 || !isEquivalenteSi(registro?.['Se presenta recurso'])
                            }
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
                  <h3 className="block-title">{displayText('BLOQUE 2 (CELESTE) - Información del proceso SISIPEC')}</h3>
                  <div className="grid-2">
                    <Campo
                      label="14. Autoridad a cargo"
                      name="Autoridad a cargo"
                      value={registro['Autoridad a cargo']}
                      onChange={handleChange}
                      required
                    />
                    <Campo
                      label="15. NÃºmero de proceso"
                      name="NÃºmero de proceso"
                      value={registro['NÃºmero de proceso']}
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
                  <h3 className="block-title">{displayText('BLOQUE 3 (CELESTE) - Análisis jurídico')}</h3>
                  <div className="grid-2">
                    <Campo
                      label="19. Defensor(a) p\u00fablico(a) asignado para tramitar la solicitud"
                      name="Defensor(a) PÃºblico(a) Asignado para tramitar la solicitud"
                      value={registro['Defensor(a) PÃºblico(a) Asignado para tramitar la solicitud']}
                      onChange={handleChange}
                      required
                    />
                    <Campo
                      label="20. Fecha de an\u00e1lisis jur\u00eddico del caso"
                      name="Fecha de anÃ¡lisis jurÃ­dico del caso"
                      type="date"
                      value={registro['Fecha de anÃ¡lisis jurÃ­dico del caso']}
                      onChange={handleChange}
                      required
                    />
                    <Campo
                      label="21. An\u00e1lisis jur\u00eddico y actuaci\u00f3n a desplegar"
                      name="PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÃ‰RMINOS"
                      type="select"
                      value={registro['PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÃ‰RMINOS']}
                      onChange={handleChange}
                      options={OPCIONES_CELESTE_ANALISIS_ACTUACION}
                      required
                    />
                    <Campo
                      label="22. Resumen del an\u00e1lisis jur\u00eddico del caso"
                      name="RESUMEN DEL ANÃLISIS JURÃDICO DEL PRESENTE CASO"
                      type="textarea"
                      value={registro['RESUMEN DEL ANÃLISIS JURÃDICO DEL PRESENTE CASO']}
                      onChange={handleChange}
                      required={false}
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
                    />
                  </div>
                </>
              )}

              {celesteVisibleBlocks.has('bloque5Celeste') && (
                <>
                  <h3 className="block-title">{displayText('BLOQUE 5 (CELESTE) - Trámite de la solicitud')}</h3>
                  <div className="grid-2">
                    <Campo
                      label="24. Fecha de presentaciÃ³n de la solicitud de audiencia"
                      name="FECHA DE SOLICITUD DE AUDIENCIA DE CONTROL DE GARANTÃAS PARA SUSTENTAR REVOCATORIA"
                      type="date"
                      value={registro['FECHA DE SOLICITUD DE AUDIENCIA DE CONTROL DE GARANTÃAS PARA SUSTENTAR REVOCATORIA']}
                      onChange={handleChange}
                      required={false}
                    />
                    <Campo
                      label="25. Fecha de realizaciÃ³n de la audiencia"
                      name="FECHA DE REALIZACIÃ“N DE AUDIENCIA"
                      type="date"
                      value={registro['FECHA DE REALIZACIÃ“N DE AUDIENCIA']}
                      onChange={handleChange}
                      required={false}
                    />
                    <Campo
                      label="26. Sentido de la decisiÃ³n"
                      name="SENTIDO DE LA DECISIÃ“N"
                      type="select"
                      value={registro['SENTIDO DE LA DECISIÃ“N']}
                      onChange={handleChange}
                      options={OPCIONES_SENTIDO_DECISION_CELESTE}
                      required={false}
                    />
                    <Campo
                      label="27. Motivo de la decisiÃ³n negativa"
                      name="MOTIVO DE LA DECISIÃ“N NEGATIVA"
                      type="select"
                      value={registro['MOTIVO DE LA DECISIÃ“N NEGATIVA']}
                      onChange={handleChange}
                      options={OPCIONES_MOTIVO_DECISION_NEGATIVA_CELESTE}
                      required={false}
                    />
                    <Campo
                      label="28. Se presenta recurso"
                      name="Â¿SE RECURRIÃ“ EN CASO DE DECISIÃ“N NEGATIVA?"
                      type="select"
                      value={registro['Â¿SE RECURRIÃ“ EN CASO DE DECISIÃ“N NEGATIVA?']}
                      onChange={handleChange}
                      options={OPCIONES_SI_NO}
                      required={false}
                    />
                    <Campo
                      label="29. Fecha de recurso en caso desfavorable"
                      name="Fecha de presentaciÃ³n del recurso"
                      type="date"
                      value={registro['Fecha de presentaciÃ³n del recurso']}
                      onChange={handleChange}
                      required={false}
                      disabled={!habilitarCelesteRecurso}
                    />
                    <Campo
                      label="30. Sentido de la decisiÃ³n que resuelve recurso"
                      name="SENTIDO DE LA DECISIÃ“N QUE RESUELVE RECURSO"
                      type="select"
                      value={registro['SENTIDO DE LA DECISIÃ“N QUE RESUELVE RECURSO']}
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














