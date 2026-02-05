import { useEffect, useMemo, useState } from 'react';
import {
  getCondenados,
  getDefensores,
  getDefensoresCondenados,
  updatePpl,
} from '../services/api.js';
import Toast from '../components/Toast.jsx';
import { getEstadoEntrevista } from '../utils/entrevistaEstado.js';
import { displayOrDash } from '../utils/pplDisplay.js';

function tieneDefensor(value) {
  const cleaned = String(value ?? '').trim();
  return cleaned !== '' && cleaned !== '-';
}

function norm(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function AsignacionDefensores() {
  const [tab, setTab] = useState('asignacion'); // 'asignacion' | 'reasignacion'
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [toastOpen, setToastOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());

  const [defensores, setDefensores] = useState([]);
  const [nuevoDefensor, setNuevoDefensor] = useState('');

  const [fDocumento, setFDocumento] = useState('');
  const [fDepartamento, setFDepartamento] = useState('');
  const [fMunicipio, setFMunicipio] = useState('');
  const [fLugar, setFLugar] = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    documento: '',
    departamento: '',
    municipio: '',
    lugar: '',
  });

  async function cargarPpl() {
    setCargando(true);
    setError('');
    try {
      const data = await getCondenados();
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      console.error(e);
      setError('Error cargando PPL.');
      setRows([]);
    } finally {
      setCargando(false);
    }
  }

  async function cargarDefensoresActuales() {
    try {
      const [fromCsv, fromCondenados] = await Promise.all([
        getDefensores(), // backend/data/defensores.csv
        getDefensoresCondenados(), // distinct desde condenados
      ]);

      const a = Array.isArray(fromCsv?.defensores) ? fromCsv.defensores : [];
      const b = Array.isArray(fromCondenados?.defensores) ? fromCondenados.defensores : [];

      // Unifica sin duplicados (case-insensitive).
      const map = new Map();
      [...a, ...b].forEach((name) => {
        const val = String(name || '').trim();
        if (!val) return;
        const key = val.toLowerCase();
        if (!map.has(key)) map.set(key, val);
      });

      setDefensores(Array.from(map.values()));
    } catch (e) {
      console.error(e);
      setDefensores([]);
    }
  }

  useEffect(() => {
    cargarPpl();
    cargarDefensoresActuales();
  }, []);

  const defensoresOrdenados = useMemo(() => {
    return [...defensores].sort((a, b) => a.localeCompare(b));
  }, [defensores]);

  const departamentos = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const val = String(r?.departamentoLugarReclusion || '').trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [rows]);

  const municipios = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const val = String(r?.municipioLugarReclusion || '').trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [rows]);

  const lugares = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const val = String(r?.lugarReclusion || '').trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [rows]);

  const rowsTab = useMemo(() => {
    if (tab === 'asignacion') return rows.filter((r) => !tieneDefensor(r?.defensorAsignado));
    return rows.filter((r) => tieneDefensor(r?.defensorAsignado));
  }, [rows, tab]);

  const rowsFiltradas = useMemo(() => {
    const docNeedle = norm(filtrosAplicados.documento);
    const depNeedle = norm(filtrosAplicados.departamento);
    const munNeedle = norm(filtrosAplicados.municipio);
    const lugNeedle = norm(filtrosAplicados.lugar);

    return rowsTab.filter((r) => {
      const doc = norm(r?.numeroIdentificacion);
      if (docNeedle && !doc.includes(docNeedle)) return false;

      if (depNeedle) {
        const val = norm(r?.departamentoLugarReclusion);
        if (!val.includes(depNeedle)) return false;
      }

      if (munNeedle) {
        const val = norm(r?.municipioLugarReclusion);
        if (!val.includes(munNeedle)) return false;
      }

      if (lugNeedle) {
        const val = norm(r?.lugarReclusion);
        if (!val.includes(lugNeedle)) return false;
      }

      return true;
    });
  }, [rowsTab, filtrosAplicados]);

  const sugerenciaReasignacion = useMemo(() => {
    if (tab !== 'asignacion') return '';
    const needle = String(filtrosAplicados.documento || '').trim();
    if (!needle) return '';

    const hit = rows.find((r) => {
      const doc = String(r?.numeroIdentificacion || '');
      return doc.includes(needle) && tieneDefensor(r?.defensorAsignado);
    });

    if (!hit) return '';
    return `El documento ${hit.numeroIdentificacion} ya tiene defensor (${hit.defensorAsignado}). Use la pestana Reasignacion.`;
  }, [tab, rows, filtrosAplicados.documento]);

  const defensorActualSeleccionados = useMemo(() => {
    if (tab !== 'reasignacion') return '-';
    const current = rows
      .filter((r) => seleccionados.has(String(r.numeroIdentificacion)))
      .map((r) => String(r.defensorAsignado || '-'))
      .filter(Boolean);

    if (!current.length) return '-';
    return Array.from(new Set(current)).join(', ');
  }, [rows, seleccionados, tab]);

  function toggleSeleccion(doc) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(doc)) next.delete(doc);
      else next.add(doc);
      return next;
    });
  }

  function aplicarFiltros() {
    setError('');
    setToastOpen(false);
    setSeleccionados(new Set());
    setFiltrosAplicados({
      documento: String(fDocumento || '').trim(),
      departamento: String(fDepartamento || '').trim(),
      municipio: String(fMunicipio || '').trim(),
      lugar: String(fLugar || '').trim(),
    });

    // Un solo boton para refrescar y filtrar.
    cargarPpl();
    cargarDefensoresActuales();
  }

  function limpiarFiltros() {
    setFDocumento('');
    setFDepartamento('');
    setFMunicipio('');
    setFLugar('');
    setFiltrosAplicados({
      documento: '',
      departamento: '',
      municipio: '',
      lugar: '',
    });
    setSeleccionados(new Set());
    setError('');
    setToastOpen(false);
  }

  async function guardarAsignacion() {
    const documentos = Array.from(seleccionados);
    if (!documentos.length) {
      setError('Seleccione al menos un PPL.');
      return;
    }

    const defensor = String(nuevoDefensor || '').trim();
    if (!defensor) {
      setError('Seleccione o escriba un defensor.');
      return;
    }

    const existeEnLista = defensores.some(
      (d) => String(d || '').trim().toLowerCase() === defensor.toLowerCase()
    );
    if (!existeEnLista) {
      const confirmarCustom = window.confirm(
        'Nombre no esta en la lista de defensores. Desea guardar de todas formas?'
      );
      if (!confirmarCustom) return;
    }

    if (tab === 'asignacion') {
      const conDefensor = rows.filter(
        (r) =>
          seleccionados.has(String(r.numeroIdentificacion)) &&
          tieneDefensor(r?.defensorAsignado)
      );
      if (conDefensor.length > 0) {
        setError('Hay casos con defensor asignado. Use la pestana Reasignacion.');
        return;
      }
    }

    if (tab === 'reasignacion') {
      const confirmar = window.confirm('Confirmar reasignacion?');
      if (!confirmar) return;
    }

    setCargando(true);
    setError('');
    setToastOpen(false);
    try {
      await Promise.all(documentos.map((doc) => updatePpl(doc, { defensorAsignado: defensor })));

      setToastOpen(true);
      setSeleccionados(new Set());
      await cargarPpl();
      await cargarDefensoresActuales();
    } catch (e) {
      console.error(e);
      setError('Error guardando la asignacion.');
    } finally {
      setCargando(false);
    }
  }

  const tabButtonStyle = (active) =>
    active
      ? {}
      : { backgroundColor: '#eef3fb', color: '#345ea8', border: '2px solid #345ea8' };

  return (
    <div className="card">
      <h2>
        PAG - Asignación de Casos ({tab === 'asignacion' ? 'Asignación' : 'Reasignación'})
      </h2>

      <Toast
        open={toastOpen}
        message="Aurora — Cambios guardados correctamente"
        onClose={() => setToastOpen(false)}
      />

      {error && <p className="hint-text">{error}</p>}
      {cargando && <p>Cargando...</p>}
      {sugerenciaReasignacion && <p className="hint-text">{sugerenciaReasignacion}</p>}

      <div className="search-row" style={{ marginTop: '0.75rem' }}>
        <button
          className="primary-button"
          type="button"
          style={tabButtonStyle(tab === 'asignacion')}
          onClick={() => {
            setTab('asignacion');
            setSeleccionados(new Set());
            setError('');
            setToastOpen(false);
          }}
        >
          Asignación
        </button>
        <button
          className="primary-button"
          type="button"
          style={tabButtonStyle(tab === 'reasignacion')}
          onClick={() => {
            setTab('reasignacion');
            setSeleccionados(new Set());
            setError('');
            setToastOpen(false);
          }}
        >
          Reasignación
        </button>
      </div>

      <div className="filter-panel" style={{ marginTop: '1rem' }}>
        <h3 className="filter-title">Filtros</h3>

        <div className="grid-2" style={{ marginTop: '1rem' }}>
          <div className="form-field">
            <label>Departamento del lugar de reclusión</label>
            <input
              list="pag-departamentos-list"
              className="input-text"
              placeholder="Filtrar departamento"
              value={fDepartamento}
              onChange={(e) => setFDepartamento(e.target.value)}
            />
            <datalist id="pag-departamentos-list">
              {departamentos.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          <div className="form-field">
            <label>Municipio del lugar de reclusión</label>
            <input
              list="pag-municipios-list"
              className="input-text"
              placeholder="Filtrar municipio"
              value={fMunicipio}
              onChange={(e) => setFMunicipio(e.target.value)}
            />
            <datalist id="pag-municipios-list">
              {municipios.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div className="form-field">
            <label>Lugar de reclusión</label>
            <input
              list="pag-lugares-list"
              className="input-text"
              placeholder="Filtrar lugar de reclusión"
              value={fLugar}
              onChange={(e) => setFLugar(e.target.value)}
            />
            <datalist id="pag-lugares-list">
              {lugares.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>

          <div className="form-field">
            <label>Número de identificación</label>
            <input
              className="input-text"
              placeholder="Filtrar por documento"
              value={fDocumento}
              onChange={(e) => setFDocumento(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  aplicarFiltros();
                }
              }}
            />
          </div>
        </div>

        <div className="actions-center" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <button className="primary-button" type="button" onClick={aplicarFiltros}>
            Filtrar
          </button>
          <button className="primary-button" type="button" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>

        {(filtrosAplicados.departamento ||
          filtrosAplicados.municipio ||
          filtrosAplicados.lugar ||
          filtrosAplicados.documento) && (
          <p className="hint-text" style={{ marginTop: '0.75rem' }}>
            Filtros aplicados: {filtrosAplicados.departamento || '-'} / {filtrosAplicados.municipio || '-'} /{' '}
            {filtrosAplicados.lugar || '-'} / {filtrosAplicados.documento || '-'}
          </p>
        )}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 className="block-title">
          {tab === 'asignacion' ? 'Asignación de defensor' : 'Reasignación de defensor'}
        </h3>

        {tab === 'reasignacion' && (
          <p className="hint-text">Defensor actual (seleccionados): {defensorActualSeleccionados}</p>
        )}

        <div className="grid-2">
          <div className="form-field">
            <label>Nuevo defensor</label>
            <input
              list="pag-defensores-list"
              placeholder="Escriba para filtrar y seleccione un defensor"
              value={nuevoDefensor}
              onChange={(e) => setNuevoDefensor(e.target.value)}
              onMouseDown={(e) => {
                // Si el usuario hace doble click para "abrir" opciones, limpiamos el input.
                // Nota: onDoubleClick puede no disparar en algunos flujos (focus/scroll), esto lo hace consistente.
                if (e.detail === 2) setNuevoDefensor('');
              }}
              onDoubleClick={() => setNuevoDefensor('')}
            />
            <datalist id="pag-defensores-list">
              {defensoresOrdenados.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            {/* Mientras escribe, se filtran las sugerencias (autocompletado del navegador). */}
          </div>
          <div />
        </div>

        <div className="actions-center">
          <button className="save-button" onClick={guardarAsignacion} disabled={cargando}>
            {tab === 'asignacion' ? 'GUARDAR ASIGNACIÓN' : 'GUARDAR REASIGNACIÓN'}
          </button>
        </div>
      </div>

      <div className="asignados-layout" style={{ marginTop: '1rem' }}>
        <div className="asignados-table">
          <div className="table-container tall">
            <table className="data-table">
              <thead>
                <tr className="is-hidden">
                  <th />
                  <th>Número de identificación</th>
                  <th>Nombre usuario</th>
                  <th>Defensor actual</th>
                  <th>Lugar de reclusión</th>
                  <th>Departamento</th>
                  <th>Municipio</th>
                  <th>Autoridad a cargo</th>
                  <th>Número de proceso</th>
                  <th>Situación jurídica</th>
                </tr>

                <tr>
                  <th />
                  <th>Situación jurídica</th>
                  <th>Número de identificación</th>
                  <th>Nombre usuario</th>
                  <th>Departamento de reclusión</th>
                  <th>Municipio de reclusión</th>
                  <th>Estado</th>
                  <th>Defensor actual</th>
                  <th>Lugar de reclusión</th>
                  <th>Autoridad a cargo</th>
                  <th>Número de proceso</th>
                </tr>
              </thead>
              <tbody>
                {rowsFiltradas.map((r) => {
                  const doc = String(r.numeroIdentificacion);
                  const st = getEstadoEntrevista(r, 'condenado');
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
                      <td>{displayOrDash(r.situacionJuridica)}</td>
                      <td>{displayOrDash(r.numeroIdentificacion)}</td>
                      <td>{displayOrDash(r.nombreUsuario)}</td>
                      <td>{displayOrDash(r.departamentoLugarReclusion)}</td>
                      <td>{displayOrDash(r.municipioLugarReclusion)}</td>
                      <td>
                        <span className={`badge badge--${st.color}`}>{st.label}</span>
                      </td>
                      <td>{displayOrDash(r.defensorAsignado)}</td>
                      <td>{displayOrDash(r.lugarReclusion)}</td>
                      <td>{displayOrDash(r.autoridadCargo)}</td>
                      <td>{displayOrDash(r.numeroProceso)}</td>
                    </tr>
                  );
                })}

                {!cargando && rowsFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '1rem' }}>
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
