import { useEffect, useMemo, useState } from 'react';
import {
  asignarDefensor,
  createDefensor,
  getCondenados,
  getDefensores,
} from '../services/api.js';

function AsignacionDefensores() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [rows, setRows] = useState([]);
  const [defensores, setDefensores] = useState([]);

  const [fCedula, setFCedula] = useState('');
  const [fDepartamento, setFDepartamento] = useState('');
  const [fMunicipio, setFMunicipio] = useState('');
  const [fLugar, setFLugar] = useState('');

  const [seleccionados, setSeleccionados] = useState(new Set());
  const [defensorNuevo, setDefensorNuevo] = useState('');

  async function cargarCondenados() {
    setCargando(true);
    setError('');
    try {
      const data = await getCondenados();
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      console.error(e);
      setError('Error cargando condenados.');
    } finally {
      setCargando(false);
    }
  }

  async function cargarDefensores() {
    try {
      const data = await getDefensores();
      setDefensores(Array.isArray(data?.defensores) ? data.defensores : []);
    } catch (e) {
      console.error(e);
      setDefensores([]);
    }
  }

  useEffect(() => {
    cargarCondenados();
    cargarDefensores();
  }, []);

  const rowsSinDefensor = useMemo(() => {
    return rows.filter((r) => !String(r?.defensorAsignado || '').trim());
  }, [rows]);

  const departamentos = useMemo(() => {
    const set = new Set();
    rowsSinDefensor.forEach((r) => {
      const val = String(r?.departamentoLugarReclusion || '').trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [rowsSinDefensor]);

  const municipios = useMemo(() => {
    const set = new Set();
    rowsSinDefensor.forEach((r) => {
      const val = String(r?.municipioLugarReclusion || '').trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [rowsSinDefensor]);

  const lugares = useMemo(() => {
    const set = new Set();
    rowsSinDefensor.forEach((r) => {
      const val = String(r?.lugarReclusion || '').trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [rowsSinDefensor]);

  const rowsFiltradas = useMemo(() => {
    const docNeedle = fCedula.trim();
    const depNeedle = fDepartamento.trim().toLowerCase();
    const munNeedle = fMunicipio.trim().toLowerCase();
    const lugNeedle = fLugar.trim().toLowerCase();

    return rowsSinDefensor.filter((r) => {
      const doc = String(r?.numeroIdentificacion || '');
      if (docNeedle && !doc.includes(docNeedle)) return false;

      if (depNeedle) {
        const val = String(r?.departamentoLugarReclusion || '').toLowerCase();
        if (!val.includes(depNeedle)) return false;
      }

      if (munNeedle) {
        const val = String(r?.municipioLugarReclusion || '').toLowerCase();
        if (!val.includes(munNeedle)) return false;
      }

      if (lugNeedle) {
        const val = String(r?.lugarReclusion || '').toLowerCase();
        if (!val.includes(lugNeedle)) return false;
      }

      return true;
    });
  }, [rowsSinDefensor, fCedula, fDepartamento, fMunicipio, fLugar]);

  const allVisibleSelected = useMemo(() => {
    if (!rowsFiltradas.length) return false;
    return rowsFiltradas.every((r) => seleccionados.has(String(r.numeroIdentificacion)));
  }, [rowsFiltradas, seleccionados]);

  function toggleSeleccion(doc) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(doc)) next.delete(doc);
      else next.add(doc);
      return next;
    });
  }

  function toggleSeleccionTodos() {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      const visibles = rowsFiltradas.map((r) => String(r.numeroIdentificacion));
      const allSelected = visibles.every((doc) => next.has(doc));
      if (allSelected) {
        visibles.forEach((doc) => next.delete(doc));
      } else {
        visibles.forEach((doc) => next.add(doc));
      }
      return next;
    });
  }

  function limpiarFiltros() {
    setFCedula('');
    setFDepartamento('');
    setFMunicipio('');
    setFLugar('');
  }

  async function asignarSeleccionados() {
    const documentos = Array.from(seleccionados);
    if (!documentos.length) {
      setError('Seleccione al menos un PPL.');
      setExito('');
      return;
    }

    const nuevo = String(defensorNuevo || '').trim();
    if (!nuevo) {
      setError('Ingrese un defensor.');
      setExito('');
      return;
    }

    setCargando(true);
    setError('');
    setExito('');
    try {
      const exists = defensores.some((d) => d.toLowerCase() === nuevo.toLowerCase());
      if (!exists) {
        await createDefensor(nuevo);
        await cargarDefensores();
      }

      await asignarDefensor(nuevo, documentos);
      setExito('Defensor asignado correctamente.');
      setSeleccionados(new Set());
      await cargarCondenados();
    } catch (e) {
      console.error(e);
      setError('Error asignando defensor.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="card">
      <h2>PAG - Asignacion de Casos</h2>

      {error && <p className="hint-text">{error}</p>}
      {exito && <p className="hint-text">{exito}</p>}
      {cargando && <p>Cargando...</p>}

      <div className="filter-panel" style={{ marginTop: '1rem' }}>
        <h3 className="filter-title">Filtros</h3>

        <div className="grid-2">
          <div className="form-field">
            <label>Numero de identificacion</label>
            <input
              className="input-text"
              placeholder="Filtrar por cedula"
              value={fCedula}
              onChange={(e) => setFCedula(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Departamento del lugar de reclusion</label>
            <input
              list="departamentos-list"
              className="input-text"
              placeholder="Filtrar departamento"
              value={fDepartamento}
              onChange={(e) => setFDepartamento(e.target.value)}
            />
            <datalist id="departamentos-list">
              {departamentos.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          <div className="form-field">
            <label>Municipio del lugar de reclusion</label>
            <input
              list="municipios-list"
              className="input-text"
              placeholder="Filtrar municipio"
              value={fMunicipio}
              onChange={(e) => setFMunicipio(e.target.value)}
            />
            <datalist id="municipios-list">
              {municipios.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div className="form-field">
            <label>Lugar de reclusion</label>
            <input
              list="lugares-list"
              className="input-text"
              placeholder="Filtrar lugar de reclusion"
              value={fLugar}
              onChange={(e) => setFLugar(e.target.value)}
            />
            <datalist id="lugares-list">
              {lugares.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
        </div>

        <button className="primary-button full" type="button" onClick={limpiarFiltros}>
          Limpiar filtros
        </button>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 className="block-title">Asignar defensor a seleccionados</h3>
        <div className="grid-2">
          <div className="form-field">
            <label>Defensor</label>
            <input
              list="defensores-list"
              placeholder="Escriba o seleccione un defensor"
              value={defensorNuevo}
              onChange={(e) => setDefensorNuevo(e.target.value)}
            />
            <datalist id="defensores-list">
              {defensores.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <div className="hint-text">Puede escribir el nombre completo o elegir una sugerencia.</div>
          </div>
        </div>

        <div className="actions-center">
          <button className="save-button" onClick={asignarSeleccionados} disabled={cargando}>
            GUARDAR ASIGNACION
          </button>
        </div>
      </div>

      <div className="asignados-layout" style={{ marginTop: '1rem' }}>
        <div className="asignados-table">
          <div className="table-container tall">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSeleccionTodos}
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th>Numero de identificacion</th>
                  <th>Nombre de usuario</th>
                  <th>Lugar de reclusion</th>
                  <th>Departamento del lugar de reclusion</th>
                  <th>Municipio del lugar de reclusion</th>
                  <th>Autoridad a cargo</th>
                  <th>Numero de proceso</th>
                  <th>Situacion juridica</th>
                  <th>Posible actuacion judicial a adelantar</th>
                </tr>
              </thead>
              <tbody>
                {rowsFiltradas.map((r) => {
                  const doc = String(r.numeroIdentificacion);
                  return (
                    <tr key={doc} className="clickable-row" onClick={() => toggleSeleccion(doc)}>
                      <td>
                        <input
                          type="checkbox"
                          checked={seleccionados.has(doc)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSeleccion(doc)}
                          aria-label={`Seleccionar ${doc}`}
                        />
                      </td>
                      <td>{r.numeroIdentificacion}</td>
                      <td>{r.nombreUsuario}</td>
                      <td>{r.lugarReclusion}</td>
                      <td>{r.departamentoLugarReclusion}</td>
                      <td>{r.municipioLugarReclusion}</td>
                      <td>{r.autoridadCargo}</td>
                      <td>{r.numeroProceso}</td>
                      <td>{r.situacionJuridica}</td>
                      <td>{r.posibleActuacionJudicial}</td>
                    </tr>
                  );
                })}

                {!cargando && rowsFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '1rem' }}>
                      No hay registros para mostrar.
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

export default AsignacionDefensores;
