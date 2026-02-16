import { useEffect, useMemo, useRef, useState } from 'react';
import { getPplByDocumento, updatePpl } from '../services/api.js';
import Toast from '../components/Toast.jsx';
import { evaluateAuroraRules } from '../utils/evaluateAuroraRules.ts';
import { evaluateCelesteRules } from '../utils/evaluateCelesteRules.ts';

const OPCIONES_TIPO_IDENTIFICACION = ['CC', 'CE', 'PASAPORTE', 'OTRA'];
const OPCIONES_SI_NO = ['Sí', 'No'];
const OPCIONES_PODER = ['Sí se requiere', 'Ya se cuenta con poder'];

// =========================
// AURORA (PPL CONDENADOS)
// =========================
const OPCIONES_SITUACION_JURIDICA = ['Condenado', 'Sindicado'];
const OPCIONES_GENERO_AURORA = [
  'Masculino',
  'Femenino',
  'Queer',
  'Mujer trans',
  'Hombre Trans',
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
  'Indígena',
];
const OPCIONES_LUGAR_PRIVACION = ['CDT', 'ERON'];
const OPCIONES_FASE_TRATAMIENTO = [
  'Observación',
  'Alta',
  'Mediana',
  'Mínima',
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
  'Sí procede solicitud de libertad condicional',
  'No aplica porque ya hay solicitud de libertad o subrogado penal en trámite',
  'No aplica porque ya está en libertad por pena cumplida',
  'No aplica porque ya se concedió libertad condicional',
  'No aplica porque ya se concedió prisión domiciliaria',
  'No aplica porque ya se concedió utilidad pública',
  'No aplica porque el proceso no ha sido asignado a JEPMS',
  'No aplica porque el proceso está en otro circuito judicial (falta trasladar el proceso al actual)',
  'No aplica porque la condena está por delito excluido del subrogado',
  'No aplica porque recientemente se le revocó subrogado penal',
  'No aplica porque recientemente se le negó subrogado penal',
  'No aplica porque la evaluación de conducta es negativa',
  'No aplica porque se determinó que no ha cumplido requisito temporal para acceder',
  'No aplica porque tiene acumulación de penas',
  'No aplica porque la persona fue trasladada a otro ERON',
  'No aplica porque la persona está sindicada',
  'No aplica porque la cartilla biográfica no está actualizada',
  'Revisión suspendida porque se requiere primero trámite de acumulación de penas',
  'No aplica porque el usuario no puede demostrar arraigo',
];

const OPCIONES_PROCEDENCIA_PRISION_DOMICILIARIA = [
  'Sí procede solicitud de prisión domiciliaria de mitad de pena',
  'No aplica porque ya hay solicitud de libertad o subrogado penal en trámite',
  'No aplica porque ya está en libertad por pena cumplida',
  'No aplica porque ya se concedió libertad condicional',
  'No aplica porque ya se concedió prisión domiciliaria',
  'No aplica porque ya se concedió utilidad pública',
  'No aplica porque el proceso no ha sido asignado a jepms',
  'No aplica porque el proceso está en otro circuito judicial (falta trasladar el proceso al actual)',
  'No aplica porque la condena está por delito excluido del subrogado',
  'No aplica porque recientemente se le revocó un subrogado penal',
  'No aplica porque recientemente se le negó subrogado penal',
  'No aplica porque la evaluación de conducta es negativa',
  'No aplica porque se determinó que no ha cumplido requisito temporal para acceder',
  'No aplica porque tiene acumulación de penas',
  'No aplica porque la persona fue trasladada a otro ERON',
  'No aplica porque la persona está sindicada',
  'No aplica porque la cartilla biográfica no está actualizada',
  'Revisión suspendida porque se requiere primero trámite de acumulación de penas',
  'No aplica porque el usuario no puede demostrar arraigo',
];

const OPCIONES_PROCEDENCIA_UTILIDAD_PUBLICA = [
  'Sí cumple requisitos objetivos',
  'No cumple por tipo de delito',
  'No cumple monto de pena',
  'No cumple por reincidencia',
  'No cumple por delito excluido',
];

const OPCIONES_OTRAS_SOLICITUDES = [
  'Ninguna',
  'Solicitud de actualización de conducta',
  'Solicitud de asignación de JEPMS',
  'Solicitud de traslado del proceso al distrito judicial correspondiente',
  'Solicitud de actualización de cartilla biográfica',
  'Solicitud de redención de pena 2x3 trabajo',
  'Solicitud de redención de pena 2x3 analógica en actividades distintas a trabajo',
  'Permiso de 72 horas',
  'Otra',
];

const OPCIONES_AURORA_DECISION_USUARIO = [
  'Desea que el defensor(a) público(a) avance con la solicitud',
  'Tiene abogado de confianza, pero desea que la defensoría pública lo asesore en la solicitud',
  'Desea tramitar la solicitud a través de su defensor de confianza',
  'No desea tramitar la solicitud',
  'No avanzará porque no puede demostar arraigo fuera de prisión',
  'El usuario es renuente a la atención',
];

const OPCIONES_AURORA_ACTUACION_A_ADELANTAR = [
  'Libertad condicional',
  'Prisión domiciliaria',
  'Utilidad pública (solo para mujeres)',
  'Utilidad pública y prisión domiciliaria',
  'Utilidad pública y libertad condicional',
  'Redención de pena y libertad condicional',
  'Redención de pena y prisión domiciliaria',
  'Libertad condicional y en subsidio prisión domiciliaria',
  'Acumulación de penas',
  'Libertad por pena cumplida',
  'Redención de pena y libertad por pena cumplida',
  'Redención de pena',
  'Permiso de 72 horas',
  'Solicitud de actualización de conducta',
  'Solicitud de asginación de JEPMS',
  'Solicitud de traslado del proceso al distrito judicial correspondiente',
  'Solicitud de actualización de cartilla biográfica',
  'Otra',
  'Ninguna porque la persona está sindicada',
  'Ninguna porque está en trámite una solicitud de subrogado penal o pena cumplida',
  'Ninguna porque no procede subrogado penal en este momento por falta de cumplimiento de requisitos',
  'Ninguna porque no procede subrogado penal por exclusión de delito',
  'Ninguna porque porque ya no está en prisión',
];

const ACTUACIONES_UTILIDAD_PUBLICA = new Set([
  'Utilidad pública (solo para mujeres)',
  'Utilidad pública y prisión domiciliaria',
  'Utilidad pública y libertad condicional',
]);

const OPCIONES_BLOQUE_5A_SENTIDO_DECISION = ['Otorga utilidad pública', 'Niega utilidad pública'];
const OPCIONES_BLOQUE_5A_MOTIVO_DECISION_NEGATIVA = [
  'No concede por requisito objetivo',
  'No concende por requisito subjetivo',
  'No concede por requisitos objetivos y subjetivos',
  'Niega por falta de pruebas',
  'Concede otro beneficio',
  'Pena cumplida',
];
const OPCIONES_BLOQUE_5A_SENTIDO_DECISION_RESUELVE_RECURSO = [
  'Otorga utilidad pública',
  'Niega utilidad pública',
];

const OPCIONES_BLOQUE_5B_SENTIDO_DECISION = ['Concede subrogado penal', 'No concede subrogado penal'];
const OPCIONES_BLOQUE_5B_MOTIVO_DECISION_NEGATIVA = [
  'Porque no cumple aún con el tiempo para aplicar al subrogado',
  'Porque falta documentación a remitir por parte del Inpec',
  'Porque la autoridad judicial no tuvo en cuenta todo el tiempo de privación de libertad de la persona en otros ERON o centro de detención transitoria',
  'Por la valoración de la conducta punible contenida en la sentencia',
  'Porque el juez encuentra que el avance en el tratamiento penitenciario de la persona aún no es suficiente',
  'Porque tiene calificaciones de conducta negativa de periodos anteriores',
  'Porque no se demostró el arraigo familiar o social de la persona privada de la libertad',
  'Porque no se ha reparado a la víctima o asegurado el pago de la indemnización a esta a través de garantía personal, real, bancaria o acuerdo de pago y tampoco se ha demostrado la insolvencia del condenado',
  'Porque determinó que hay un delito excluido que impide concesión',
  'Porque la persona privada de la libertad pertenece al grupo familiar de la víctima',
  'Porque no se demostró el arraigo familiar o social de la persona privada de la libertad',
  'Porque la persona no tiene un lugar al que ir por fuera de prisión (no tiene arraigo)',
  'Porque no cumple requisito de jefatura de hogar para utilidad pública',
  'Porque no cumple requisito de marginalidad para utilidad pública',
  'Se consideró que no cumple algún requisito para su procedencia',
];
const OPCIONES_BLOQUE_5B_SENTIDO_DECISION_RESUELVE_SOLICITUD = ['Favorable', 'Desfavorable'];

// =========================
// CELESTE (PPL SINDICADOS)
// =========================
const OPCIONES_SITUACION_JURIDICA_ACTUALIZADA = ['SINDICADO', 'CONDENADO'];

const OPCIONES_PROCEDENCIA_VENCIMIENTO_TERMINOS = [
  'Sí procede',
  'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva (Se cierra el caso)',
  'No procede porque la persona está procesada por delitos en los que procede prórroga de la detención preventiva y aún no cumple ese tiempo',
  'No procede porque son tres o más los acusados y aún no se cumple el tiempo para solicitar el levantamiento de la detención preventiva en este supuesto',
  'No procede porque la persona está procesada por delitos atribuibles a Grupos Delictivos Organizados (GDO) o Grupos Armados Organizados (GAO) y aún no cumple el tiempo permitido',
  'No procede porque ya hay una solicitud en trámite',
];

const OPCIONES_CONFIRMACION_PROCEDENCIA_VENCIMIENTO = [
  'Sí procede',
  'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva (Se cierra el caso)',
  'No procede porque la persona está procesada por delitos en los que procede prórroga de la detención preventiva y aún no cumple ese tiempo',
  'No procede porque son tres o más los acusados y aún no se cumple el tiempo para solicitar el levantamiento de la detención preventiva en este supuesto',
  'No procede porque la persona está procesada por delitos atribuibles a Grupos Delictivos Organizados (GDO) o Grupos Armados Organizados (GAO) y aún no cumple el tiempo permitido',
  'No procede porque la persona está condenada',
  'No procede porque ya hay una solicitud en trámite',
];

const OPCIONES_CELESTE_DECISION_USUARIO = [
  'Desea que el defensor(a) público(a) avance con el trámite de levantamiento de detención preventiva',
  'Desea tramitar el trámite de levantamiento de detención preventiva a través de su defensor de confianza (Se cierra el caso)',
  'No desea tramitar la solicitud',
];

const OPCIONES_SENTIDO_DECISION_CELESTE = [
  'Concede levantamiento de medida de aseguramiento (Se cierra el caso)',
  'No concede levantamiento de medida de aseguramiento',
];

const OPCIONES_SENTIDO_DECISION_RECURSO_CELESTE = [
  'Concede levantamiento de medida de aseguramiento (Se cierra el caso)',
  'No concede levantamiento de medida de aseguramiento (Se cierra el caso)',
];

const OPCIONES_MOTIVO_DECISION_NEGATIVA_CELESTE = [
  'Porque no cumple aún con los términos exigidos',
  'Porque está procesado por causales en las que procede la prórroga de la medida',
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

function parseDateLoose(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  // YYYY-MM-DD (input[type=date])
  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime())) return iso;

  // DD/MM/YYYY
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const d = new Date(yyyy, mm - 1, dd);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function daysSince(date) {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  if (!Number.isFinite(ms)) return null;
  const days = Math.floor(ms / 86400000);
  return Math.max(0, days);
}

function semaforoFromDays(days) {
  if (days == null) return null;
  if (days <= 15) return 'verde';
  if (days <= 30) return 'amarillo';
  return 'rojo';
}

function computeFlow(formData) {
  // REGLA DE NEGOCIO: el flujo depende exclusivamente de “Situación Jurídica”.
  const base = norm(formData?.['Situación Jurídica']);
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
        <label>{label}</label>
        <select
          name={name}
          value={normalizedValue}
          onChange={(e) => onChange(name, e.target.value)}
          disabled={isDisabled}
          required={required}
        >
          <option value="" disabled hidden />
          {(options || OPCIONES_SI_NO).map((opt, idx) => (
            <option key={`${idx}-${String(opt)}`} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div className={`form-field${isDisabled ? ' is-disabled' : ''}`}>
        <label>{label}</label>
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
      <label>{label}</label>
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
  const [toastMessage, setToastMessage] = useState('Aurora — Cambios guardados correctamente');
  const [saltoCelesteGuardando, setSaltoCelesteGuardando] = useState(false);
  const [auroraAbrirBloque2, setAuroraAbrirBloque2] = useState(false);
  const bloque2AuroraRef = useRef(null);

  useEffect(() => {
    if (numeroInicial) buscarRegistro(numeroInicial);
  }, [numeroInicial]);

  const flow = useMemo(() => (registro ? computeFlow(registro) : null), [registro]);
  const tiempoPrivacionMeses = useMemo(() => {
    if (!registro) return '';

    const rawDays = String(registro['Tiempo que la persona lleva privada de la libertad (en días)'] ?? '').trim();
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

  function getDocumentoActual(fromRegistro = registro) {
    return String(
      fromRegistro?.['Número de identificación'] ||
        fromRegistro?.['Numero de identificacion'] ||
        numeroBusqueda ||
        ''
    ).trim();
  }

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
      setRegistro(data?.registro || null);
    } catch (e) {
      console.error(e);
      setRegistro(null);
      setError('No se encontro el usuario con ese numero.');
    } finally {
      setCargando(false);
    }
  }

  function handleConsultarOtro() {
    setRegistro(null);
    setNumeroBusqueda('');
    setError('');
    setGuardadoOk(false);
    setToastOpen(false);
  }

  function handleChange(name, value) {
    setRegistro((prev) => ({ ...(prev || {}), [name]: value }));
  }

  const habilitarPregunta35 = useMemo(() => {
    const v = String(registro?.['Procedencia de acumulación de penas'] ?? '').trim();
    return v === 'Sí';
  }, [registro]);

  const cierreRegla1Bloque3 = useMemo(() => {
    if (!registro) return false;

    const valores = [
      registro['Procedencia de libertad condicional'],
      registro['Procedencia de prisión domiciliaria de mitad de pena'],
      registro['Procedencia de utilidad pública (solo para mujeres)'],
      registro['Procedencia de pena cumplida'],
      registro['Procedencia de acumulación de penas'],
    ];

    return valores.some((v) => isEquivalenteNo(v));
  }, [registro]);

  const decisionUsuario = useMemo(() => String(registro?.['Decisión del usuario'] ?? '').trim(), [registro]);
  const decisionUsuarioDesbloquea = useMemo(
    () => decisionUsuario === 'Desea que el defensor(a) público(a) avance con la solicitud',
    [decisionUsuario]
  );
  const decisionUsuarioBloquea = useMemo(() => Boolean(decisionUsuario && !decisionUsuarioDesbloquea), [
    decisionUsuario,
    decisionUsuarioDesbloquea,
  ]);

  const actuacionAdelantar = useMemo(() => String(registro?.['Actuación a adelantar'] ?? '').trim(), [registro]);
  const actuacionBloqueaPorNinguna = useMemo(
    () => Boolean(actuacionAdelantar && actuacionAdelantar.startsWith('Ninguna')),
    [actuacionAdelantar]
  );

  const celesteSituacionActualizada = useMemo(() => {
    return String(
      registro?.['Situación Jurídica actualizada (de conformidad con la rama judicial)'] ?? ''
    )
      .trim()
      .toUpperCase();
  }, [registro]);

  const celesteEsCondenado = useMemo(() => celesteSituacionActualizada === 'CONDENADO', [celesteSituacionActualizada]);
  const celesteEsSindicado = useMemo(() => celesteSituacionActualizada === 'SINDICADO', [celesteSituacionActualizada]);

  const celesteCierrePorProcedencia21 = useMemo(() => {
    const procedencia = String(registro?.['PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS'] ?? '').trim();
    return (
      procedencia ===
      'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva (Se cierra el caso)'
    );
  }, [registro]);

  const cierreCeleste = useMemo(() => {
    if (!registro) return false;

    const procedencia = String(registro['PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS'] ?? '').trim();
    if (
      procedencia ===
      'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva (Se cierra el caso)'
    ) {
      return true;
    }

    const decision = String(registro['Decisión del usuario'] ?? '').trim();
    if (
      decision ===
      'Desea tramitar el trámite de levantamiento de detención preventiva a través de su defensor de confianza (Se cierra el caso)'
    ) {
      return true;
    }
    if (decision === 'No desea tramitar la solicitud') return true;

    const confirmacion = String(
      registro['CONFIRMACIÓN DE LA PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS'] ?? ''
    ).trim();
    if (
      confirmacion ===
      'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva (Se cierra el caso)'
    ) {
      return true;
    }

    const sentido = String(registro['SENTIDO DE LA DECISIÓN'] ?? '').trim();
    if (
      sentido === 'Concede levantamiento de medida de aseguramiento (Se cierra el caso)' ||
      sentido === 'Concede levantamiento de medida de aseguramiento'
    ) {
      return true;
    }

    const recurrio = String(registro['¿SE RECURRIÓ EN CASO DE DECISIÓN NEGATIVA?'] ?? '').trim();
    if (recurrio === 'No (Se cierra el caso)' || recurrio === 'No') {
      return true;
    }

    const sentidoRecurso = String(registro['SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO'] ?? '').trim();
    if (sentidoRecurso === 'Concede levantamiento de medida de aseguramiento (Se cierra el caso)') return true;
    if (sentidoRecurso === 'No concede levantamiento de medida de aseguramiento (Se cierra el caso)') return true;

    return false;
  }, [registro]);

  const saltoAuroraDesdeCeleste = useMemo(() => flow === 'sindicado' && celesteEsCondenado, [flow, celesteEsCondenado]);
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

  const casoCerrado = useMemo(() => {
    // BLOQUE 4
    if (auroraActivo && decisionUsuarioBloquea) return true;
    if (auroraActivo && actuacionBloqueaPorNinguna) return true;

    // BLOQUE 3 (Caso cerrado – Regla 1)
    if (auroraActivo && cierreRegla1Bloque3) return true;

    // BLOQUE 5A
    const cumpleMarginalidad = String(registro?.['Cumple el requisito de marginalidad'] ?? '').trim();
    const cumpleJefatura = String(registro?.['Cumple el requisito de jefatura de hogar'] ?? '').trim();
    if (auroraActivo && ACTUACIONES_UTILIDAD_PUBLICA.has(actuacionAdelantar)) {
      if (cumpleMarginalidad === 'No' || cumpleJefatura === 'No') return true;

      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return true;

      const sentidoResuelveRecurso = String(registro?.['Sentido de la decisión que resuelve recurso'] ?? '').trim();
      if (sentidoResuelveRecurso) return true;
    }

    // BLOQUE 5B
    if (auroraActivo && !ACTUACIONES_UTILIDAD_PUBLICA.has(actuacionAdelantar)) {
      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return true;

      const sentidoResuelveSolicitud = String(
        registro?.['Sentido de la decisión que resuelve la solicitud'] ?? ''
      ).trim();
      if (sentidoResuelveSolicitud) return true;
    }

    // CELESTE: opciones marcadas con “Se cierra el caso”
    if (flow === 'sindicado' && celesteEsSindicado && cierreCeleste) return true;

    return false;
  }, [
    registro,
    flow,
    actuacionAdelantar,
    decisionUsuarioBloquea,
    actuacionBloqueaPorNinguna,
    cierreRegla1Bloque3,
    cierreCeleste,
    auroraActivo,
    celesteEsSindicado,
  ]);

  const motivoCierre = useMemo(() => {
    if (!registro) return '';
    if (auroraActivo && cierreRegla1Bloque3) return 'Caso cerrado – Regla 1';
    if (auroraActivo && decisionUsuarioBloquea) return 'Caso cerrado';
    if (auroraActivo && actuacionBloqueaPorNinguna) return 'Caso cerrado';
    if (flow === 'sindicado' && celesteEsSindicado && cierreCeleste) return 'Caso cerrado';

    const cumpleMarginalidad = String(registro?.['Cumple el requisito de marginalidad'] ?? '').trim();
    const cumpleJefatura = String(registro?.['Cumple el requisito de jefatura de hogar'] ?? '').trim();
    if (auroraActivo && ACTUACIONES_UTILIDAD_PUBLICA.has(actuacionAdelantar)) {
      if (cumpleMarginalidad === 'No' || cumpleJefatura === 'No') return 'Caso cerrado';
      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return 'Caso cerrado';
      const sentidoResuelveRecurso = String(registro?.['Sentido de la decisión que resuelve recurso'] ?? '').trim();
      if (sentidoResuelveRecurso) return 'Caso cerrado';
    }

    if (auroraActivo && !ACTUACIONES_UTILIDAD_PUBLICA.has(actuacionAdelantar)) {
      const sePresentaRecurso = String(registro?.['Se presenta recurso'] ?? '').trim();
      if (sePresentaRecurso === 'No') return 'Caso cerrado';
      const sentidoResuelveSolicitud = String(
        registro?.['Sentido de la decisión que resuelve la solicitud'] ?? ''
      ).trim();
      if (sentidoResuelveSolicitud) return 'Caso cerrado';
    }

    return '';
  }, [
    registro,
    flow,
    actuacionAdelantar,
    cierreRegla1Bloque3,
    decisionUsuarioBloquea,
    actuacionBloqueaPorNinguna,
    cierreCeleste,
    auroraActivo,
    celesteEsSindicado,
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
      return { ...prev, 'Estado del caso': next };
    });
  }, [registro, casoCerrado]);

  useEffect(() => {
    if (!registro || !auroraActivo) return;
    const next = String(auroraRuleState?.derivedStatus || '').trim();
    if (!next) return;
    const current = String(registro['Estado del trámite'] ?? '').trim();
    if (current === next) return;
    setRegistro((prev) => {
      if (!prev) return prev;
      const cur = String(prev['Estado del trámite'] ?? '').trim();
      if (cur === next) return prev;
      return { ...prev, 'Estado del trámite': next };
    });
  }, [registro, auroraActivo, auroraRuleState]);

  useEffect(() => {
    if (!registro || !auroraActivo) return;
    if (!auroraRuleState?.locked) return;
    const reason = String(auroraRuleState.lockReason || 'El formulario está bloqueado por reglas de negocio.');
    setError(reason);
  }, [registro, auroraActivo, auroraRuleState]);

  useEffect(() => {
    if (!registro || flow !== 'sindicado') return;
    if (!celesteRuleState?.locked) return;
    const reason = String(celesteRuleState.lockReason || 'Se cierra el caso');
    setError(reason);
  }, [registro, flow, celesteRuleState]);

  useEffect(() => {
    // REGLA: P35 solo se habilita si P34 = "Sí". Si no, queda deshabilitada y vacía.
    if (habilitarPregunta35) return;
    setRegistro((prev) => {
      if (!prev) return prev;
      const current = String(prev['Con qué proceso(s) debe acumular penas (si aplica)'] ?? '');
      if (current === '') return prev;
      return { ...prev, 'Con qué proceso(s) debe acumular penas (si aplica)': '' };
    });
  }, [habilitarPregunta35]);

  const habilitarNegativaUtilidadPublica = useMemo(() => {
    const sentido = String(registro?.['Sentido de la decisión'] ?? '').trim();
    const sentidoResuelve = String(registro?.['Sentido de la decisión que resuelve recurso'] ?? '').trim();
    return sentido === 'Niega utilidad pública' || sentidoResuelve === 'Niega utilidad pública';
  }, [registro]);

  useEffect(() => {
    // DESBLOQUEOS CONDICIONALES 5A: si no aplica "Niega...", deshabilita y limpia 53-55 si existen.
    if (!registro) return;
    if (habilitarNegativaUtilidadPublica) return;

    const keys = ['Motivo de la decisión negativa', 'Se presenta recurso', 'Fecha de recurso en caso desfavorable'];
    setRegistro((prev) => {
      if (!prev) return prev;
      let changed = false;
      const next = { ...prev };
      for (const k of keys) {
        const cur = String(prev[k] ?? '');
        if (cur === '') continue;
        next[k] = '';
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [registro, habilitarNegativaUtilidadPublica]);

  const habilitarCelesteRecurso = useMemo(() => {
    const v = String(registro?.['¿SE RECURRIÓ EN CASO DE DECISIÓN NEGATIVA?'] ?? '').trim();
    return v === 'Sí';
  }, [registro]);

  useEffect(() => {
    // REGLA 6 (CELESTE): si 36 != "Sí", 37 y 38 quedan deshabilitadas y vacías.
    if (!registro) return;
    if (habilitarCelesteRecurso) return;
    setRegistro((prev) => {
      if (!prev) return prev;
      const keys = ['Fecha de presentación del recurso', 'SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO'];
      let changed = false;
      const next = { ...prev };
      for (const k of keys) {
        const cur = String(prev[k] ?? '');
        if (cur === '') continue;
        next[k] = '';
        changed = true;
      }
      return changed ? next : prev;
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
      await updatePpl(doc, { data: registro });
      setToastMessage('Aurora — Cambios guardados correctamente');
      setToastOpen(true);
      setGuardadoOk(true);
    } catch (e) {
      console.error(e);
      setError('Error al guardar el registro.');
    }
  }

  async function handleSaltoCelesteAAurora(nextSituacionActualizada) {
    const celesteEval = evaluateCelesteRules({
      answers: {
        ...(registro || {}),
        'Situación Jurídica actualizada (de conformidad con la rama judicial)': nextSituacionActualizada,
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
      // Evita bucle de redirección: no vuelve a guardar/redirigir. Solo navega a AURORA (BLOQUE 2).
      setRegistro((prev) => ({
        ...(prev || {}),
        redirectedToAurora: true,
        'Situación Jurídica': 'Condenado',
        'Situación Jurídica actualizada (de conformidad con la rama judicial)': 'CONDENADO',
      }));
      setAuroraAbrirBloque2(celesteEval.jumpPayload?.startBlock === 2);
      return;
    }

    if (saltoCelesteGuardando) return;

    const next = {
      ...(registro || {}),
      'Situación Jurídica actualizada (de conformidad con la rama judicial)': 'CONDENADO',
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
        'Situación Jurídica': 'Condenado',
        'Situación Jurídica actualizada (de conformidad con la rama judicial)': 'CONDENADO',
      });
      setAuroraAbrirBloque2(celesteEval.jumpPayload?.startBlock === 2);
    } catch (e) {
      console.error(e);
      setError('Error al guardar el formulario. No se redirigió a AURORA.');
    } finally {
      setSaltoCelesteGuardando(false);
    }
  }

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
      registro?.['Situación Jurídica actualizada (de conformidad con la rama judicial)'] ??
      registro?.['SituaciÃ³n JurÃ­dica actualizada (de conformidad con la rama judicial)'] ??
      '';
    handleSaltoCelesteAAurora(String(value));
  }, [registro, flow, celesteRuleState?.jumpToAurora]);

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

        <div className="search-row">
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

        {cargando && <p>Cargando informacion...</p>}
        {error && <p className="hint-text">{error}</p>}
      </div>

      {!cargando && registro && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 className="block-title">BLOQUE 1. Información de la persona privada de la libertad</h3>

          <div className="grid-2">
            <Campo label="1. Nombre" name="Nombre" value={registro['Nombre']} onChange={handleChange} />

            <Campo
              label="2. Tipo de indentificación"
              name="Tipo de indentificación"
              type="select"
              value={registro['Tipo de indentificación']}
              onChange={handleChange}
              options={OPCIONES_TIPO_IDENTIFICACION}
            />

            <Campo
              label="3. Número de identificación"
              name="Número de identificación"
              value={registro['Número de identificación']}
              onChange={handleChange}
              readOnly={Boolean(String(registro['Número de identificación'] ?? '').trim())}
            />

            <Campo
              label="4. Situación Jurídica"
              name="Situación Jurídica"
              type="select"
              value={registro['Situación Jurídica']}
              onChange={handleChange}
              options={OPCIONES_SITUACION_JURIDICA}
            />

            <Campo
              label="5. Género"
              name="Género"
              type="select"
              value={registro['Género']}
              onChange={handleChange}
              options={OPCIONES_GENERO_AURORA}
            />

            <Campo
              label="6. Enfoque Étnico/Racial/Cultural"
              name="Enfoque Étnico/Racial/Cultural"
              type="select"
              value={registro['Enfoque Étnico/Racial/Cultural']}
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
              label="10. Lugar de privación de la libertad"
              name="Lugar de privación de la libertad"
              type="select"
              value={registro['Lugar de privación de la libertad']}
              onChange={handleChange}
              options={OPCIONES_LUGAR_PRIVACION}
            />

            <Campo
              label="11. Nombre del lugar de privación de la libertad"
              name="Nombre del lugar de privación de la libertad"
              value={registro['Nombre del lugar de privación de la libertad']}
              onChange={handleChange}
            />

            <Campo
              label="12. Departamento del lugar de privación de la libertad"
              name="Departamento del lugar de privación de la libertad"
              value={registro['Departamento del lugar de privación de la libertad']}
              onChange={handleChange}
            />

            <Campo
              label="13. Distrito/municipio del lugar de privación de la libertad"
              name="Distrito/municipio del lugar de privación de la libertad"
              value={registro['Distrito/municipio del lugar de privación de la libertad']}
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
                  BLOQUE 2 (AURORA) — Información del proceso SISIPEC
                </h3>
                <div className="grid-2">
                <Campo
                  label="14. Autoridad a cargo"
                  name="Autoridad a cargo"
                  value={registro['Autoridad a cargo']}
                  onChange={handleChange}
                />
                <Campo
                  label="15. Número de proceso"
                  name="Número de proceso"
                  value={registro['Número de proceso']}
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
                  label="18. Pena (años, meses y días)"
                  name="Pena (años, meses y días)"
                  value={registro['Pena (años, meses y días)']}
                  onChange={handleChange}
                />
                <Campo
                  label="19. Pena total en días"
                  name="Pena total en días"
                  type="number"
                  value={registro['Pena total en días']}
                  onChange={handleChange}
                />
                <Campo
                  label="20. Tiempo que la persona lleva privada de la libertad (en días)"
                  name="Tiempo que la persona lleva privada de la libertad (en días)"
                  type="number"
                  value={registro['Tiempo que la persona lleva privada de la libertad (en días)']}
                  onChange={handleChange}
                />
                <Campo
                  label="21. Redención total acumulada en días"
                  name="Redención total acumulada en días"
                  type="number"
                  value={registro['Redención total acumulada en días']}
                  onChange={handleChange}
                />
                <Campo
                  label="22. Tiempo efectivo de pena cumplida en días (teniendo en cuenta la redención)"
                  name="Tiempo efectivo de pena cumplida en días (teniendo en cuenta la redención)"
                  type="number"
                  value={registro['Tiempo efectivo de pena cumplida en días (teniendo en cuenta la redención)']}
                  onChange={handleChange}
                />
                <Campo
                  label="23. Porcentaje de avance de pena cumplida"
                  name="Porcentaje de avance de pena cumplida"
                  value={registro['Porcentaje de avance de pena cumplida']}
                  onChange={handleChange}
                />
                <Campo
                  label="24. Fase de tramiento"
                  name="Fase de tramiento"
                  type="select"
                  value={registro['Fase de tramiento']}
                  onChange={handleChange}
                  options={OPCIONES_FASE_TRATAMIENTO}
                />
                <Campo
                  label="25. ¿Cuenta con requerimientos judiciales por otros procesos?"
                  name="¿ Cuenta con requerimientos judiciales por otros procesos ?"
                  type="select"
                  value={registro['¿ Cuenta con requerimientos judiciales por otros procesos ?']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                />
                <Campo
                  label="26. Fecha última calificación"
                  name="Fecha última calificación"
                  type="date"
                  value={registro['Fecha última calificación']}
                  onChange={handleChange}
                />
                <Campo
                  label="27. Calificación de conducta"
                  name="Calificación de conducta"
                  type="select"
                  value={registro['Calificación de conducta']}
                  onChange={handleChange}
                  options={OPCIONES_CALIFICACION_CONDUCTA}
                />
              </div>
                </>
              )}

              {auroraVisibleBlocks.has('bloque3') && (
                <>
                <h3 className="block-title">BLOQUE 3 — Análisis jurídico</h3>
                <div className="grid-2">
                <Campo
                  label="28. Defensor(a) público(a) asignado para tramitar la solicitud"
                  name="Defensor(a) Público(a) Asignado para tramitar la solicitud"
                  value={registro['Defensor(a) Público(a) Asignado para tramitar la solicitud']}
                  onChange={handleChange}
                />

                <Campo
                  label="29. Fecha de análisis jurídico del caso"
                  name="Fecha de análisis jurídico del caso"
                  type="date"
                  value={registro['Fecha de análisis jurídico del caso']}
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
                  label="31. Procedencia de prisión domiciliaria de mitad de pena"
                  name="Procedencia de prisión domiciliaria de mitad de pena"
                  type="select"
                  value={registro['Procedencia de prisión domiciliaria de mitad de pena']}
                  onChange={handleChange}
                  options={OPCIONES_PROCEDENCIA_PRISION_DOMICILIARIA}
                />

                <Campo
                  label="32. Procedencia de utilidad pública (solo para mujeres)"
                  name="Procedencia de utilidad pública (solo para mujeres)"
                  type="select"
                  value={registro['Procedencia de utilidad pública (solo para mujeres)']}
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
                  label="34. Procedencia de acumulación de penas"
                  name="Procedencia de acumulación de penas"
                  type="select"
                  value={registro['Procedencia de acumulación de penas']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                />

                <Campo
                  label="35. Con qué proceso(s) debe acumular penas (si aplica)"
                  name="Con qué proceso(s) debe acumular penas (si aplica)"
                  value={registro['Con qué proceso(s) debe acumular penas (si aplica)']}
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
                  label="37. Resumen del análisis del caso"
                  name="Resumen del análisis del caso"
                  type="textarea"
                  value={registro['Resumen del análisis del caso']}
                  onChange={handleChange}
                />

                {motivoCierre && (
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <p className="hint-text">{motivoCierre}</p>
                  </div>
                )}
              </div>
                </>
              )}

              {auroraVisibleBlocks.has('bloque4') && (
                <>
                <h3 className="block-title">BLOQUE 4 — Entrevista con el usuario</h3>
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
                  label="39. Decisión del usuario"
                  name="Decisión del usuario"
                  type="select"
                  value={registro['Decisión del usuario']}
                  onChange={handleChange}
                  options={OPCIONES_AURORA_DECISION_USUARIO}
                  disabled={cierreRegla1Bloque3}
                />

                <Campo
                  label="40. Actuación a adelantar"
                  name="Actuación a adelantar"
                  type="select"
                  value={registro['Actuación a adelantar']}
                  onChange={handleChange}
                  options={OPCIONES_AURORA_ACTUACION_A_ADELANTAR}
                  disabled={cierreRegla1Bloque3 || decisionUsuarioBloquea}
                />

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
                      El resto del formulario está bloqueado por la selección en “Decisión del usuario”.
                    </p>
                  </div>
                )}
              </div>
                </>
              )}

              {auroraRuleState?.locked && (
                <div className="form-field" style={{ marginTop: '0.35rem' }}>
                  <p className="hint-text">{auroraRuleState.lockReason || 'Formulario bloqueado por reglas de negocio.'}</p>
                </div>
              )}

              {auroraVisibleBlocks.has('bloque5UtilidadPublica') || auroraVisibleBlocks.has('bloque5TramiteNormal') ? (() => {
                const act = actuacionAdelantar;
                const show5A =
                  auroraVisibleBlocks.has('bloque5UtilidadPublica') ||
                  (auroraRuleState?.blockVariants?.bloque5 === 'utilidadPublica');
                const show5B =
                  auroraVisibleBlocks.has('bloque5TramiteNormal') ||
                  (!show5A && auroraRuleState?.blockVariants?.bloque5 !== 'utilidadPublica');

                const bloquearBloque5 = cierreRegla1Bloque3 || decisionUsuarioBloquea || actuacionBloqueaPorNinguna;

                const requiereMisionTrabajo = String(registro?.['Se requiere misión de trabajo'] ?? '').trim();
                const deshabilitarMision = requiereMisionTrabajo === 'No';

                return (
                  <>
                    {show5A && (
                      <>
                        <h3 className="block-title">BLOQUE 5A — Utilidad pública</h3>
                        <div className="grid-2">
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
                            label="46. Se requiere misión de trabajo"
                            name="Se requiere misión de trabajo"
                            type="select"
                            value={registro['Se requiere misión de trabajo']}
                            onChange={handleChange}
                            options={OPCIONES_SI_NO}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="47. Fecha de solicitud de misión de trabajo"
                            name="Fecha de solicitud de misión de trabajo"
                            type="date"
                            value={registro['Fecha de solicitud de misión de trabajo']}
                            onChange={handleChange}
                            required={false}
                            disabled={isAuroraFieldDisabled('Fecha de solicitud de misión de trabajo', bloquearBloque5 || deshabilitarMision)}
                          />
                          <Campo
                            label="48. Fecha de asignación de investigador"
                            name="Fecha de asignación de investigador"
                            type="date"
                            value={registro['Fecha de asignación de investigador']}
                            onChange={handleChange}
                            required={false}
                            disabled={isAuroraFieldDisabled('Fecha de asignación de investigador', bloquearBloque5 || deshabilitarMision)}
                          />
                          <Campo
                            label="52. Sentido de la decisión"
                            name="Sentido de la decisión"
                            type="select"
                            value={registro['Sentido de la decisión']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5A_SENTIDO_DECISION}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="53. Motivo de la decisión negativa"
                            name="Motivo de la decisión negativa"
                            type="select"
                            value={registro['Motivo de la decisión negativa']}
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
                              String(registro?.['Se presenta recurso'] ?? '').trim() !== 'Sí'
                            }
                          />
                          <Campo
                            label="56. Sentido de la decisión que resuelve el recurso"
                            name="Sentido de la decisión que resuelve recurso"
                            type="select"
                            value={registro['Sentido de la decisión que resuelve recurso']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5A_SENTIDO_DECISION_RESUELVE_RECURSO}
                            required={false}
                            disabled={bloquearBloque5 || String(registro?.['Se presenta recurso'] ?? '').trim() !== 'Sí'}
                          />
                        </div>
                      </>
                    )}

                    {show5B && (
                      <>
                        <h3 className="block-title">BLOQUE 5B — Trámite de la solicitud</h3>
                        <div className="grid-2">
                          <Campo
                            label="Fecha de presentación de solicitud a la autoridad"
                            name="Fecha de presentación de solicitud a la autoridad"
                            type="date"
                            value={registro['Fecha de presentación de solicitud a la autoridad']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="Fecha de decisión de la autoridad"
                            name="Fecha de decisión de la autoridad"
                            type="date"
                            value={registro['Fecha de decisión de la autoridad']}
                            onChange={handleChange}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="Sentido de la decisión"
                            name="Sentido de la decisión"
                            type="select"
                            value={registro['Sentido de la decisión']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5B_SENTIDO_DECISION}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="Motivo de la decisión negativa"
                            name="Motivo de la decisión negativa"
                            type="select"
                            value={registro['Motivo de la decisión negativa']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5B_MOTIVO_DECISION_NEGATIVA}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="Sentido de la decisión que resuelve la solicitud"
                            name="Sentido de la decisión que resuelve la solicitud"
                            type="select"
                            value={registro['Sentido de la decisión que resuelve la solicitud']}
                            onChange={handleChange}
                            options={OPCIONES_BLOQUE_5B_SENTIDO_DECISION_RESUELVE_SOLICITUD}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="Se presenta recurso"
                            name="Se presenta recurso"
                            type="select"
                            value={registro['Se presenta recurso']}
                            onChange={handleChange}
                            options={OPCIONES_SI_NO}
                            required={false}
                            disabled={bloquearBloque5}
                          />
                          <Campo
                            label="Fecha de recurso en caso desfavorable"
                            name="Fecha de recurso en caso desfavorable"
                            type="date"
                            value={registro['Fecha de recurso en caso desfavorable']}
                            onChange={handleChange}
                            required={false}
                            disabled={
                              bloquearBloque5 || String(registro?.['Se presenta recurso'] ?? '').trim() !== 'Sí'
                            }
                          />
                          <Campo
                            label="Sentido de la decisión que resuelve recurso"
                            name="Sentido de la decisión que resuelve recurso"
                            value={registro['Sentido de la decisión que resuelve recurso']}
                            onChange={handleChange}
                            required={false}
                            disabled={
                              bloquearBloque5 || String(registro?.['Se presenta recurso'] ?? '').trim() !== 'Sí'
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
                  <h3 className="block-title">
                    BLOQUE 2 (CELESTE) — Etapa pre-visita al CDT: Análisis jurídico con datos disponibles en Rama Judicial
                  </h3>

                  <div className="grid-2">
                <Campo
                  label="14. AUTORIDAD JUDICIAL A CARGO"
                  name="Autoridad a cargo"
                  value={registro['Autoridad a cargo']}
                  onChange={handleChange}
                  required={false}
                />

                <Campo
                  label="15. NÚMERO DE PROCESO (VALIDAR CON RAMA JUDICIAL Y EDITAR SI ES DEL CASO)"
                  name="Número de proceso"
                  value={registro['Número de proceso']}
                  onChange={handleChange}
                  required={false}
                />

                <Campo
                  label="16. DELITOS (VALIDAR CON RAMA JUDICIAL/EXPEDIENTE Y EDITAR SI ES DEL CASO)"
                  name="Delitos"
                  type="textarea"
                  value={registro['Delitos']}
                  onChange={handleChange}
                  required={false}
                />

                <Campo
                  label="17. SITUACIÓN JURÍDICA ACTUALIZADA (DE CONFORMIDAD CON RAMA JUDICIAL)"
                  name="Situación Jurídica actualizada (de conformidad con la rama judicial)"
                  type="select"
                  value={registro['Situación Jurídica actualizada (de conformidad con la rama judicial)']}
                  onChange={handleChange}
                  options={OPCIONES_SITUACION_JURIDICA_ACTUALIZADA}
                  required={false}
                  disabled={saltoCelesteGuardando}
                />

                <Campo
                  label="18. FECHA DE CAPTURA"
                  name="Fecha de captura"
                  type="date"
                  value={registro['Fecha de captura']}
                  onChange={handleChange}
                  required={false}
                />

                <Campo
                  label="19. TIEMPO QUE LA PERSONA LLEVA PRIVADA DE LA LIBERTAD (EN MESES)"
                  name="TIEMPO QUE LA PERSONA LLEVA PRIVADA DE LA LIBERTAD (EN MESES)"
                  type="number"
                  value={tiempoPrivacionMeses}
                  onChange={handleChange}
                  readOnly
                  required={false}
                />

                <Campo
                  label="20. FECHA DE ANÁLISIS JURÍDICO DEL CASO"
                  name="Fecha de análisis jurídico del caso"
                  type="date"
                  value={registro['Fecha de análisis jurídico del caso']}
                  onChange={handleChange}
                  required={false}
                />

                <Campo
                  label="21. PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS"
                  name="PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS"
                  type="select"
                  value={registro['PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS']}
                  onChange={handleChange}
                  options={OPCIONES_PROCEDENCIA_VENCIMIENTO_TERMINOS}
                  required={false}
                />

                <Campo
                  label="22. ¿REQUIERE ATENCIÓN MÉDICA PERMANENTE?"
                  name="¿REQUIERE ATENCIÓN MÉDICA PERMANENTE?"
                  type="select"
                  value={registro['¿REQUIERE ATENCIÓN MÉDICA PERMANENTE?']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                  required={false}
                />

                <Campo
                  label="23. ¿ESTÁ EN ESTADO DE GESTACIÓN?"
                  name="¿ESTÁ EN ESTADO DE GESTACIÓN?"
                  type="select"
                  value={registro['¿ESTÁ EN ESTADO DE GESTACIÓN?']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                  required={false}
                />

                <Campo
                  label="24. ¿ES MUJER CABEZA DE FAMILIA?"
                  name="¿ES MUJER CABEZA DE FAMILIA?"
                  type="select"
                  value={registro['¿ES MUJER CABEZA DE FAMILIA?']}
                  onChange={handleChange}
                  options={OPCIONES_SI_NO}
                  required={false}
                />
                  </div>
                </>
              )}

              {saltoAuroraDesdeCeleste && (
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <p className="hint-text">
                    Guardando el formulario y redirigiendo automáticamente a AURORA...
                  </p>
                </div>
              )}

              {celesteRuleState?.locked && (
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <p className="hint-text">{celesteRuleState.lockReason || 'Se cierra el caso'}</p>
                </div>
              )}

              {celesteEsSindicado && celesteVisibleBlocks.has('bloque3Celeste') && (
                <>
                  <h3 className="block-title">
                    BLOQUE 3 — Etapa durante la visita al CDT: Entrevista con el usuario sobre solicitud de vencimiento
                    de términos si aplica
                  </h3>

                  <div className="grid-2">
                    <Campo
                      label="25. Defensor(a) público(a) asignado para tramitar la solicitud"
                      name="Defensor(a) Público(a) Asignado para tramitar la solicitud"
                      value={registro['Defensor(a) Público(a) Asignado para tramitar la solicitud']}
                      onChange={handleChange}
                      required={false}
                      disabled={celesteCierrePorProcedencia21}
                    />

                    <Campo
                      label="26. FECHA DE LA ENTREVISTA"
                      name="Fecha de entrevista"
                      type="date"
                      value={registro['Fecha de entrevista']}
                      onChange={handleChange}
                      required={false}
                      disabled={celesteCierrePorProcedencia21}
                    />

                    <Campo
                      label="27. DECISIÓN DEL USUARIO"
                      name="Decisión del usuario"
                      type="select"
                      value={registro['Decisión del usuario']}
                      onChange={handleChange}
                      options={OPCIONES_CELESTE_DECISION_USUARIO}
                      required={false}
                      disabled={celesteCierrePorProcedencia21}
                    />

                    <Campo
                      label="28. PODER EN CASO DE AVANZAR CON LA SOLICITUD"
                      name="Poder en caso de avanzar con la solicitud"
                      type="select"
                      value={registro['Poder en caso de avanzar con la solicitud']}
                      onChange={handleChange}
                      options={OPCIONES_PODER}
                      required={false}
                      disabled={celesteCierrePorProcedencia21}
                    />

                    <Campo
                      label="29. RESUMEN DEL ANÁLISIS JURÍDICO DEL PRESENTE CASO"
                      name="RESUMEN DEL ANÁLISIS JURÍDICO DEL PRESENTE CASO"
                      type="textarea"
                      value={registro['RESUMEN DEL ANÁLISIS JURÍDICO DEL PRESENTE CASO']}
                      onChange={handleChange}
                      required={false}
                      disabled={celesteCierrePorProcedencia21}
                    />
                  </div>

                  {/* Regla 7: Bloque 4 solo se muestra si NO está cerrado */}
                  {!celesteRuleState?.locked && celesteVisibleBlocks.has('bloque4Celeste') && (
                    <>
                      <h3 className="block-title">
                        BLOQUE 4 — Etapa post-visita al CDT: Trámite de la solicitud de vencimiento de términos si aplica
                      </h3>

                      <div className="grid-2">
                        <Campo
                          label="30. FECHA DE REVISIÓN DEL EXPEDIENTE Y ELEMENTOS MATERIALES PROBATORIOS"
                          name="FECHA DE REVISIÓN DEL EXPEDIENTE Y ELEMENTOS MATERIALES PROBATORIOS"
                          type="date"
                          value={registro['FECHA DE REVISIÓN DEL EXPEDIENTE Y ELEMENTOS MATERIALES PROBATORIOS']}
                          onChange={handleChange}
                          required={false}
                        />

                        <Campo
                          label="31. CONFIRMACIÓN DE LA PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS"
                          name="CONFIRMACIÓN DE LA PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS"
                          type="select"
                          value={registro['CONFIRMACIÓN DE LA PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS']}
                          onChange={handleChange}
                          options={OPCIONES_CONFIRMACION_PROCEDENCIA_VENCIMIENTO}
                          required={false}
                        />

                        <Campo
                          label="32. FECHA DE SOLICITUD DE AUDIENCIA DE CONTROL DE GARANTÍAS PARA SUSTENTAR REVOCATORIA"
                          name="FECHA DE SOLICITUD DE AUDIENCIA DE CONTROL DE GARANTÍAS PARA SUSTENTAR REVOCATORIA"
                          type="date"
                          value={
                            registro['FECHA DE SOLICITUD DE AUDIENCIA DE CONTROL DE GARANTÍAS PARA SUSTENTAR REVOCATORIA']
                          }
                          onChange={handleChange}
                          required={false}
                        />

                        <Campo
                          label="33. FECHA DE REALIZACIÓN DE AUDIENCIA"
                          name="FECHA DE REALIZACIÓN DE AUDIENCIA"
                          type="date"
                          value={registro['FECHA DE REALIZACIÓN DE AUDIENCIA']}
                          onChange={handleChange}
                          required={false}
                        />

                        <Campo
                          label="34. SENTIDO DE LA DECISIÓN"
                          name="SENTIDO DE LA DECISIÓN"
                          type="select"
                          value={registro['SENTIDO DE LA DECISIÓN']}
                          onChange={handleChange}
                          options={OPCIONES_SENTIDO_DECISION_CELESTE}
                          required={false}
                        />

                        <Campo
                          label="35. MOTIVO DE LA DECISIÓN NEGATIVA"
                          name="MOTIVO DE LA DECISIÓN NEGATIVA"
                          type="select"
                          value={registro['MOTIVO DE LA DECISIÓN NEGATIVA']}
                          onChange={handleChange}
                          options={OPCIONES_MOTIVO_DECISION_NEGATIVA_CELESTE}
                          required={false}
                        />

                        <Campo
                          label="36. ¿SE RECURRIÓ EN CASO DE DECISIÓN NEGATIVA?"
                          name="¿SE RECURRIÓ EN CASO DE DECISIÓN NEGATIVA?"
                          type="select"
                          value={registro['¿SE RECURRIÓ EN CASO DE DECISIÓN NEGATIVA?']}
                          onChange={handleChange}
                          options={['Sí', 'No (Se cierra el caso)']}
                          required={false}
                        />

                        <Campo
                          label="37. Fecha de presentación del recurso"
                          name="Fecha de presentación del recurso"
                          type="date"
                          value={registro['Fecha de presentación del recurso']}
                          onChange={handleChange}
                          required={false}
                          disabled={!habilitarCelesteRecurso}
                        />

                        <Campo
                          label="38. SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO"
                          name="SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO"
                          type="select"
                          value={registro['SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO']}
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
  );
}
