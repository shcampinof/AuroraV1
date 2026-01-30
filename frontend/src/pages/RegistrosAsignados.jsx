import { useEffect, useMemo, useState } from 'react';
import { getPplListado } from '../services/api.js';

function prettifyHeader(key) {
  // convierte camelCase / snake_case a “Título bonito”
  if (!key) return '';
  const spaced = String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const EXTRA_COLUMNS = ['posibleActuacionJudicial'];

const HEADER_LABELS = {
  Title: 'Número de identificación',
  TITLE: 'Número de identificación',
  title: 'Número de identificación',
  numeroIdentificacion: 'Número de identificación',
  establecimientoReclusion: 'Lugar de reclusión',
  departamentoEron: 'Departamento del lugar de reclusión',
  municipioEron: 'Municipio del lugar de reclusión',
  numeroProceso: 'Número de proceso',
  numeroProcesoJudicial: 'Número de proceso',
  proceso: 'Número de proceso',
  Proceso: 'Número de proceso',
  PROCESO: 'Número de proceso',
  posibleActuacionJudicial: 'Posible actuación judicial a adelantar',
};

function getHeaderLabel(key) {
  if (!key) return '';
  if (HEADER_LABELS[key]) return HEADER_LABELS[key];
  return prettifyHeader(key);
}

function getCellValue(row, key) {
  if (key === 'posibleActuacionJudicial') {
    return row?.posibleActuacionJudicial ?? '-';
  }
  return row?.[key];
}

function findDocumentoKey(columns) {
  if (!Array.isArray(columns)) return null;
  const candidates = [
    'numeroIdentificacion',
    'documento',
    'cedula',
    'noDocumento',
    'numero_documento',
    'id',
    'identificacion',
  ];
  const lowerMap = new Map(columns.map((c) => [String(c).toLowerCase(), c]));
  for (const cand of candidates) {
    const hit = lowerMap.get(cand.toLowerCase());
    if (hit) return hit;
  }
  // fallback: primera columna que parezca documento
  const fallback = columns.find((c) => /doc|ident|cedul|id/i.test(String(c)));
  return fallback || null;
}

export default function RegistrosAsignados({ onSelectRegistro }) {
  const [tipoPpl, setTipoPpl] = useState('condenado'); // 'condenado' | 'sindicado'
  const [cargando, setCargando] = useState(true);

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  // filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [fTexto, setFTexto] = useState('');
  const [fDocumento, setFDocumento] = useState('');
  const [fEstado, setFEstado] = useState('-');
  const [fAvance, setFAvance] = useState('-');
  const [fDepartamento, setFDepartamento] = useState('');
  const [fMunicipio, setFMunicipio] = useState('');
  const [fEstablecimiento, setFEstablecimiento] = useState('');
  const [fDefensor, setFDefensor] = useState('');
  const [fColumna, setFColumna] = useState('');
  const [fValorColumna, setFValorColumna] = useState('');

  useEffect(() => {
    let alive = true;

    async function cargar() {
      setCargando(true);
      try {
        const data = await getPplListado(tipoPpl);

        if (!alive) return;

        const cols = Array.isArray(data?.columns) ? data.columns : [];
        const rws = Array.isArray(data?.rows) ? data.rows : [];

        // fallback: si no viene columns, inferimos desde las keys
        const inferred =
          cols.length > 0
            ? cols
            : Array.from(
                rws.reduce((acc, r) => {
                  Object.keys(r || {}).forEach((k) => acc.add(k));
                  return acc;
                }, new Set())
              );

        const withExtras = [...inferred];
        for (const extra of EXTRA_COLUMNS) {
          if (!withExtras.includes(extra)) withExtras.push(extra);
        }

        setColumns(withExtras);
        setRows(rws);
      } catch (e) {
        console.error(e);
        if (alive) {
          setColumns([]);
          setRows([]);
        }
      } finally {
        if (alive) setCargando(false);
      }
    }

    cargar();
    return () => {
      alive = false;
    };
  }, [tipoPpl]);

  const documentoKey = useMemo(() => findDocumentoKey(columns), [columns]);

  const estadosDisponibles = useMemo(() => {
    if (!columns.includes('estadoEntrevista')) return [];
    const set = new Set(rows.map((r) => String(r?.estadoEntrevista ?? '')).filter(Boolean));
    return Array.from(set);
  }, [rows, columns]);

  const avancesDisponibles = useMemo(() => {
    if (!columns.includes('avanceFormulario')) return [];
    const set = new Set(rows.map((r) => String(r?.avanceFormulario ?? '')).filter(Boolean));
    return Array.from(set);
  }, [rows, columns]);

  const rowsFiltradas = useMemo(() => {
    const txt = fTexto.trim().toLowerCase();
    const docNeedle = fDocumento.trim();
    const colNeedle = fValorColumna.trim().toLowerCase();

    return rows.filter((r) => {
      const obj = r || {};

      // filtro documento (si existe key)
      if (docNeedle && documentoKey) {
        const docVal = String(obj[documentoKey] ?? '');
        if (!docVal.includes(docNeedle)) return false;
      }

      // estado/avance solo si existen
      if (fEstado !== '-' && columns.includes('estadoEntrevista')) {
        if (String(obj.estadoEntrevista ?? '') !== fEstado) return false;
      }
      if (fAvance !== '-' && columns.includes('avanceFormulario')) {
        if (String(obj.avanceFormulario ?? '') !== fAvance) return false;
      }

      // text filters por campos “clásicos” si existen
      if (fDepartamento && columns.includes('departamentoEron')) {
        if (!String(obj.departamentoEron ?? '').toLowerCase().includes(fDepartamento.trim().toLowerCase()))
          return false;
      }
      if (fMunicipio && columns.includes('municipioEron')) {
        if (!String(obj.municipioEron ?? '').toLowerCase().includes(fMunicipio.trim().toLowerCase()))
          return false;
      }
      if (fEstablecimiento && columns.includes('establecimientoReclusion')) {
        if (
          !String(obj.establecimientoReclusion ?? '')
            .toLowerCase()
            .includes(fEstablecimiento.trim().toLowerCase())
        )
          return false;
      }
      if (fDefensor && columns.includes('defensorAsignado')) {
        if (!String(obj.defensorAsignado ?? '').toLowerCase().includes(fDefensor.trim().toLowerCase()))
          return false;
      }

      // filtro por columna seleccionada
      if (fColumna && colNeedle) {
        const val = String(getCellValue(obj, fColumna) ?? '').toLowerCase();
        if (!val.includes(colNeedle)) return false;
      }

      // filtro global (busca en TODAS las columnas)
      if (txt) {
        const hay = columns.some((c) => String(getCellValue(obj, c) ?? '').toLowerCase().includes(txt));
        if (!hay) return false;
      }

      return true;
    });
  }, [
    rows,
    columns,
    documentoKey,
    fTexto,
    fDocumento,
    fEstado,
    fAvance,
    fDepartamento,
    fMunicipio,
    fEstablecimiento,
    fDefensor,
    fColumna,
    fValorColumna,
  ]);

  function reiniciar() {
    setFTexto('');
    setFDocumento('');
    setFEstado('-');
    setFAvance('-');
    setFDepartamento('');
    setFMunicipio('');
    setFEstablecimiento('');
    setFDefensor('');
    setFColumna('');
    setFValorColumna('');
  }

  function handleRowClick(r) {
    // para abrir formulario: mandamos doc + tipo
    const doc = documentoKey ? r?.[documentoKey] : r?.numeroIdentificacion;

    if (!doc) return;

    // soporta tu versión anterior si solo recibías string
    if (typeof onSelectRegistro === 'function') {
      onSelectRegistro({ numeroIdentificacion: String(doc), tipoPpl });
    }
  }

  return (
    <div className="card">
      <h2>Usuarios asignados</h2>

      {/* Selector Condenados/Sindicados */}
      <div className="search-row" style={{ marginBottom: '0.75rem' }}>
        <div className="form-field" style={{ marginBottom: 0, minWidth: 220 }}>
          <label>Tipo de PPL</label>
          <select value={tipoPpl} onChange={(e) => setTipoPpl(e.target.value)}>
          <option value="condenado">Condenados</option>
          <option value="sindicado">Sindicados</option>
          </select>
        </div>

        <button
          className="primary-button primary-button--search"
          type="button"
          onClick={() => setMostrarFiltros((v) => !v)}
          aria-expanded={mostrarFiltros}
        >
          {mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
      </div>

      {cargando && <p>Cargando.</p>}

      {!cargando && (
        <div className="asignados-layout">
          {/* Panel filtros (arriba) */}
          {mostrarFiltros && (
            <div className="filter-panel">
              <h3 className="filter-title">Filtrar</h3>

              <div className="form-field">
                <label>Filtrar por columna</label>
                <select
                  value={fColumna}
                  onChange={(e) => {
                    setFColumna(e.target.value);
                    setFValorColumna('');
                  }}
                >
                  <option value="">-</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {getHeaderLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Buscar por palabra</label>
                <input
                  className="input-text"
                  placeholder={fColumna ? 'Escriba para filtrar' : 'Seleccione una columna'}
                  value={fValorColumna}
                  onChange={(e) => setFValorColumna(e.target.value)}
                  disabled={!fColumna}
                />
              </div>

              <div className="form-field">
                <label>Bússqueda global</label>
                <input
                  className="input-text"
                  placeholder="Buscar en todas las columnas"
                  value={fTexto}
                  onChange={(e) => setFTexto(e.target.value)}
                />
              </div>

              {documentoKey && (
                <div className="form-field">
                  <label>No. Documento</label>
                  <input
                    className="input-text"
                    placeholder="Buscar No. ID"
                    value={fDocumento}
                    onChange={(e) => setFDocumento(e.target.value)}
                  />
                </div>
              )}

              {columns.includes('estadoEntrevista') && (
                <div className="form-field">
                  <label>Estado de Entrevista</label>
                  <select value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                    <option value="-">-</option>
                    {estadosDisponibles.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {columns.includes('avanceFormulario') && (
                <div className="form-field">
                  <label>Avance Formulario</label>
                  <select value={fAvance} onChange={(e) => setFAvance(e.target.value)}>
                    <option value="-">-</option>
                    {avancesDisponibles.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {columns.includes('departamentoEron') && (
                <div className="form-field">
                  <label>Departamento del lugar de reclusión</label>
                  <input
                    className="input-text"
                    placeholder="Buscar Departamento"
                    value={fDepartamento}
                    onChange={(e) => setFDepartamento(e.target.value)}
                  />
                </div>
              )}

              {columns.includes('municipioEron') && (
                <div className="form-field">
                  <label>Municipio del lugar de reclusión</label>
                  <input
                    className="input-text"
                    placeholder="Buscar Municipio"
                    value={fMunicipio}
                    onChange={(e) => setFMunicipio(e.target.value)}
                  />
                </div>
              )}

              {columns.includes('establecimientoReclusion') && (
                <div className="form-field">
                  <label>Lugar de reclusiÃ³n</label>
                  <input
                    className="input-text"
                    placeholder="Buscar Lugar de reclusiÃ³n"
                    value={fEstablecimiento}
                    onChange={(e) => setFEstablecimiento(e.target.value)}
                  />
                </div>
              )}

              {columns.includes('defensorAsignado') && (
                <div className="form-field">
                  <label>Defensor</label>
                  <input
                    className="input-text"
                    placeholder="Buscar Defensor"
                    value={fDefensor}
                    onChange={(e) => setFDefensor(e.target.value)}
                  />
                </div>
              )}

              <button className="primary-button full" type="button" onClick={reiniciar}>
                Limpiar filtros
              </button>
            </div>
          )}

          {/* Tabla */}
          <div className="asignados-table">
            <div className="table-container tall">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c}>{getHeaderLabel(c)}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rowsFiltradas.map((r, idx) => {
                    const key =
                      (documentoKey && r?.[documentoKey]) ||
                      r?.numeroIdentificacion ||
                      r?.id ||
                      idx;

                    return (
                      <tr
                        key={String(key)}
                        onClick={() => handleRowClick(r)}
                        className="clickable-row"
                      >
                        {columns.map((c) => (
                          <td key={c}>{String(getCellValue(r, c) ?? '')}</td>
                        ))}
                      </tr>
                    );
                  })}

                  {rowsFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={Math.max(columns.length, 1)} style={{ textAlign: 'center', padding: '1rem' }}>
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
        </div>
      )}
    </div>
  );
}
