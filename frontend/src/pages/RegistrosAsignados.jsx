import { useEffect, useMemo, useState } from 'react';
import { getRegistros } from '../services/api.js';

function uniqueValues(registros, key) {
  return Array.from(
    new Set(registros.map((r) => String(r[key] ?? '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

function RegistrosAsignados({ onSelectRegistro }) {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Filtros (panel derecho)
  const [fDocumento, setFDocumento] = useState('');
  const [fEstado, setFEstado] = useState('-');
  const [fAvance, setFAvance] = useState('-');
  const [fDepartamento, setFDepartamento] = useState('');
  const [fMunicipio, setFMunicipio] = useState('');
  const [fEstablecimiento, setFEstablecimiento] = useState('');
  const [fDefensor, setFDefensor] = useState('');

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const data = await getRegistros();
        setRegistros(data);
      } catch (err) {
        console.error(err);
        alert('Error cargando usuarios asignados');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  const estadosDisponibles = useMemo(() => uniqueValues(registros, 'estadoEntrevista'), [registros]);
  const avancesDisponibles = useMemo(() => uniqueValues(registros, 'avanceFormulario'), [registros]);

  const registrosFiltrados = registros.filter((r) => {
    const doc = String(r.numeroIdentificacion ?? '');
    const depto = String(r.departamentoEron ?? '').toLowerCase();
    const muni = String(r.municipioEron ?? '').toLowerCase();
    const estab = String(r.establecimientoReclusion ?? '').toLowerCase();
    const defensor = String(r.defensorAsignado ?? '').toLowerCase();

    if (fDocumento && !doc.includes(fDocumento.trim())) return false;
    if (fEstado !== '-' && String(r.estadoEntrevista ?? '') !== fEstado) return false;
    if (fAvance !== '-' && String(r.avanceFormulario ?? '') !== fAvance) return false;

    if (fDepartamento && !depto.includes(fDepartamento.toLowerCase().trim())) return false;
    if (fMunicipio && !muni.includes(fMunicipio.toLowerCase().trim())) return false;
    if (fEstablecimiento && !estab.includes(fEstablecimiento.toLowerCase().trim())) return false;
    if (fDefensor && !defensor.includes(fDefensor.toLowerCase().trim())) return false;

    return true;
  });

  function reiniciar() {
    setFDocumento('');
    setFEstado('-');
    setFAvance('-');
    setFDepartamento('');
    setFMunicipio('');
    setFEstablecimiento('');
    setFDefensor('');
  }

  return (
    <div className="card">
      <h2>Usuarios asignados</h2>

      {cargando && <p>Cargando...</p>}

      {!cargando && (
        <div className="asignados-layout">
          {/* Tabla */}
          <div className="asignados-table">
            <div className="table-container tall">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Número de Identificación</th>
                    <th>Nombre de Usuario</th>
                    <th>Establecimiento de Reclusión</th>
                    <th>Autoridad a Cargo</th>
                    <th>Defensor Asignado</th>
                    <th>No. de proceso</th>
                    <th>Departamento</th>
                    <th>Municipio</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.map((r) => (
                    <tr
                      key={r.numeroIdentificacion}
                      onClick={() => onSelectRegistro(r.numeroIdentificacion)}
                      className="clickable-row"
                    >
                      <td>{r.numeroIdentificacion}</td>
                      <td>{r.nombre}</td>
                      <td>{r.establecimientoReclusion}</td>
                      <td>{r.autoridadCargo}</td>
                      <td>{r.defensorAsignado}</td>
                      <td>{r.numeroProceso}</td>
                      <td>{r.departamentoEron}</td>
                      <td>{r.municipioEron}</td>
                      <td>{r.estadoEntrevista}</td>
                    </tr>
                  ))}

                  {registrosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '1rem' }}>
                        No hay registros para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="hint-text">
              Haga clic sobre una fila para abrir el formulario de entrevista del usuario seleccionado.
            </p>
          </div>

          {/* Panel filtros */}
          <div className="filter-panel">
            <h3 className="filter-title">Filtrar</h3>

            <div className="form-field">
              <label>No. Documento</label>
              <input
                className="input-text"
                placeholder="Buscar No. ID"
                value={fDocumento}
                onChange={(e) => setFDocumento(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Estado de Entrevista</label>
              <select value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                <option value="-">-</option>
                {estadosDisponibles.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Avance Formulario</label>
              <select value={fAvance} onChange={(e) => setFAvance(e.target.value)}>
                <option value="-">-</option>
                {avancesDisponibles.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Departamento</label>
              <input
                className="input-text"
                placeholder="Buscar Departamento"
                value={fDepartamento}
                onChange={(e) => setFDepartamento(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Municipio</label>
              <input
                className="input-text"
                placeholder="Buscar Municipio"
                value={fMunicipio}
                onChange={(e) => setFMunicipio(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Establecimiento de Reclusión</label>
              <input
                className="input-text"
                placeholder="Buscar Establecimiento"
                value={fEstablecimiento}
                onChange={(e) => setFEstablecimiento(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Defensor Asignado</label>
              <input
                className="input-text"
                placeholder="Buscar Defensor"
                value={fDefensor}
                onChange={(e) => setFDefensor(e.target.value)}
              />
            </div>

            <button className="primary-button full" onClick={reiniciar}>
              Reiniciar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegistrosAsignados;
