import { useEffect, useMemo, useState } from 'react';
import { getDefensores, getDefensoresCondenados, getPplListado } from '../services/api.js';
import { getEstadoEntrevista, pickActiveCaseData } from '../utils/entrevistaEstado.js';
import {
  displayOrDash,
  getDepartamentoReclusion,
  getMunicipioReclusion,
  getNombreUsuario,
  getNumeroIdentificacion,
  getSituacionJuridica,
} from '../utils/pplDisplay.js';

function prettifyHeader(key) {
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
  const data = pickActiveCaseData(row);
  return data?.[key];
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
  const fallback = columns.find((c) => /doc|ident|cedul|id/i.test(String(c)));
  return fallback || null;
}

export default function RegistrosAsignados({ onSelectRegistro }) {
  const [tipoPpl, setTipoPpl] = useState('condenado');
  const [cargando, setCargando] = useState(true);

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [fDocumento, setFDocumento] = useState('');
  const [fEstado, setFEstado] = useState('-');
  const [fAvance, setFAvance] = useState('-');
  const [fDepartamento, setFDepartamento] = useState('');
  const [fMunicipio, setFMunicipio] = useState('');
  const [fEstablecimiento, setFEstablecimiento] = useState('');
  const [fDefensor, setFDefensor] = useState('');
  const [fColumna, setFColumna] = useState('__all__'); // '__all__' o nombre de columna
  const [fValorColumna, setFValorColumna] = useState('');

  const [defensorInput, setDefensorInput] = useState('');
  const [defensores, setDefensores] = useState([]);

  useEffect(() => {
    let alive = true;

    async function cargarDefensores() {
      try {
        const [fromCsv, fromCondenados] = await Promise.all([
          getDefensores(), // backend/data/defensores.csv (opcional)
          getDefensoresCondenados(), // distinct desde condenados.csv
        ]);

        const a = Array.isArray(fromCsv?.defensores) ? fromCsv.defensores : [];
        const b = Array.isArray(fromCondenados?.defensores) ? fromCondenados.defensores : [];

        const map = new Map();
        [...a, ...b].forEach((name) => {
          const val = String(name || '').trim();
          if (!val) return;
          const key = val.toLowerCase();
          if (!map.has(key)) map.set(key, val);
        });

        if (alive) setDefensores(Array.from(map.values()));
      } catch (e) {
        console.error(e);
        if (alive) setDefensores([]);
      }
    }

    cargarDefensores();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function cargar() {
      setCargando(true);
      try {
        const data = await getPplListado(tipoPpl);
        if (!alive) return;

        const cols = Array.isArray(data?.columns) ? data.columns : [];
        const rws = Array.isArray(data?.rows) ? data.rows : [];

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

  const defensoresOrdenados = useMemo(() => {
    return [...defensores].sort((a, b) => a.localeCompare(b));
  }, [defensores]);

  const documentoKey = useMemo(() => findDocumentoKey(columns), [columns]);

  const estadosDisponibles = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const st = getEstadoEntrevista(r, tipoPpl);
      if (st?.code) map.set(st.code, st.label);
    });
    return Array.from(map.entries()).map(([code, label]) => ({ code, label }));
  }, [rows, tipoPpl]);

  const avancesDisponibles = useMemo(() => {
    if (!columns.includes('avanceFormulario')) return [];
    const set = new Set(rows.map((r) => String(r?.avanceFormulario ?? '')).filter(Boolean));
    return Array.from(set);
  }, [rows, columns]);

  const rowsFiltradas = useMemo(() => {
    const docNeedle = fDocumento.trim();
    const needle = fValorColumna.trim().toLowerCase();

    return rows.filter((r) => {
      const obj = r || {};
      const data = pickActiveCaseData(obj);

      if (docNeedle) {
        const docVal = String(getNumeroIdentificacion(obj) ?? '');
        if (!docVal.includes(docNeedle)) return false;
      }

      if (fEstado !== '-') {
        const st = getEstadoEntrevista(obj, tipoPpl);
        if (String(st?.code || '') !== fEstado) return false;
      }
      if (fAvance !== '-' && columns.includes('avanceFormulario')) {
        if (String(data?.avanceFormulario ?? '') !== fAvance) return false;
      }

      if (fDepartamento) {
        if (
          !String(getDepartamentoReclusion(obj, tipoPpl) ?? '')
            .toLowerCase()
            .includes(fDepartamento.trim().toLowerCase())
        )
          return false;
      }
      if (fMunicipio) {
        if (
          !String(getMunicipioReclusion(obj, tipoPpl) ?? '')
            .toLowerCase()
            .includes(fMunicipio.trim().toLowerCase())
        )
          return false;
      }
      if (fEstablecimiento) {
        if (
          !String(data?.establecimientoReclusion ?? data?.Establecimiento ?? '')
            .toLowerCase()
            .includes(fEstablecimiento.trim().toLowerCase())
        )
          return false;
      }
      if (fDefensor) {
        const defVal =
          data?.defensorAsignado ??
          data?.['Defensor(a) Público(a) Asignado para tramitar la solicitud'] ??
          data?.['Defensor(a) PÃºblico(a) Asignado para tramitar la solicitud'] ??
          '';
        if (!String(defVal ?? '').toLowerCase().includes(fDefensor.trim().toLowerCase())) {
          return false;
        }
      }

      if (needle) {
        if (fColumna === '__all__' || !fColumna) {
          const hay = columns.some((c) => String(getCellValue(obj, c) ?? '').toLowerCase().includes(needle));
          if (!hay) return false;
        } else {
          const val = String(getCellValue(obj, fColumna) ?? '').toLowerCase();
          if (!val.includes(needle)) return false;
        }
      }

      return true;
    });
  }, [
    rows,
    columns,
    tipoPpl,
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
    setFDocumento('');
    setFEstado('-');
    setFAvance('-');
    setFDepartamento('');
    setFMunicipio('');
    setFEstablecimiento('');
    setFDefensor('');
    setDefensorInput('');
    setFColumna('__all__');
    setFValorColumna('');
  }

  function aplicarDefensorPanel() {
    setFDefensor(String(defensorInput || '').trim());
  }

  const orderedColumns = useMemo(() => {
    const fixed = [
      '__situacionJuridica__',
      '__numeroIdentificacion__',
      '__nombreUsuario__',
      '__departamentoReclusion__',
      '__municipioReclusion__',
      '__estadoEntrevista__',
    ];

    const remove = new Set([
      // Documento
      'numeroIdentificacion',
      'Title',
      'title',
      'TITLE',
      // Nombre
      'Nombre usuario',
      'nombre',
      'nombreUsuario',
      'NombreUsuario',
      // Situacion juridica
      'Situación jurídica ',
      'SituaciÃ³n jurÃ­dica ',
      'situacionJuridica',
      'situacionJuridicaActualizada',
      // Departamento / municipio
      'Departamento del lugar de reclusión',
      'Departamento del lugar de reclusiÃ³n',
      'departamentoLugarReclusion',
      'departamentoEron',
      'departamento',
      'Municipio del lugar de reclusión',
      'Municipio del lugar de reclusiÃ³n',
      'municipioLugarReclusion',
      'municipioEron',
      'municipio',
      // Estado (fuente)
      'Estado entrevista',
      'estadoEntrevista',
      'estado',
      // Tecnicos
      'casos',
      'activeCaseId',
    ]);

    const rest = (columns || []).filter((c) => !remove.has(c));
    return [...fixed, ...rest];
  }, [columns]);

  function renderHeader(col) {
    if (col === '__situacionJuridica__') return 'Situación jurídica';
    if (col === '__numeroIdentificacion__') return 'Número de identificación';
    if (col === '__nombreUsuario__') return 'Nombre usuario';
    if (col === '__departamentoReclusion__') return 'Departamento de reclusión';
    if (col === '__municipioReclusion__') return 'Municipio de reclusión';
    if (col === '__estadoEntrevista__') return 'Estado';
    return getHeaderLabel(col);
  }

  function renderCell(row, col) {
    if (col === '__situacionJuridica__') return displayOrDash(getSituacionJuridica(row, tipoPpl));
    if (col === '__numeroIdentificacion__') return displayOrDash(getNumeroIdentificacion(row));
    if (col === '__nombreUsuario__') return displayOrDash(getNombreUsuario(row, tipoPpl));
    if (col === '__departamentoReclusion__') return displayOrDash(getDepartamentoReclusion(row, tipoPpl));
    if (col === '__municipioReclusion__') return displayOrDash(getMunicipioReclusion(row, tipoPpl));
    if (col === '__estadoEntrevista__') {
      const st = getEstadoEntrevista(row, tipoPpl);
      return <span className={`badge badge--${st.color}`}>{st.label}</span>;
    }
    return displayOrDash(getCellValue(row, col));
  }

  function handleRowClick(r) {
    const doc = String(getNumeroIdentificacion(r) || '').trim();
    if (!doc) return;
    if (typeof onSelectRegistro === 'function') {
      onSelectRegistro({ numeroIdentificacion: String(doc), tipoPpl });
    }
  }

  return (
    <div className="card">
      <h2>Usuarios asignados</h2>

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
          {mostrarFiltros && (
            <div className="filter-panel">
              <h3 className="filter-title">Búsqueda</h3>

              <div className="form-field">
                <label>Buscar en</label>
                <select
                  value={fColumna}
                  onChange={(e) => {
                    setFColumna(e.target.value);
                    setFValorColumna('');
                  }}
                >
                  <option value="__all__">Todas las columnas</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {getHeaderLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>¿Qué desea buscar?</label>
                <input
                  className="input-text"
                  placeholder={
                    fColumna && fColumna !== '__all__'
                      ? `Escriba ${getHeaderLabel(fColumna).toLowerCase()}`
                      : 'Escriba una palabra (nombre, documento, proceso...)'
                  }
                  value={fValorColumna}
                  onChange={(e) => setFValorColumna(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Estado de entrevista</label>
                <select value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                  <option value="-">-</option>
                  {estadosDisponibles.map((v) => (
                    <option key={v.code} value={v.code}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              {columns.includes('avanceFormulario') && (
                <div className="form-field">
                  <label>Avance del formulario</label>
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
                    placeholder="Escriba el departamento"
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
                    placeholder="Escriba el municipio"
                    value={fMunicipio}
                    onChange={(e) => setFMunicipio(e.target.value)}
                  />
                </div>
              )}

              {columns.includes('establecimientoReclusion') && (
                <div className="form-field">
                  <label>Lugar de reclusión</label>
                  <input
                    className="input-text"
                    placeholder="Escriba el lugar"
                    value={fEstablecimiento}
                    onChange={(e) => setFEstablecimiento(e.target.value)}
                  />
                </div>
              )}

              <div className="filter-subsection">
                <div className="filter-subsection__title">Opcionales</div>

                {documentoKey && (
                  <div className="form-field">
                    <label>Buscar por N° de documento</label>
                    <input
                      className="input-text"
                      placeholder="Escriba el número"
                      value={fDocumento}
                      onChange={(e) => setFDocumento(e.target.value)}
                    />
                  </div>
                )}

                <div className="search-row">
                  <div className="form-field" style={{ minWidth: 320 }}>
                    <label>Defensor</label>
                    <input
                      list="defensores-registros"
                      placeholder="Escriba o seleccione un defensor"
                      value={defensorInput}
                      onChange={(e) => setDefensorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          aplicarDefensorPanel();
                        }
                      }}
                    />
                    <datalist id="defensores-registros">
                      {defensoresOrdenados.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>

                  <button
                    className="primary-button primary-button--search"
                    type="button"
                    onClick={aplicarDefensorPanel}
                  >
                    Aplicar
                  </button>
                </div>

                {fDefensor && (
                  <p className="hint-text">Defensor aplicado: {fDefensor}</p>
                )}
              </div>

              <button className="primary-button full" type="button" onClick={reiniciar}>
                Limpiar filtros
              </button>
            </div>
          )}

          <div className="asignados-table">
            <div className="table-container tall">
              <table className="data-table">
                <thead>
                  <tr>
                    {orderedColumns.map((c) => (
                      <th key={c}>{renderHeader(c)}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rowsFiltradas.map((r, idx) => {
                    const key =
                      (documentoKey && pickActiveCaseData(r)?.[documentoKey]) ||
                      getNumeroIdentificacion(r) ||
                      r?.id ||
                      idx;

                    return (
                      <tr
                        key={String(key)}
                        onClick={() => handleRowClick(r)}
                        className="clickable-row"
                      >
                        {orderedColumns.map((c) => (
                          <td key={c}>{renderCell(r, c)}</td>
                        ))}
                      </tr>
                    );
                  })}

                  {rowsFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={Math.max(orderedColumns.length, 1)} style={{ textAlign: 'center', padding: '1rem' }}>
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
