import { useEffect, useState } from 'react';
import { getPplByDocumento, updatePpl } from '../services/api.js';
import Toast from '../components/Toast.jsx';
import { pickActiveCase } from '../utils/entrevistaEstado.js';

const OPCIONES_TIPO_IDENTIFICACION = ['CC', 'CE', 'PASAPORTE', 'OTRA'];
const OPCIONES_SI_NO = ['Sí', 'No'];
const OPCIONES_GENERO = ['Femenino', 'Masculino', 'Transfemenino', 'Transmasculino'];
const OPCIONES_SITUACION_JURIDICA_ACTUALIZADA = ['SINDICADO', 'CONDENADO'];

const OPCIONES_PROCEDENCIA_VENCIMIENTO_TERMINOS = [
  'Sí procede',
  'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva',
  'No procede porque la persona está procesada por delitos en los que procede prórroga de la detención preventiva y aún no cumple ese tiempo',
  'No procede porque son tres o más los acusados y aún no se cumple el tiempo para solicitar el levantamiento de la detención preventiva en este supuesto',
  'No procede porque la persona está procesada por delitos atribuibles a Grupos Delictivos Organizados (GDO) o Grupos Armados Organizados (GAO) y aún no cumple el tiempo permitido',
  'No procede porque ya hay una solicitud en trámite',
];

const OPCIONES_CONFIRMACION_PROCEDENCIA_VENCIMIENTO = [
  'Sí procede',
  'No procede porque aún no reúne el tiempo de 1 año exigido por la norma para solicitar el levantamiento de la detención preventiva',
  'No procede porque la persona está procesada por delitos en los que procede prórroga de la detención preventiva y aún no cumple ese tiempo',
  'No procede porque son tres o más los acusados y aún no se cumple el tiempo para solicitar el levantamiento de la detención preventiva en este supuesto',
  'No procede porque la persona está procesada por delitos atribuibles a Grupos Delictivos Organizados (GDO) o Grupos Armados Organizados (GAO) y aún no cumple el tiempo permitido',
  'No procede porque ya hay una solicitud en trámite',
  'No procede porque la persona está condenada',
];

const OPCIONES_DECISION_USUARIO = [
  'Desea que el defensor(a) público(a) avance con el trámite de levantamiento de detención preventiva',
  'Desea tramitar el trámite de levantamiento de detención preventiva a través de su defensor de confianza',
  'No desea tramitar la solicitud',
];

const OPCIONES_PODER_AVANZAR_SOLICITUD = ['Sí se requiere', 'Ya se cuenta con poder'];

const OPCIONES_SENTIDO_DECISION = [
  'Concede levantamiento de medida de aseguramiento',
  'No concede levantamiento de medida de aseguramiento',
];

const OPCIONES_MOTIVO_DECISION_NEGATIVA = [
  'Porque no cumple aún con los términos exigidos',
  'Porque está procesado por causales en las que procede la prórroga de la medida',
];


function Campo({
  label,
  name,
  type = 'text',
  value,
  onChange,
  options,
  readOnly = false,
}) {
  // SELECT
  if (type === 'select') {
    return (
      <div className={`form-field${readOnly ? ' is-disabled' : ''}`}>
        <label>{label}</label>
        <select
          name={name}
          value={value ?? '-'}
          onChange={(e) => onChange(name, e.target.value)}
          disabled={readOnly}
        >
          {(options || ['-', 'SI', 'NO']).map((opt) => (
            <option key={String(opt)} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // TEXTAREA
  if (type === 'textarea') {
    return (
      <div className={`form-field${readOnly ? ' is-disabled' : ''}`}>
        <label>{label}</label>
        <textarea
          name={name}
          value={value ?? ''}
          onChange={(e) => {
            if (!readOnly) onChange(name, e.target.value);
          }}
          rows={4}
          readOnly={readOnly}
        />
      </div>
    );
  }

  // INPUT
  return (
    <div className={`form-field${readOnly ? ' is-disabled' : ''}`}>
      <label>{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={(e) => {
          if (!readOnly) onChange(name, e.target.value);
        }}
        readOnly={readOnly}
      />
    </div>
  );
}

function FormularioEntrevistaSindicados({
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
      // Se espera que el backend responda con tipoPpl='sindicado' para este flujo
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
    setRegistro((prev) => ({ ...(prev || {}), [name]: value }));
  }

  async function handleGuardar() {
    if (!registro?.numeroIdentificacion) {
      setError('Debe cargar un usuario antes de guardar.');
      return;
    }

    try {
      setError('');
      setToastOpen(false);
      await updatePpl(registro.numeroIdentificacion, { caseId, data: registro });
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

  const esCondenado =
    String(registro?.situacionJuridicaActualizada || '').trim().toUpperCase() === 'CONDENADO';

  return (
    <div className="card">
      <h2>Buscar Usuario</h2>

      <Toast
        open={toastOpen}
        message="Aurora — Cambios guardados correctamente"
        onClose={() => setToastOpen(false)}
      />

      {error && <p className="hint-text">{error}</p>}

      {/* Si NO hay registro cargado, se muestra el buscador */}
      {mostrarBuscador && !registro && (
        <div className="search-row">
          <div className="form-field">
            <label>Número de Identificación</label>
            <input
              type="text"
              value={numeroBusqueda}
              onChange={(e) => setNumeroBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  buscarRegistro(numeroBusqueda);
                }
              }}
              placeholder="Ingrese Documento"
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

      {/* Si YA hay registro cargado, se oculta el buscador y se muestra botón superior */}
      {mostrarBuscador && registro && (
        <div className="filters-toggle-row">
          <button className="primary-button" onClick={handleConsultarOtro}>
            CONSULTAR PPL
          </button>
        </div>
      )}

      {cargando && <p>Cargando información...</p>}

      {!cargando && registro && (
        <>
          <h3 className="block-title">
            BLOQUE 1. Información de la persona privada de la libertad.
          </h3>

          <div className="grid-2">
            <Campo label="1. NOMBRE" name="nombre" value={registro.nombre} onChange={handleChange} />

            <Campo
              label="2. TIPO DE IDENTIFICACIÓN"
              name="tipoIdentificacion"
              type="select"
              value={registro.tipoIdentificacion}
              onChange={handleChange}
              options={['-', ...OPCIONES_TIPO_IDENTIFICACION]}
            />

            {/* Regla: número de documento/cédula NO editable */}
            <Campo
              label="3. NÚMERO DE IDENTIFICACIÓN"
              name="numeroIdentificacion"
              value={registro.numeroIdentificacion}
              onChange={handleChange}
              readOnly
            />

            <Campo
              label="4. ¿LA PERSONA SIGUE EN EL CDT?"
              name="sigueEnCDT"
              type="select"
              value={registro.sigueEnCDT}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO]}
            />

            <Campo
              label="5. NACIONALIDAD"
              name="nacionalidad"
              value={registro.nacionalidad}
              onChange={handleChange}
            />

            <Campo
              label="6. GÉNERO"
              name="genero"
              type="select"
              value={registro.genero}
              onChange={handleChange}
              options={['-', ...OPCIONES_GENERO]}
            />

            <Campo label="7. EDAD" name="edad" type="number" value={registro.edad} onChange={handleChange} />

            <Campo
              label="8. ¿REQUIERE ATENCIÓN MÉDICA PERMANENTE?"
              name="requiereAtencionMedica"
              type="select"
              value={registro.requiereAtencionMedica}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO]}
            />

            <Campo
              label="9. ¿ESTÁ EN ESTADO DE GESTACIÓN?"
              name="estadoGestacion"
              type="select"
              value={registro.estadoGestacion}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO]}
            />

            <Campo
              label="10. ¿ES MUJER CABEZA DE FAMILIA?"
              name="mujerCabezaFamilia"
              type="select"
              value={registro.mujerCabezaFamilia}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO]}
            />

            <Campo label="11. CDT" name="cdt" value={registro.cdt} onChange={handleChange} />
            <Campo label="12. MUNICIPIO" name="municipio" value={registro.municipio} onChange={handleChange} />

            <Campo
              label="13. DEPARTAMENTO"
              name="departamento"
              value={registro.departamento}
              onChange={handleChange}
            />
          </div>

          <h3 className="block-title">
            BLOQUE 2. Etapa pre-visita al CDT: Análisis jurídico.
          </h3>

          <div className="grid-2">
            <Campo
              label="14. AUTORIDAD JUDICIAL A CARGO"
              name="autoridadJudicial"
              value={registro.autoridadJudicial}
              onChange={handleChange}
            />

            <Campo
              label="15. NÚMERO DE PROCESO (VALIDAR CON RAMA JUDICIAL Y EDITAR SI ES DEL CASO)"
              name="numeroProcesoJudicial"
              value={registro.numeroProcesoJudicial}
              onChange={handleChange}
            />

            <Campo
              label="16. DELITOS (VALIDAR CON RAMA JUDICIAL/EXPEDIENTE Y EDITAR SI ES DEL CASO)"
              name="delitos"
              type="textarea"
              value={registro.delitos}
              onChange={handleChange}
            />

            <Campo
              label="17. SITUACIÓN JURÍDICA ACTUALIZADA (DE CONFORMIDAD CON RAMA JUDICIAL)"
              name="situacionJuridicaActualizada"
              type="select"
              value={registro.situacionJuridicaActualizada}
              onChange={handleChange}
              options={['-', ...OPCIONES_SITUACION_JURIDICA_ACTUALIZADA]}
            />

            <Campo
              label="18. FECHA DE CAPTURA"
              name="fechaCaptura"
              type="date"
              value={registro.fechaCaptura}
              onChange={handleChange}
            />

            <Campo
              label="19. TIEMPO QUE LA PERSONA LLEVA PRIVADA DE LA LIBERTAD (EN MESES)"
              name="tiempoPrivacionMeses"
              type="number"
              value={registro.tiempoPrivacionMeses}
              onChange={handleChange}
              readOnly
            />

            <Campo
              label="20. FECHA DE ANÁLISIS JURÍDICO DEL CASO"
              name="fechaAnalisisJuridico"
              type="date"
              value={registro.fechaAnalisisJuridico}
              onChange={handleChange}
            />

            <Campo
              label="21. PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS"
              name="procedenciaVencimientoTerminos"
              type="select"
              value={registro.procedenciaVencimientoTerminos}
              onChange={handleChange}
              options={['-', ...OPCIONES_PROCEDENCIA_VENCIMIENTO_TERMINOS]}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />
          </div>

          <h3 className="block-title">
            BLOQUE 3. Etapa durante la visita al CDT.
          </h3>

          <div className="grid-2">
            <Campo
              label="22. FECHA DE LA ENTREVISTA"
              name="fechaEntrevista"
              type="date"
              value={registro.fechaEntrevista}
              onChange={handleChange}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="23. DECISIÓN DEL USUARIO"
              name="decisionUsuario"
              type="select"
              value={registro.decisionUsuario}
              onChange={handleChange}
              options={['-', ...OPCIONES_DECISION_USUARIO]}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="24. PODER EN CASO DE AVANZAR CON LA SOLICITUD"
              name="poderAvanzarSolicitud"
              type="select"
              value={registro.poderAvanzarSolicitud}
              onChange={handleChange}
              options={['-', ...OPCIONES_PODER_AVANZAR_SOLICITUD]}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="25. NOMBRE DEL DEFENSOR PÚBLICO ASIGNADO AL USUARIO SEGÚN EL APLICATIVO VISION WEB"
              name="defensorAsignadoVisionWeb"
              value={registro.defensorAsignadoVisionWeb}
              onChange={handleChange}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="26. RESUMEN DEL ANÁLISIS JURÍDICO DEL PRESENTE CASO"
              name="resumenAnalisisJuridico"
              type="textarea"
              value={registro.resumenAnalisisJuridico}
              onChange={handleChange}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />
          </div>

          <h3 className="block-title">
            BLOQUE 4. Etapa post-visita al CDT: Vencimiento de términos.
          </h3>

          <div className="grid-2">
            <Campo
              label="27. FECHA DE REVISIÓN DEL EXPEDIENTE Y ELEMENTOS MATERIALES PROBATORIOS"
              name="fechaRevisionExpediente"
              type="date"
              value={registro.fechaRevisionExpediente}
              onChange={handleChange}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="28. CONFIRMACIÓN DE LA PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS"
              name="confirmacionProcedenciaVencimiento"
              type="select"
              value={registro.confirmacionProcedenciaVencimiento}
              onChange={handleChange}
              options={['-', ...OPCIONES_CONFIRMACION_PROCEDENCIA_VENCIMIENTO]}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="29. FECHA DE SOLICITUD DE AUDIENCIA DE CONTROL DE GARANTÍAS PARA SUSTENTAR REVOCATORIA"
              name="fechaSolicitudAudiencia"
              type="date"
              value={registro.fechaSolicitudAudiencia}
              onChange={handleChange}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="30. FECHA DE REALIZACIÓN DE AUDIENCIA"
              name="fechaRealizacionAudiencia"
              type="date"
              value={registro.fechaRealizacionAudiencia}
              onChange={handleChange}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="31. SENTIDO DE LA DECISIÓN"
              name="sentidoDecision"
              type="select"
              value={registro.sentidoDecision}
              onChange={handleChange}
              options={['-', ...OPCIONES_SENTIDO_DECISION]}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="32. MOTIVO DE LA DECISIÓN NEGATIVA"
              name="motivoDecisionNegativa"
              type="select"
              value={registro.motivoDecisionNegativa}
              onChange={handleChange}
              options={['-', ...OPCIONES_MOTIVO_DECISION_NEGATIVA]}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="33. ¿SE RECURRIÓ EN CASO DE DECISIÓN NEGATIVA?"
              name="seRecurrioDecisionNegativa"
              type="select"
              value={registro.seRecurrioDecisionNegativa}
              onChange={handleChange}
              options={['-', ...OPCIONES_SI_NO]}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
            />

            <Campo
              label="34. SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO"
              name="sentidoDecisionRecurso"
              type="select"
              value={registro.sentidoDecisionRecurso}
              onChange={handleChange}
              options={['-', ...OPCIONES_SENTIDO_DECISION]}
              // Regla: 17 - Si es CONDENADO, saltar bloques siguientes (conservador: bloquea desde la 21 en adelante)
              readOnly={esCondenado}
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

export default FormularioEntrevistaSindicados;
