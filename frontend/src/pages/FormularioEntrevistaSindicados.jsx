import { useEffect, useState } from 'react';
import { getPplByDocumento, updatePpl } from '../services/api.js';


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
      <div className="form-field">
        <label>{label}</label>
        <select
          name={name}
          value={value ?? ''}
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
      <div className="form-field">
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
    <div className="form-field">
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

function FormularioEntrevistaSindicados({ numeroInicial }) {
  const [numeroBusqueda, setNumeroBusqueda] = useState(numeroInicial || '');
  const [registro, setRegistro] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (numeroInicial) {
      buscarRegistro(numeroInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroInicial]);

  async function buscarRegistro(numero) {
    const doc = String(numero || '').trim();
    if (!doc) {
      alert('Ingrese un número de identificación');
      return;
    }

    setCargando(true);
    try {
      const data = await getPplByDocumento(doc);
      // Se espera que el backend responda con tipoPpl='sindicado' para este flujo
      setRegistro(data.registro);
    } catch (err) {
      console.error(err);
      alert('No se encontró el usuario con ese número');
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
      alert('Debe cargar un usuario antes de guardar.');
      return;
    }

    try {
      await updatePpl(registro.numeroIdentificacion, registro);
      alert('Entrevista/registro guardado correctamente (mock).');
    } catch (err) {
      console.error(err);
      alert('Error al guardar el registro.');
    }
  }

  function handleConsultarOtro() {
    setRegistro(null);
    setNumeroBusqueda('');
  }

  return (
    <div className="card">
      <h2>Buscar Usuario</h2>

      {/* Si NO hay registro cargado, se muestra el buscador */}
      {!registro && (
        <div className="search-row">
          <div className="form-field">
            <label>Número de Identificación</label>
            <input
              type="text"
              value={numeroBusqueda}
              onChange={(e) => setNumeroBusqueda(e.target.value)}
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
      {registro && (
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
              label="8. ¿REQUIERE ATENCIÓN MÉDICA PERMANENTE?"
              name="requiereAtencionMedica"
              type="select"
              value={registro.requiereAtencionMedica}
              onChange={handleChange}
            />

            <Campo
              label="2. TIPO DE IDENTIFICACIÓN"
              name="tipoIdentificacion"
              value={registro.tipoIdentificacion}
              onChange={handleChange}
            />

            <Campo
              label="9. ¿ESTÁ EN ESTADO DE GESTACIÓN?"
              name="estadoGestacion"
              type="select"
              value={registro.estadoGestacion}
              onChange={handleChange}
            />

            {/* 6) Cédula NO editable */}
            <Campo
              label="3. NÚMERO DE IDENTIFICACIÓN"
              name="numeroIdentificacion"
              value={registro.numeroIdentificacion}
              onChange={handleChange}
              readOnly
            />

            <Campo
              label="10. ¿ES MUJER CABEZA DE FAMILIA?"
              name="mujerCabezaFamilia"
              type="select"
              value={registro.mujerCabezaFamilia}
              onChange={handleChange}
            />

            <Campo
              label="4. ¿LA PERSONA SIGUE EN EL CDT?"
              name="sigueEnCDT"
              type="select"
              value={registro.sigueEnCDT}
              onChange={handleChange}
            />

            <Campo label="11. CDT" name="cdt" value={registro.cdt} onChange={handleChange} />

            <Campo
              label="5. NACIONALIDAD"
              name="nacionalidad"
              value={registro.nacionalidad}
              onChange={handleChange}
            />

            <Campo label="12. MUNICIPIO" name="municipio" value={registro.municipio} onChange={handleChange} />

            <Campo
              label="6. GÉNERO"
              name="genero"
              type="select"
              value={registro.genero}
              onChange={handleChange}
              options={['-', 'Masculino', 'Femenino', 'Otro']}
            />

            <Campo
              label="13. DEPARTAMENTO"
              name="departamento"
              value={registro.departamento}
              onChange={handleChange}
            />

            <Campo label="7. EDAD" name="edad" type="number" value={registro.edad} onChange={handleChange} />

            <Campo
              label="14. PROCEDENCIA DE SOLICITUD DE TRASLADO INMEDIATO A ERON"
              name="procedenciaTrasladoEron"
              type="select"
              value={registro.procedenciaTrasladoEron}
              onChange={handleChange}
            />
          </div>

          <h3 className="block-title">
            BLOQUE 2. Etapa pre-visita al CDT: Análisis jurídico.
          </h3>

          <div className="grid-2">
            <Campo
              label="15. AUTORIDAD JUDICIAL A CARGO"
              name="autoridadJudicial"
              value={registro.autoridadJudicial}
              onChange={handleChange}
            />

            <Campo
              label="19. FECHA DE CAPTURA"
              name="fechaCaptura"
              type="date"
              value={registro.fechaCaptura}
              onChange={handleChange}
            />

            <Campo
              label="16. NÚMERO DE PROCESO"
              name="numeroProcesoJudicial"
              value={registro.numeroProcesoJudicial}
              onChange={handleChange}
            />

            <Campo
              label="20. TIEMPO PRIVADO DE LA LIBERTAD (MESES)"
              name="tiempoPrivacionMeses"
              type="number"
              value={registro.tiempoPrivacionMeses}
              onChange={handleChange}
            />

            <Campo
              label="17. DELITOS"
              name="delitos"
              type="textarea"
              value={registro.delitos}
              onChange={handleChange}
            />

            <Campo
              label="21. FECHA DE ANÁLISIS JURÍDICO DEL CASO"
              name="fechaAnalisisJuridico"
              type="date"
              value={registro.fechaAnalisisJuridico}
              onChange={handleChange}
            />

            <Campo
              label="18. SITUACIÓN JURÍDICA ACTUALIZADA"
              name="situacionJuridicaActualizada"
              type="select"
              value={registro.situacionJuridicaActualizada}
              onChange={handleChange}
              options={['-', 'SINDICADO', 'IMPUTADO', 'ACUSADO']}
            />

            <Campo
              label="22. PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TÉRMINOS"
              name="procedenciaVencimientoTerminos"
              type="select"
              value={registro.procedenciaVencimientoTerminos}
              onChange={handleChange}
            />
          </div>

          <h3 className="block-title">
            BLOQUE 3. Etapa durante la visita al CDT.
          </h3>

          <div className="grid-2">
            <Campo
              label="23. FECHA DE LA ENTREVISTA"
              name="fechaEntrevista"
              type="date"
              value={registro.fechaEntrevista}
              onChange={handleChange}
            />

            <Campo
              label="26. NOMBRE DEL DEFENSOR PÚBLICO ASIGNADO (VISION WEB)"
              name="defensorAsignadoVisionWeb"
              value={registro.defensorAsignadoVisionWeb}
              onChange={handleChange}
            />

            <Campo
              label="24. DECISIÓN DEL USUARIO"
              name="decisionUsuario"
              type="select"
              value={registro.decisionUsuario}
              onChange={handleChange}
              options={['-', 'ACEPTA', 'NO ACEPTA']}
            />

            <Campo
              label="27. RESUMEN DEL ANÁLISIS JURÍDICO DEL PRESENTE CASO"
              name="resumenAnalisisJuridico"
              type="textarea"
              value={registro.resumenAnalisisJuridico}
              onChange={handleChange}
            />

            <Campo
              label="25. PODER EN CASO DE AVANZAR CON LA SOLICITUD"
              name="poderAvanzarSolicitud"
              type="select"
              value={registro.poderAvanzarSolicitud}
              onChange={handleChange}
              options={['-', 'SI', 'NO']}
            />
          </div>

          <h3 className="block-title">
            BLOQUE 4. Etapa post-visita al CDT: Vencimiento de términos.
          </h3>

          <div className="grid-2">
            <Campo
              label="28. FECHA DE REVISIÓN DEL EXPEDIENTE"
              name="fechaRevisionExpediente"
              type="date"
              value={registro.fechaRevisionExpediente}
              onChange={handleChange}
            />

            <Campo
              label="32. SENTIDO DE LA DECISIÓN"
              name="sentidoDecision"
              type="select"
              value={registro.sentidoDecision}
              onChange={handleChange}
              options={['-', 'FAVORABLE', 'DESFAVORABLE']}
            />

            <Campo
              label="29. CONFIRMACIÓN DE PROCEDENCIA DE VENCIMIENTO"
              name="confirmacionProcedenciaVencimiento"
              type="select"
              value={registro.confirmacionProcedenciaVencimiento}
              onChange={handleChange}
            />

            <Campo
              label="33. MOTIVO DE LA DECISIÓN NEGATIVA"
              name="motivoDecisionNegativa"
              type="select"
              value={registro.motivoDecisionNegativa}
              onChange={handleChange}
            />

            <Campo
              label="30. FECHA DE SOLICITUD DE AUDIENCIA"
              name="fechaSolicitudAudiencia"
              type="date"
              value={registro.fechaSolicitudAudiencia}
              onChange={handleChange}
            />

            <Campo
              label="34. ¿SE RECURRIÓ EN CASO DE DECISIÓN NEGATIVA?"
              name="seRecurrioDecisionNegativa"
              type="select"
              value={registro.seRecurrioDecisionNegativa}
              onChange={handleChange}
              options={['-', 'SI', 'NO']}
            />

            <Campo
              label="31. FECHA DE REALIZACIÓN DE AUDIENCIA"
              name="fechaRealizacionAudiencia"
              type="date"
              value={registro.fechaRealizacionAudiencia}
              onChange={handleChange}
            />

            <Campo
              label="35. SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO"
              name="sentidoDecisionRecurso"
              type="select"
              value={registro.sentidoDecisionRecurso}
              onChange={handleChange}
              options={['-', 'CONFIRMA', 'REVOCA', 'MODIFICA']}
            />
          </div>

          <h3 className="block-title">
            BLOQUE 5. Etapa post-visita al CDT: Traslado a ERON.
          </h3>

          {/* No existe .grid-1 en el CSS actual; se usa grid-2 con un solo campo */}
          <div className="grid-2">
            <Campo
              label="36. FECHA DE SOLICITUD DE TRASLADO A ERON"
              name="fechaSolicitudTrasladoEron"
              type="date"
              value={registro.fechaSolicitudTrasladoEron}
              onChange={handleChange}
            />
            <div />
          </div>

          <div className="actions-center">
            <button className="save-button" onClick={handleGuardar}>
              GUARDAR ENTREVISTA
            </button>

            <button className="save-button secondary" onClick={handleConsultarOtro}>
              CONSULTAR OTRO PPL
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default FormularioEntrevistaSindicados;
