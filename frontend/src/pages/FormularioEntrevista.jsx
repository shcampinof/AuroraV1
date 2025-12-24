import { useEffect, useMemo, useState } from 'react';
import { getRegistroByDocumento, updateRegistro } from '../services/api.js';

function Campo({ label, name, type = 'text', value, onChange }) {
  if (type === 'textarea') {
    return (
      <div className="form-field">
        <label>{label}</label>
        <textarea
          name={name}
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          rows={4}
        />
      </div>
    );
  }

  if (type === 'selectYN') {
    return (
      <div className="form-field">
        <label>{label}</label>
        <select
          name={name}
          value={value ?? '-'}
          onChange={(e) => onChange(name, e.target.value)}
        >
          <option value="-">-</option>
          <option value="Si">Si</option>
          <option value="No">No</option>
        </select>
      </div>
    );
  }

  if (type === 'selectDash') {
    return (
      <div className="form-field">
        <label>{label}</label>
        <select
          name={name}
          value={value ?? '-'}
          onChange={(e) => onChange(name, e.target.value)}
        >
          <option value="-">-</option>
        </select>
      </div>
    );
  }

  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={(e) => onChange(name, e.target.value)}
      />
    </div>
  );
}

function toNumberOrNull(x) {
  const n = Number(String(x ?? '').trim());
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

function FormularioEntrevista({ numeroInicial }) {
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
      const data = await getRegistroByDocumento(doc);
      setRegistro(data);
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

  const porcentajeAvance = useMemo(() => {
    if (!registro) return null;
    const penaTotal = toNumberOrNull(registro.penaTotalDias);
    const tiempoEfectivo = toNumberOrNull(registro.tiempoEfectivoDias);
    if (!penaTotal || !tiempoEfectivo) return null;

    // Cálculo explícito:
    // porcentaje = (tiempoEfectivoDias / penaTotalDias) * 100
    // redondeo al entero más cercano
    const pct = Math.round((tiempoEfectivo / penaTotal) * 100);
    return pct;
  }, [registro]);

  async function handleGuardar() {
    if (!registro?.numeroIdentificacion) {
      alert('Debe cargar un usuario antes de guardar.');
      return;
    }
    try {
      await updateRegistro(registro.numeroIdentificacion, registro);
      alert('Entrevista guardada correctamente (mock).');
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

      <div className="search-row">
        <div className="form-field">
          <label>Número de Identificación</label>
          <input
            type="text"
            placeholder="Ingrese Documento"
            value={numeroBusqueda}
            onChange={(e) => setNumeroBusqueda(e.target.value)}
          />
        </div>

        <button className="primary-button" onClick={() => buscarRegistro(numeroBusqueda)}>
          Buscar en Base de Datos
        </button>
      </div>

      {cargando && <p>Cargando información...</p>}

      {!cargando && registro && (
        <>
          {/* BLOQUE 1 */}
          <h3 className="block-title">
            BLOQUE 1. PRE-VISITA: Información de la persona privada de la libertad SISPEC
          </h3>

          <div className="grid-2">
            <Campo label="1. NOMBRE" name="nombre" value={registro.nombre} onChange={handleChange} />
            <Campo label="6. FASE DE TRATAMIENTO" name="faseTratamiento" value={registro.faseTratamiento} onChange={handleChange} />

            <Campo label="2. NÚMERO DE IDENTIFICACIÓN" name="numeroIdentificacion" value={registro.numeroIdentificacion} onChange={handleChange} />
            <Campo label="7. FECHA DE NACIMIENTO" name="fechaNacimiento" type="date" value={registro.fechaNacimiento} onChange={handleChange} />

            <Campo label="3. GÉNERO" name="genero" value={registro.genero} onChange={handleChange} />
            <Campo label="8. DEPARTAMENTO DEL ERON" name="departamentoEron" value={registro.departamentoEron} onChange={handleChange} />

            <Campo label="4. ESTABLECIMIENTO DE RECLUSIÓN" name="establecimientoReclusion" value={registro.establecimientoReclusion} onChange={handleChange} />
            <Campo label="9. MUNICIPIO DEL ERON" name="municipioEron" value={registro.municipioEron} onChange={handleChange} />

            <Campo label="5. ENFOQUE DIFERENCIAL" name="enfoqueDiferencial" value={registro.enfoqueDiferencial} onChange={handleChange} />
            <Campo label="10. SITUACIÓN JURÍDICA" name="situacionJuridica" value={registro.situacionJuridica} onChange={handleChange} />
          </div>

          {/* BLOQUE 2 */}
          <h3 className="block-title">
            BLOQUE 2. PRE-VISITA: Información del proceso SISPEC
          </h3>

          <div className="grid-2">
            <Campo label="11. AUTORIDAD A CARGO" name="autoridadCargo" value={registro.autoridadCargo} onChange={handleChange} />
            <Campo label="16. TIEMPO QUE LA PERSONA LLEVA PRIVADA DE LA LIBERTAD (EN DÍAS)" name="tiempoPrivadoDias" value={registro.tiempoPrivadoDias} onChange={handleChange} />

            <Campo label="12. NÚMERO DE PROCESO" name="numeroProceso" value={registro.numeroProceso} onChange={handleChange} />
            <Campo label="17. TIEMPO EFECTIVO DE PENA CUMPLIDA EN DÍAS (TENIENDO EN CUENTA LA REDENCIÓN)" name="tiempoEfectivoDias" value={registro.tiempoEfectivoDias} onChange={handleChange} />

            <Campo label="13. DELITOS" name="delitos" type="textarea" value={registro.delitos} onChange={handleChange} />
            <Campo label="18. REDENCIÓN TOTAL ACUMULADA EN DÍAS" name="redencionDias" value={registro.redencionDias} onChange={handleChange} />

            <Campo label="14. PENA (AÑOS, MESES Y DÍAS)" name="penaAniosMesesDias" value={registro.penaAniosMesesDias} onChange={handleChange} />
            <Campo label="19. ¿CUENTA CON REQUERIMIENTOS JUDICIALES POR OTROS PROCESOS?" name="requerimientosOtrosProcesos" type="selectYN" value={registro.requerimientosOtrosProcesos} onChange={handleChange} />

            <Campo label="15. PENA TOTAL EN DÍAS" name="penaTotalDias" value={registro.penaTotalDias} onChange={handleChange} />

            <div className="form-field">
              <label>20. PORCENTAJE DE AVANCE DE PENA CUMPLIDA</label>
              <BarraProgreso porcentaje={porcentajeAvance} />
            </div>
          </div>

          {/* BLOQUE 3 */}
          <h3 className="block-title">
            BLOQUE 3. PRE-VISITA: Análisis jurídico
          </h3>

          <div className="grid-2">
            <Campo label="21. DEFENSOR(A) PÚBLICO(A) ASIGNADO PARA TRAMITAR LA SOLICITUD" name="defensorAsignado" value={registro.defensorAsignado} onChange={handleChange} />
            <Campo label="26. PROCEDENCIA DE ACUMULACIÓN DE PENAS" name="procedenciaAcumulacionPenas" type="selectDash" value={registro.procedenciaAcumulacionPenas} onChange={handleChange} />

            <Campo label="22. FECHA DE ANÁLISIS JURÍDICO DEL CASO" name="fechaAnalisisJuridico" type="date" value={registro.fechaAnalisisJuridico} onChange={handleChange} />
            <Campo label="27. CON QUÉ PROCESO(S) DEBE ACUMULAR PENAS (SI APLICA)" name="procesosAcumular" value={registro.procesosAcumular} onChange={handleChange} />

            <Campo label="23. PROCEDENCIA DE LIBERTAD CONDICIONAL" name="procedenciaLibCondicional" type="selectDash" value={registro.procedenciaLibCondicional} onChange={handleChange} />
            <Campo label="28. OTRAS SOLICITUDES A TRAMITAR" name="otrasSolicitudes" type="selectDash" value={registro.otrasSolicitudes} onChange={handleChange} />

            <Campo label="24. PROCEDENCIA DE PRISIÓN DOMICILIARIA DE MITAD DE PENA" name="procedenciaPrisionDomiciliariaMitad" type="selectDash" value={registro.procedenciaPrisionDomiciliariaMitad} onChange={handleChange} />
            <Campo label="29. RESUMEN DEL ANÁLIS DEL CASO" name="resumenAnalisis" type="textarea" value={registro.resumenAnalisis} onChange={handleChange} />

            <Campo label="25. PROCEDENCIA DE PENA CUMPLIDA" name="procedenciaPenaCumplida" type="selectDash" value={registro.procedenciaPenaCumplida} onChange={handleChange} />
          </div>

          {/* BLOQUE 4 */}
          <h3 className="block-title">
            BLOQUE 4. VISITA: Entrevista con el usuario
          </h3>

          <div className="grid-2">
            <Campo label="30. DECISIÓN DEL USUARIO" name="decisionUsuario" type="selectDash" value={registro.decisionUsuario} onChange={handleChange} />
            <Campo label="32. REQUIERE PRUEBAS" name="requierePruebas" type="selectDash" value={registro.requierePruebas} onChange={handleChange} />

            <Campo label="31. FECHA DE LA ENTREVISTA" name="fechaEntrevista" type="date" value={registro.fechaEntrevista} onChange={handleChange} />
            <Campo label="33. PODER EN CASO DE AVANZAR CON LA SOLICITUD" name="poderAvanzarSolicitud" type="selectDash" value={registro.poderAvanzarSolicitud} onChange={handleChange} />
          </div>

          {/* BLOQUE 5 */}
          <h3 className="block-title">
            BLOQUE 5. POST-VISITA: Trámite de la solicitud de subrogado penal (si aplica)
          </h3>

          <div className="grid-2">
            <Campo label="34. FECHA DE RECEPCIÓN DE PRUEBAS APORTADAS POR EL USUARIO" name="fechaRecepcionPruebas" type="date" value={registro.fechaRecepcionPruebas} onChange={handleChange} />
            <Campo label="39. MOTIVO DE LA DECISIÓN NEGATIVA (libertad condicional si aplica)" name="motivoDecisionNegativaLibCondicional" type="selectDash" value={registro.motivoDecisionNegativaLibCondicional} onChange={handleChange} />

            <Campo label="35. FECHA DE SOLICITUD DE DOCUMENTOS AL INPEC" name="fechaSolicitudDocsInpec" type="date" value={registro.fechaSolicitudDocsInpec} onChange={handleChange} />
            <Campo label="40. MOTIVO DE LA DECISIÓN NEGATIVA (prisión domiciliaria si aplica)" name="motivoDecisionNegativaPrisionDomiciliaria" type="selectDash" value={registro.motivoDecisionNegativaPrisionDomiciliaria} onChange={handleChange} />

            <Campo label="36. FECHA DE PRESENTACIÓN DE LA SOLICITUD A LA AUTORIDAD JUDICIAL" name="fechaPresentacionSolicitud" type="date" value={registro.fechaPresentacionSolicitud} onChange={handleChange} />
            <Campo label="41. FECHA DE RECURSO EN CASO DESFAVORABLE" name="fechaRecursoDesfavorable" type="date" value={registro.fechaRecursoDesfavorable} onChange={handleChange} />

            <Campo label="37. FECHA DE DECISIÓN DE LA AUTORIDAD JUDICIAL" name="fechaDecisionAutoridad" type="date" value={registro.fechaDecisionAutoridad} onChange={handleChange} />
            <Campo label="42. SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO" name="sentidoDecisionRecurso" type="selectDash" value={registro.sentidoDecisionRecurso} onChange={handleChange} />

            <Campo label="38. SENTIDO DE LA DECISIÓN" name="sentidoDecision" type="selectDash" value={registro.sentidoDecision} onChange={handleChange} />
          </div>

          {/* BLOQUE 6 */}
          <h3 className="block-title">
            BLOQUE 6. POST-VISITA: Trámite de la solicitud distinta a la de subrogados penales (si aplica)
          </h3>

          <div className="grid-2">
            <Campo label="43. TIPO DE SOLICITUD A TRAMITAR" name="tipoSolicitudTramitar" type="selectDash" value={registro.tipoSolicitudTramitar} onChange={handleChange} />
            <Campo label="46. FECHA DE RESPUESTA DE LA SOLICITUD" name="fechaRespuestaSolicitud" type="date" value={registro.fechaRespuestaSolicitud} onChange={handleChange} />

            <Campo label="44. AUTORIDAD A LA QUE SE DIRIGE" name="autoridadDirige" value={registro.autoridadDirige} onChange={handleChange} />
            <Campo label="47. SENTIDO DE LA DECISIÓN QUE RESUELVE LA SOLICITUD" name="sentidoDecisionResuelveSolicitud" type="selectDash" value={registro.sentidoDecisionResuelveSolicitud} onChange={handleChange} />

            <Campo label="45. FECHA DE LA SOLICITUD" name="fechaSolicitud" type="date" value={registro.fechaSolicitud} onChange={handleChange} />
            <Campo label="49. FECHA DE INSISTENCIA DE LA SOLICITUD (si aplica)" name="fechaInsistenciaSolicitud" type="date" value={registro.fechaInsistenciaSolicitud} onChange={handleChange} />
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

export default FormularioEntrevista;
