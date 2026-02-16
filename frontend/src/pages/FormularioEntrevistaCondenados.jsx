import { useEffect, useMemo, useState } from 'react';
import { getPplByDocumento, updatePpl } from '../services/api.js';
import Toast from '../components/Toast.jsx';
import { pickActiveCase } from '../utils/entrevistaEstado.js';

const OPCIONES_GENERO = [
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

const OPCIONES_FASE_TRATAMIENTO = [
  'Observación',
  'Alta',
  'Mediana',
  'Mínima',
  'Confianza',
  'No reporta',
];

const OPCIONES_SITUACION_JURIDICA = ['Condenado', 'Sindicado'];

const OPCIONES_CALIFICACION_CONDUCTA = [
  'Ejemplar',
  'Excelente',
  'Buena',
  'Regular',
  'Mala',
  'Pendiente',
  'Sin registro',
];

const OPCIONES_SI_NO = ['Sí', 'No'];
const OPCIONES_SI_NO_MAYUS = ['SÍ', 'NO'];
const OPCIONES_LUGAR_PRIVACION = ['CDT', 'ERON'];

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

const OPCIONES_OTRAS_SOLICITUDES = [
  'Ninguna',
  'Solicitud de actualización de conducta',
  'Solicitud de asginación de JEPMS',
  'Solicitud de traslado del proceso al distrito judicial correspondiente',
  'Solicitud de actualización de cartilla biográfica',
  'Solicitud de redención de pena 2x3 trabajo',
  'Solicitud de redención de pena 2x3 analógica en actividades distintas a trabajo',
  'Permiso de 72 horas',
  'Otra',
];

const OPCIONES_DECISION_USUARIO = [
  'Desea que el defensor(a) público(a) avance con la solicitud',
  'Tiene abogado de confianza, pero desea que la defensoría pública lo asesore en la solicitud',
  'Desea tramitar la solicitud a través de su defensor de confianza',
  'No desea tramitar la solicitud',
  'No avanzará porque no puede demostar arraigo fuera de prisión',
  'El usuario no pudo ser atendido porque no asistió a la entrevista',
];

const OPCIONES_ACTUACION_A_ADELANTAR = [
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

const OPCIONES_PODER = ['Sí se requiere', 'Ya se cuenta con poder'];

const OPCIONES_SENTIDO_DECISION = ['Concede solicitud', 'No concede solicitud'];

const OPCIONES_MOTIVO_DECISION_NEGATIVA = [
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
  'Porque la persona no tiene un lugar al que ir por fuera de prisión (no tiene arraigo)',
  'Porque no cumple requisito de jefatura de hogar para utilidad pública',
  'Porque no cumple requisito de marginalidad para utilidad pública',
  'Se consideró que no cumple algún requisito para su procedencia',
];

const OPCIONES_SENTIDO_DECISION_RECURSO = ['Concede subrogado penal', 'No concede subrogado penal'];

const OPCIONES_TIPO_SOLICITUD_TRAMITAR = [
  'Solicitud de actualización de conducta',
  'Solicitud de asignación de jepms',
  'Solicitud de traslado del proceso al circuito judicial correspondiente',
  'Solicitud de actualización de cartilla biográfica',
];

const OPCIONES_SENTIDO_DECISION_RESUELVE_SOLICITUD = ['Favorable', 'Desfavorable'];

function Campo({
  label,
  name,
  type = 'text',
  value,
  onChange,
  options,
  readOnly = false,
  disabled = false,
}) {
  const isDisabled = Boolean(disabled || readOnly);

  if (type === 'select') {
    return (
      <div className={`form-field${isDisabled ? ' is-disabled' : ''}`}>
        <label>{label}</label>
        <select
          name={name}
          value={value ?? '-'}
          onChange={(e) => onChange(name, e.target.value)}
          disabled={isDisabled}
        >
          {(options || ['-']).map((opt) => (
            <option key={String(opt)} value={opt}>
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
      />
    </div>
  );
}

function toNumberOrNull(x) {
  const raw = String(x ?? '').trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(/,/g, '.');

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function BarraProgreso({ porcentaje }) {
  const pct = typeof porcentaje === 'number' ? porcentaje : null;
  const fill = pct == null ? 0 : Math.max(0, Math.min(100, pct));

  return (
    <div className="progress-wrap">
      <div className="progress-label">{pct == null ? '-' : `${pct} %`}</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

function FormularioEntrevista({
  numeroInicial,
  registroInicial = null,
  caseIdInicial = '',
  caseDataInicial = null,
  mostrarBuscador = true,
  mostrarBotonConsultarOtro = true,
  onGuardarExitoso,
  onConsultarOtro,
}) {
  const [numeroBusqueda, setNumeroBusqueda] = useState(numeroInicial || '');
  const [caseId, setCaseId] = useState(caseIdInicial || '');
  const [registro, setRegistro] = useState(caseDataInicial || registroInicial);
  const [cargando, setCargando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [error, setError] = useState('');
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    if (caseDataInicial || registroInicial) {
      setRegistro(caseDataInicial || registroInicial);
      setCaseId(caseIdInicial || '');
      setGuardadoOk(false);
      setError('');
      setToastOpen(false);
      return;
    }

    if (numeroInicial && mostrarBuscador) {
      buscarRegistro(numeroInicial);
    }
  }, [numeroInicial, registroInicial, caseDataInicial, caseIdInicial, mostrarBuscador]);

  async function buscarRegistro(numero) {
    const doc = String(numero || '').trim();
    if (!doc) {
      setError('Ingrese un número de identificación.');
      return;
    }
    setCargando(true);
    setGuardadoOk(false);
    setError('');
    setToastOpen(false);
    try {
      const data = await getPplByDocumento(doc);
      const ppl = data?.registro || null;
      const active = pickActiveCase(ppl);
      setCaseId(String(active?.caseId || ppl?.activeCaseId || '').trim());
      setRegistro(active?.data || null);
    } catch (err) {
      console.error(err);
      setError('No se encontró el usuario con ese número.');
      setRegistro(null);
    } finally {
      setCargando(false);
    }
  }

  function handleChange(name, value) {
    // Campo unificado: 58 - Motivo de la decisión negativa (se guarda en ambas columnas del CSV si existen)
    if (name === 'motivoDecisionNegativaUnificado') {
      setRegistro((prev) => {
        const next = { ...(prev || {}) };
        next.motivoDecisionNegativaUnificado = value;
        next['Motivo de la decisión negativa (Libertad condicional si aplica)'] = value;
        next['Motivo de la decisión negativa (Prisión domiciliaria si aplica)'] = value;
        return next;
      });
      return;
    }

    setRegistro((prev) => ({ ...(prev || {}), [name]: value }));
  }

  const porcentajeAvance = useMemo(() => {
    if (!registro) return null;

    const penaTotal = toNumberOrNull(registro['Pena total en días']);
    const tiempoEfectivo = toNumberOrNull(registro['Tiempo efectivo con redención']);

    if (penaTotal && tiempoEfectivo) {
      const pct = Math.round((tiempoEfectivo / penaTotal) * 100);
      return Number.isFinite(pct) ? pct : null;
    }

    const pctStr = String(registro['% de avance de pena cumplida'] || '').trim();
    const pct = toNumberOrNull(pctStr);
    return pct == null ? null : Math.round(pct);
  }, [registro]);

  const decisionUsuario = String(registro?.['Decisión del usuario'] ?? '-');
  const actuacionAdelantar = String(registro?.actuacionJudicialAdelantar ?? '-');
  const sentidoDecision = String(registro?.['Sentido de la decisión'] ?? '-');
  const otrasSolicitudes = String(registro?.['Otras solicitudes a tramitar'] ?? '-');
  const procedenciaAcumulacionPenas = String(registro?.['Procedencia de acumulación de penas'] ?? '-');

  const esActuacionUtilidadPublica = ACTUACIONES_UTILIDAD_PUBLICA.has(actuacionAdelantar);
  const habilitarPregunta35 = procedenciaAcumulacionPenas.trim() === 'Sí';

  const decisionUsuarioDesbloquea = [
    'Desea que el defensor(a) público(a) avance con la solicitud',
    'Tiene abogado de confianza, pero desea que la defensoría pública lo asesore en la solicitud',
    'Desea tramitar la solicitud a través de su defensor de confianza',
  ].includes(decisionUsuario);

  const decisionUsuarioBloquea = [
    'No desea tramitar la solicitud',
    'No avanzará porque no puede demostar arraigo fuera de prisión',
    'El usuario no pudo ser atendido porque no asistió a la entrevista',
  ].includes(decisionUsuario);

  // Regla: 39- Decisión del usuario (Excel: 30) desbloquea o bloquea el resto del formulario.
  const habilitarBloquesPosteriores = decisionUsuarioDesbloquea && !decisionUsuarioBloquea;

  const actuacionBloquea = actuacionAdelantar.startsWith('Ninguna');
  // Regla: 40- Actuación judicial a adelantar habilita el bloque siguiente; "Ninguna..." bloquea el resto.
  const habilitarBloque5 =
    habilitarBloquesPosteriores &&
    Boolean(actuacionAdelantar && actuacionAdelantar !== '-' && !actuacionBloquea);

  const habilitarUtilidadPublica = habilitarBloque5 && esActuacionUtilidadPublica;

  const habilitarNegativa = habilitarBloque5 && sentidoDecision === 'No concede solicitud';
  // Regla: 57- Sentido de la decisión desbloquea 3 preguntas siguientes (58-60) si es "No concede solicitud".

  useEffect(() => {
    // Regla de activación: P35 solo aplica si P34 = "Sí". Si no, queda deshabilitada y vacía.
    if (habilitarPregunta35) return;
    setRegistro((prev) => {
      if (!prev) return prev;
      const current = String(prev['Con qué proceso(s) debe acumular penas (si aplica)'] ?? '');
      if (current === '') return prev;
      return { ...prev, 'Con qué proceso(s) debe acumular penas (si aplica)': '' };
    });
  }, [habilitarPregunta35]);

  const motivoDecisionNegativaUnificado =
    registro?.motivoDecisionNegativaUnificado ||
    registro?.['Motivo de la decisión negativa (Libertad condicional si aplica)'] ||
    registro?.['Motivo de la decisión negativa (Prisión domiciliaria si aplica)'] ||
    '-';

  async function handleGuardar() {
    if (!registro?.numeroIdentificacion) {
      setError('Debe cargar un usuario antes de guardar.');
      return;
    }
    try {
      setError('');
      setToastOpen(false);
      const payload = { ...(registro || {}) };
      if (payload['% de avance de pena cumplida'] !== undefined && porcentajeAvance != null) {
        payload['% de avance de pena cumplida'] = `${porcentajeAvance}%`;
      }
      await updatePpl(registro.numeroIdentificacion, { caseId, data: payload });
      setToastOpen(true);
      setGuardadoOk(true);
      if (typeof onGuardarExitoso === 'function') onGuardarExitoso();
    } catch (err) {
      console.error(err);
      setError('Error al guardar el registro.');
    }
  }

  function handleConsultarOtro() {
    if (typeof onConsultarOtro === 'function') {
      onConsultarOtro();
      return;
    }
    setRegistro(null);
    setNumeroBusqueda('');
    setGuardadoOk(false);
  }

  return (
    <div className="card">
      <h2>Buscar Usuario</h2>

      <Toast
        open={toastOpen}
        message="Aurora — Cambios guardados correctamente"
        durationMs={3000}
        placement="center"
        emphasis
        onClose={() => setToastOpen(false)}
      />

      {error && <p className="hint-text">{error}</p>}

      {mostrarBuscador && (
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
            onClick={() => buscarRegistro(numeroBusqueda)}
          >
            Buscar en Base de Datos
          </button>
        </div>
      )}

      {cargando && <p>Cargando información...</p>}

      {!cargando && registro && (
        <>
          <h3 className="block-title">BLOQUE 1. Información de la persona privada de la libertad</h3>

          <div className="grid-2">
            <Campo label="1. Nombre" name="Nombre usuario" value={registro['Nombre usuario']} onChange={handleChange} />

            <Campo
              label="2. Tipo de indentificación"
              name="tipoIdentificacion"
              value={registro.tipoIdentificacion}
              onChange={handleChange}
            />

            {/* Regla: número de documento/cédula NO editable */}
            <Campo
              label="3. Número de identificación"
              name="numeroIdentificacion"
              value={registro.numeroIdentificacion}
              onChange={handleChange}
              readOnly
            />

            <Campo
              label="4. Situación Jurídica"
              name="Situación jurídica "
              type="select"
              value={registro['Situación jurídica '] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_SITUACION_JURIDICA]}
            />

            <Campo
              label="5. Género"
              name="Género"
              type="select"
              value={registro['Género'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_GENERO]}
            />

            <Campo
              label="6. Enfoque Étnico/Racial/Cultural"
              name="Condición especial"
              type="select"
              value={registro['Condición especial'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_ENFOQUE_ETNICO]}
            />

            <Campo label="7. Nacionalidad" name="nacionalidad" value={registro.nacionalidad} onChange={handleChange} />

            <Campo
              label="8. Fecha de nacimiento"
              name="Fecha de nacimiento"
              type="date"
              value={registro['Fecha de nacimiento']}
              onChange={handleChange}
            />

            <Campo label="9. Edad" name="edad" type="number" value={registro.edad} onChange={handleChange} />

            <Campo
              label="10. Lugar de privación de la libertad"
              name="lugarPrivacionLibertad"
              type="select"
              value={registro.lugarPrivacionLibertad ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_LUGAR_PRIVACION]}
            />

            <Campo
              label="11. Nombre del lugar de privación de la libertad"
              name="Establecimiento"
              value={registro.Establecimiento}
              onChange={handleChange}
            />

            <Campo
              label="12. Departamento del lugar de privación de la libertad"
              name="Departamento del lugar de reclusión"
              value={registro['Departamento del lugar de reclusión']}
              onChange={handleChange}
            />

            <Campo
              label="13. Distrito/municipio del lugar de privación de la libertad"
              name="Municipio del lugar de reclusión"
              value={registro['Municipio del lugar de reclusión']}
              onChange={handleChange}
            />
          </div>

          <h3 className="block-title">BLOQUE 2. Información del proceso</h3>

          <div className="grid-2">
            <Campo
              label="14. Autoridad a cargo"
              name="Autoridad a cargo"
              value={registro['Autoridad a cargo']}
              onChange={handleChange}
            />

            <Campo label="15. Número de proceso" name="Proceso" value={registro.Proceso} onChange={handleChange} />

            <Campo
              label="16. Delitos"
              name="Delitos"
              type="textarea"
              value={registro.Delitos}
              onChange={handleChange}
            />

            <Campo
              label="17. Fecha de captura"
              name="fechaCaptura"
              type="date"
              value={registro.fechaCaptura}
              onChange={handleChange}
            />

            <Campo
              label="18.a Pena (años)"
              name="Pena años"
              type="number"
              value={registro['Pena años']}
              onChange={handleChange}
            />

            <Campo
              label="18.b Pena (meses)"
              name="Pena meses"
              type="number"
              value={registro['Pena meses']}
              onChange={handleChange}
            />

            <Campo
              label="18.c Pena (días)"
              name="Pena días"
              type="number"
              value={registro['Pena días']}
              onChange={handleChange}
            />

            <Campo
              label="19. Pena total en días"
              name="Pena total en días"
              value={registro['Pena total en días']}
              onChange={handleChange}
            />

            <Campo
              label="20. Tiempo que la persona lleva privada de la libertad (en días)"
              name="Tiempo de privación de la libertad"
              value={registro['Tiempo de privación de la libertad']}
              onChange={handleChange}
            />

            <Campo
              label="21. Redención total acumulada en días"
              name="Redención "
              value={registro['Redención ']}
              onChange={handleChange}
            />

            <Campo
              label="22. Tiempo efectivo de pena cumplida en días (teniendo en cuenta la redención)"
              name="Tiempo efectivo con redención"
              value={registro['Tiempo efectivo con redención']}
              onChange={handleChange}
            />

            <div className="form-field">
              <label>23. Porcentaje de avance de pena cumplida</label>
              <BarraProgreso porcentaje={porcentajeAvance} />
            </div>

            <Campo
              label="24. Fase de tramiento"
              name="Fase de tratamiento"
              type="select"
              value={registro['Fase de tratamiento'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_FASE_TRATAMIENTO]}
            />

            <Campo
              label="25. ¿ Cuenta con requerimientos judiciales por otros procesos ?"
              name="¿Cuenta con requerimientos judiciales por otros procesos?"
              value={registro['¿Cuenta con requerimientos judiciales por otros procesos?']}
              onChange={handleChange}
            />

            <Campo
              label="26. Fecha última calificación"
              name="Fecha ultima calificación"
              type="date"
              value={registro['Fecha ultima calificación']}
              onChange={handleChange}
            />

            <Campo
              label="27. Calificación de conducta"
              name="Calificación de conducta"
              type="select"
              value={registro['Calificación de conducta'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_CALIFICACION_CONDUCTA]}
            />
          </div>

          <h3 className="block-title">BLOQUE 3. Análisis jurídico</h3>

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
              value={registro['Procedencia de libertad condicional'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_PROCEDENCIA_LIBERTAD_CONDICIONAL]}
            />

            <Campo
              label="31. Procedencia de prisión domiciliaria de mitad de pena"
              name="Procedencia de prisión domiciliaria de mitad de pena"
              type="select"
              value={registro['Procedencia de prisión domiciliaria de mitad de pena'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_PROCEDENCIA_PRISION_DOMICILIARIA]}
            />

            <Campo
              label="32. Procedencia de utilidad pública (solo para mujeres)"
              name="procedenciaUtilidadPublica"
              value={registro.procedenciaUtilidadPublica}
              onChange={handleChange}
            />

            <Campo
              label="33. Procedencia de pena cumplida"
              name="Procedencia de pena cumplida"
              type="select"
              value={registro['Procedencia de pena cumplida'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO]}
            />

            <Campo
              label="34. Procedencia de acumulación de penas"
              name="Procedencia de acumulación de penas"
              type="select"
              value={registro['Procedencia de acumulación de penas'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO]}
            />

            <Campo
              label="35. Con qué proceso (s) debe acumular penas ( si aplica)"
              name="Con qué proceso(s) debe acumular penas (si aplica)"
              value={registro['Con qué proceso(s) debe acumular penas (si aplica)']}
              onChange={handleChange}
              disabled={!habilitarPregunta35}
            />

            <Campo
              label="36. Otras solicitudes a tramitar"
              name="Otras solicitudes a tramitar"
              type="select"
              value={registro['Otras solicitudes a tramitar'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_OTRAS_SOLICITUDES]}
            />

            <Campo
              label="37. Resumen del análisis del caso"
              name="Resumen del anális del caso"
              type="textarea"
              value={registro['Resumen del anális del caso']}
              onChange={handleChange}
            />
          </div>

          <h3 className="block-title">BLOQUE 4. Entrevista con el usuario</h3>

          <div className="grid-2">
            <Campo
              label="38. Fecha de la entrevista"
              name="Fecha entrevista"
              type="date"
              value={registro['Fecha entrevista']}
              onChange={handleChange}
            />

            <Campo
              label="39. Decisión del usuario"
              name="Decisión del usuario"
              type="select"
              value={registro['Decisión del usuario'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_DECISION_USUARIO]}
            />

            <Campo
              label="40. Actuación judicial a adelantar"
              name="actuacionJudicialAdelantar"
              type="select"
              value={registro.actuacionJudicialAdelantar ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_ACTUACION_A_ADELANTAR]}
              disabled={!habilitarBloquesPosteriores}
            />

            <Campo
              label="41. Requiere pruebas"
              name="Requiere pruebas"
              type="select"
              value={registro['Requiere pruebas'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO]}
              disabled={!habilitarBloquesPosteriores}
            />

            <Campo
              label="42. Poder en caso de avanzar con la solicitud"
              name="Poder en caso de avanzar con la solicitud"
              type="select"
              value={registro['Poder en caso de avanzar con la solicitud'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_PODER]}
              disabled={!habilitarBloquesPosteriores}
            />

            {(decisionUsuarioBloquea || !decisionUsuarioDesbloquea) && (
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <p className="hint-text">
                  El resto del formulario está bloqueado por la selección en “Decisión del usuario”.
                </p>
              </div>
            )}
          </div>

          {esActuacionUtilidadPublica ? (
            <>
              <h3 className="block-title">BLOQUE 5A. Utilidad pública</h3>
              <div className="grid-2">
            <Campo
              label="43. Cumple el requisito de marginalidad"
              name="cumpleMarginalidad"
              type="select"
              value={registro.cumpleMarginalidad ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO_MAYUS]}
              disabled={!habilitarUtilidadPublica}
            />

            <Campo
              label="44. Cumple el requisito de jefatura de hogar"
              name="cumpleJefaturaHogar"
              type="select"
              value={registro.cumpleJefaturaHogar ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO_MAYUS]}
              disabled={!habilitarUtilidadPublica}
            />

            <Campo
              label="45. Fecha de solicitud de misión de trabajo"
              name="fechaSolicitudMisionTrabajo"
              type="date"
              value={registro.fechaSolicitudMisionTrabajo}
              onChange={handleChange}
              disabled={!habilitarUtilidadPublica}
            />

            <Campo
              label="46. Fecha de asignación de investigador"
              name="fechaAsignacionInvestigador"
              type="date"
              value={registro.fechaAsignacionInvestigador}
              onChange={handleChange}
              disabled={!habilitarUtilidadPublica}
            />

            <Campo
              label="47. Fecha de informe final de la misión"
              name="fechaInformeFinalMision"
              type="date"
              value={registro.fechaInformeFinalMision}
              onChange={handleChange}
              disabled={!habilitarUtilidadPublica}
            />

            <Campo
              label="48. ¿Se requiere ampliar la misión?"
              name="requiereAmpliarMision"
              type="select"
              value={registro.requiereAmpliarMision ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO_MAYUS]}
              disabled={!habilitarUtilidadPublica}
            />

            <Campo
              label="49. Fecha de solicitud de ampliación de misión"
              name="fechaSolicitudAmpliacionMision"
              type="date"
              value={registro.fechaSolicitudAmpliacionMision}
              onChange={handleChange}
              disabled={!habilitarUtilidadPublica}
            />

            <Campo
              label="50. Fecha informe de ampliación"
              name="fechaInformeAmpliacion"
              type="date"
              value={registro.fechaInformeAmpliacion}
              onChange={handleChange}
              disabled={!habilitarUtilidadPublica}
            />

            <Campo
              label="51. Fecha en la que se reciben todas las pruebas"
              name="fechaRecibenTodasPruebas"
              type="date"
              value={registro.fechaRecibenTodasPruebas}
              onChange={handleChange}
              disabled={!habilitarUtilidadPublica}
            />

            <Campo
              label="52. Fecha de radicación de solicitud de utilidad pública"
              name="fechaRadicacionUtilidadPublica"
              type="date"
              value={registro.fechaRadicacionUtilidadPublica}
              onChange={handleChange}
              disabled={!habilitarUtilidadPublica}
            />
              </div>
            </>
          ) : (
            <>
              <h3 className="block-title">BLOQUE 5B. Trámite de la solicitud</h3>
              <div className="grid-2">
                <Campo
              label="53. Fecha de recepción de pruebas aportadas por el usuario (si aplica)"
              name="Fecha de recepción de pruebas aportadas por el usuario"
              type="date"
              value={registro['Fecha de recepción de pruebas aportadas por el usuario']}
              onChange={handleChange}
              disabled={!habilitarBloque5}
            />

            <Campo
              label="54. Fecha de solicitud de documentos al Inpec (si aplica)"
              name="Fecha de solicitud de documentos al INPEC"
              type="date"
              value={registro['Fecha de solicitud de documentos al INPEC']}
              onChange={handleChange}
              disabled={!habilitarBloque5}
            />

            <Campo
              label="55. Fecha de presentación de la solicitud a la autoridad (si aplica)"
              name="Fecha de presentación de solicitud a la autoridad judicial"
              type="date"
              value={registro['Fecha de presentación de solicitud a la autoridad judicial']}
              onChange={handleChange}
              disabled={!habilitarBloque5}
            />

            <Campo
              label="56. Fecha de decisión de la autoridad (si aplica)"
              name="Fecha de decisión de la autoridad judicial"
              type="date"
              value={registro['Fecha de decisión de la autoridad judicial']}
              onChange={handleChange}
              disabled={!habilitarBloque5}
            />

            <Campo
              label="57. Sentido de la decisión"
              name="Sentido de la decisión"
              type="select"
              value={registro['Sentido de la decisión'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_SENTIDO_DECISION]}
              disabled={!habilitarBloque5}
            />

            <Campo
              label="58. Motivo de la decisión negativa"
              name="motivoDecisionNegativaUnificado"
              type="select"
              value={motivoDecisionNegativaUnificado}
              onChange={handleChange}
              options={['-', ...OPCIONES_MOTIVO_DECISION_NEGATIVA]}
              disabled={!habilitarNegativa}
            />

            <Campo
              label="59. Fecha de recurso en caso desfavorable"
              name="Fecha de recurso en caso desfavorable"
              type="date"
              value={registro['Fecha de recurso en caso desfavorable']}
              onChange={handleChange}
              disabled={!habilitarNegativa}
            />

                <Campo
                  label="60. Sentido de la decisión que resuelve recurso"
                  name="Sentido de la decisión que resuelve recurso"
                  type="select"
                  value={registro['Sentido de la decisión que resuelve recurso'] ?? '-'}
                  onChange={handleChange}
                  options={['-', ...OPCIONES_SENTIDO_DECISION_RECURSO]}
                  disabled={!habilitarNegativa}
                />
              </div>
            </>
          )}

          <h3 className="block-title">BLOQUE ADICIONAL. Solicitudes distintas (CSV)</h3>

          <div className="grid-2">
            <Campo
              label="Tipo de solicitud a tramitar"
              name="Tipo de solicitud a tramitar"
              type="select"
              value={registro['Tipo de solicitud a tramitar'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_TIPO_SOLICITUD_TRAMITAR]}
              disabled={!habilitarBloque5 || otrasSolicitudes === '-' || otrasSolicitudes === 'Ninguna'}
            />

            <Campo
              label="Autoridad a la que se dirige"
              name="Autoridad a la que se dirige"
              value={registro['Autoridad a la que se dirige']}
              onChange={handleChange}
              disabled={!habilitarBloque5 || otrasSolicitudes === '-' || otrasSolicitudes === 'Ninguna'}
            />

            <Campo
              label="Fecha de la solicitud"
              name="Fecha de la solicitud"
              type="date"
              value={registro['Fecha de la solicitud']}
              onChange={handleChange}
              disabled={!habilitarBloque5 || otrasSolicitudes === '-' || otrasSolicitudes === 'Ninguna'}
            />

            <Campo
              label="Fecha de respuesta de la solicitud"
              name="Fecha de respuesta de la solicitud"
              type="date"
              value={registro['Fecha de respuesta de la solicitud']}
              onChange={handleChange}
              disabled={!habilitarBloque5 || otrasSolicitudes === '-' || otrasSolicitudes === 'Ninguna'}
            />

            <Campo
              label="Sentido de la decisión que resuelve la solicitud"
              name="Sentido de la decisión que resuelve la solicitud"
              type="select"
              value={registro['Sentido de la decisión que resuelve la solicitud'] ?? '-'}
              onChange={handleChange}
              options={['-', ...OPCIONES_SENTIDO_DECISION_RESUELVE_SOLICITUD]}
              disabled={!habilitarBloque5 || otrasSolicitudes === '-' || otrasSolicitudes === 'Ninguna'}
            />

            <Campo
              label="Fecha de insistencia de la solicitud (si aplica)"
              name="Fecha de insistencia de la solicitud (si aplica)"
              type="date"
              value={registro['Fecha de insistencia de la solicitud (si aplica)']}
              onChange={handleChange}
              disabled={!habilitarBloque5 || otrasSolicitudes === '-' || otrasSolicitudes === 'Ninguna'}
            />
          </div>

          <div className="actions-center">
            <button className="save-button" onClick={handleGuardar}>
              GUARDAR ENTREVISTA
            </button>
            {mostrarBotonConsultarOtro && guardadoOk && (
              <button className="save-button secondary" onClick={handleConsultarOtro}>
                CONSULTAR OTRO PPL
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FormularioEntrevista;
