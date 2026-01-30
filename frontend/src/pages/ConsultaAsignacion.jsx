import { useEffect, useMemo, useState } from 'react';
import { getCasosPorDefensor, getDefensoresCondenados } from '../services/api.js';

function ConsultaAsignacion() {
  const [defensorInput, setDefensorInput] = useState('');
  const [defensorSeleccionado, setDefensorSeleccionado] = useState('');

  const [defensores, setDefensores] = useState([]);
  const [casos, setCasos] = useState([]);

  const [loadingDefensores, setLoadingDefensores] = useState(false);
  const [loadingCasos, setLoadingCasos] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      setLoadingDefensores(true);
      setError('');
      try {
        const data = await getDefensoresCondenados();
        setDefensores(Array.isArray(data?.defensores) ? data.defensores : []);
      } catch (e) {
        console.error(e);
        setError('Error cargando defensores.');
      } finally {
        setLoadingDefensores(false);
      }
    }

    cargar();
  }, []);

  const defensoresOrdenados = useMemo(() => {
    return [...defensores].sort((a, b) => a.localeCompare(b));
  }, [defensores]);

  useEffect(() => {
    async function cargarCasos() {
      if (!defensorSeleccionado) {
        setCasos([]);
        return;
      }

      setLoadingCasos(true);
      setError('');
      try {
        const data = await getCasosPorDefensor(defensorSeleccionado);
        setCasos(Array.isArray(data?.casos) ? data.casos : []);
      } catch (e) {
        console.error(e);
        setError('Error cargando casos del defensor.');
        setCasos([]);
      } finally {
        setLoadingCasos(false);
      }
    }

    cargarCasos();
  }, [defensorSeleccionado]);

  function seleccionarDefensor() {
    const value = String(defensorInput || '').trim();
    setDefensorSeleccionado(value);
  }

  return (
    <div className="card">
      <h2>Defensores - Consultar casos asignados</h2>

      {error && <p className="hint-text">{error}</p>}

      <div className="search-row" style={{ marginTop: '0.75rem' }}>
        <div className="form-field" style={{ minWidth: 320 }}>
          <label>Defensor</label>
          <input
            list="defensores-consulta"
            placeholder="Escriba o seleccione un defensor"
            value={defensorInput}
            onChange={(e) => setDefensorInput(e.target.value)}
            disabled={loadingDefensores}
          />
          <datalist id="defensores-consulta">
            {defensoresOrdenados.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        <button
          className="primary-button primary-button--search"
          type="button"
          onClick={seleccionarDefensor}
          disabled={loadingDefensores}
        >
          Consultar
        </button>
      </div>

      {loadingDefensores && <p>Cargando defensores...</p>}
      {loadingCasos && <p>Cargando casos...</p>}

      <div className="asignados-layout" style={{ marginTop: '1rem' }}>
        <div className="asignados-table">
          <div className="table-container tall">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Situacion juridica</th>
                  <th>Numero de identificacion</th>
                  <th>Nombre usuario</th>
                  <th>Departamento de reclusion</th>
                  <th>Municipio de reclusion</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {casos.map((c, idx) => (
                  <tr key={`${c.numeroIdentificacion}-${idx}`}>
                    <td>{c.situacionJuridica ?? '-'}</td>
                    <td>{c.numeroIdentificacion ?? '-'}</td>
                    <td>{c.nombreUsuario ?? '-'}</td>
                    <td>{c.departamentoReclusion ?? '-'}</td>
                    <td>{c.municipioReclusion ?? '-'}</td>
                    <td>{c.estado ?? '-'}</td>
                  </tr>
                ))}

                {!loadingCasos && defensorSeleccionado && casos.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '1rem' }}>
                      No hay registros para mostrar.
                    </td>
                  </tr>
                )}

                {!loadingCasos && !defensorSeleccionado && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '1rem' }}>
                      Seleccione un defensor para ver los casos asignados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsultaAsignacion;
