import { useEffect, useMemo, useState } from 'react';
import { getDefensores, getPplListado } from '../services/api.js';
import { pickActiveCaseData } from '../utils/entrevistaEstado.js';
import { displayOrDash } from '../utils/pplDisplay.js';
import { evaluateAuroraRules } from '../utils/evaluateAuroraRules.ts';

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
    'Número de identificación',
    'Numero de identificacion',
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

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeEstado(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getEstadoClass(estado) {
  const key = normalizeEstado(estado);
  if (key === 'analizar el caso') return 'estado--verde';
  if (key === 'entrevistar al usuario') return 'estado--amarillo';
  if (key === 'presentar solicitud') return 'estado--rojo';
  if (key === 'pendiente decision') return 'estado--azul';
  if (key === 'caso cerrado') return 'estado--gris';
  return '';
}

function distinctSorted(rows, getter) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const val = String(getter(row) || '').trim();
    if (!val) return;
    const key = val.toLowerCase();
    if (!map.has(key)) map.set(key, val);
  });
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

function DropdownField({ label, value, onChange, options, searchable = false, listId }) {
  const normalizedOptions = (Array.isArray(options) ? options : []).map((opt) => {
    if (opt && typeof opt === 'object') {
      return {
        value: String(opt.value ?? ''),
        label: String(opt.label ?? opt.value ?? ''),
      };
    }
    return {
      value: String(opt ?? ''),
      label: String(opt ?? ''),
    };
  });

  return (
    <div className="form-field">
      <label>{label}</label>
      {searchable ? (
        <>
          <input
            list={listId}
            className="input-text"
            placeholder="Seleccione"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <datalist id={listId}>
            {normalizedOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </datalist>
        </>
      ) : (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Todos</option>
          {normalizedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder = 'Escriba para buscar',
  listId,
  options,
  type = 'text',
  inputMode,
  pattern,
}) {
  const normalizedOptions = (Array.isArray(options) ? options : []).map((opt) => String(opt ?? '').trim()).filter(Boolean);
  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        list={listId}
        className="input-text"
        type={type}
        inputMode={inputMode}
        pattern={pattern}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {listId && normalizedOptions.length > 0 && (
        <datalist id={listId}>
          {normalizedOptions.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      )}
    </div>
  );
}

function getColumnWidth(col) {
  const widths = {
    __situacionJuridica__: 110,
    __numeroIdentificacion__: 160,
    __nombreUsuario__: 180,
    __defensor__: 140,
    __lugarPrivacion__: 180,
    __estadoTramite__: 120,
    __departamentoReclusion__: 185,
    __municipioReclusion__: 185,
  };
  return widths[col] || 170;
}

export default function RegistrosAsignados({ onSelectRegistro }) {
  const [cargando, setCargando] = useState(true);

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [filtrosDraft, setFiltrosDraft] = useState({
    defensor: '',
    nombre: '',
    documento: '',
    lugar: '',
    departamento: '',
    municipio: '',
    estado: '',
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    defensor: '',
    nombre: '',
    documento: '',
    lugar: '',
    departamento: '',
    municipio: '',
    estado: '',
  });
  const [filtroAdicionalSeleccionado, setFiltroAdicionalSeleccionado] = useState('');

  const [defensores, setDefensores] = useState([]);

  function getNumeroIdentificacionValue(obj) {
    const data = pickActiveCaseData(obj);
    return (
      data?.['Número de identificación'] ??
      data?.['Numero de identificacion'] ??
      data?.numeroIdentificacion ??
      data?.Title ??
      data?.title ??
      ''
    );
  }

  function getNombreUsuarioValue(obj) {
    const data = pickActiveCaseData(obj);
    return data?.Nombre ?? data?.['Nombre usuario'] ?? data?.nombreUsuario ?? data?.nombre ?? '';
  }

  function getSituacionJuridicaValue(obj) {
    const data = pickActiveCaseData(obj);
    return (
      data?.['Situación jurídica actualizada (de conformidad con la rama judicial)'] ??
      data?.['Situación jurídica'] ??
      data?.situacionJuridicaActualizada ??
      data?.situacionJuridica ??
      ''
    );
  }

  function getDefensorValue(obj) {
    const data = pickActiveCaseData(obj);
    return (
      data?.['Defensor(a) Público(a) Asignado para tramitar la solicitud'] ??
      data?.['Defensor(a) Publico(a) Asignado para tramitar la solicitud'] ??
      data?.defensorAsignado ??
      data?.defensor ??
      ''
    );
  }

  function getLugarPrivacionValue(obj) {
    const data = pickActiveCaseData(obj);
    return (
      data?.['Nombre del lugar de privación de la libertad'] ??
      data?.establecimientoReclusion ??
      data?.Establecimiento ??
      data?.lugarReclusion ??
      ''
    );
  }

  function getDepartamentoPrivacionValue(obj) {
    const data = pickActiveCaseData(obj);
    return (
      data?.['Departamento del lugar de privación de la libertad'] ??
      data?.departamentoLugarReclusion ??
      data?.departamentoEron ??
      data?.departamento ??
      ''
    );
  }

  function getMunicipioPrivacionValue(obj) {
    const data = pickActiveCaseData(obj);
    return (
      data?.['Distrito/municipio del lugar de privación de la libertad'] ??
      data?.municipioLugarReclusion ??
      data?.municipioEron ??
      data?.municipio ??
      ''
    );
  }

  function getEstadoTramiteValue(obj) {
    const data = pickActiveCaseData(obj);
    const derived = evaluateAuroraRules({ answers: data || {} })?.derivedStatus;
    if (derived) return derived;
    return data?.['Estado del caso'] ?? data?.['Estado del trámite'] ?? data?.estado ?? data?.estadoEntrevista ?? data?.['Estado entrevista'] ?? '';
  }

  function setFiltroDraft(key, value) {
    setFiltrosDraft((prev) => ({ ...prev, [key]: value }));
  }

  function seleccionarFiltroAdicional(value) {
    const selected = String(value || '').trim();
    setFiltroAdicionalSeleccionado(selected);
    setFiltrosDraft((prev) => ({
      ...prev,
      nombre: selected === 'nombre' ? prev.nombre : '',
      lugar: selected === 'lugar' ? prev.lugar : '',
      departamento: selected === 'departamento' ? prev.departamento : '',
      municipio: selected === 'municipio' ? prev.municipio : '',
      estado: selected === 'estado' ? prev.estado : '',
    }));
    setFiltrosAplicados((prev) => ({
      ...prev,
      nombre: selected === 'nombre' ? prev.nombre : '',
      lugar: selected === 'lugar' ? prev.lugar : '',
      departamento: selected === 'departamento' ? prev.departamento : '',
      municipio: selected === 'municipio' ? prev.municipio : '',
      estado: selected === 'estado' ? prev.estado : '',
    }));
  }

  useEffect(() => {
    let alive = true;

    async function cargarDefensores() {
      try {
        const fromCsv = await getDefensores();
        const a = Array.isArray(fromCsv?.defensores) ? fromCsv.defensores : [];

        const map = new Map();
        a.forEach((name) => {
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
        const data = await getPplListado();
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
  }, []);

  useEffect(() => {
    setDefensores((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      const set = new Set(base.map((d) => String(d || '').trim()).filter(Boolean).map((d) => d.toLowerCase()));
      const merged = [...base];

      rows.forEach((r) => {
        const val = String(getDefensorValue(r) || '').trim();
        if (!val) return;
        const key = val.toLowerCase();
        if (set.has(key)) return;
        set.add(key);
        merged.push(val);
      });

      merged.sort((a, b) => a.localeCompare(b));
      return merged;
    });
  }, [rows]);

  const defensoresOrdenados = useMemo(() => {
    return [...defensores].sort((a, b) => a.localeCompare(b));
  }, [defensores]);

  const documentoKey = useMemo(() => findDocumentoKey(columns), [columns]);

  const nombresDisponibles = useMemo(() => distinctSorted(rows, getNombreUsuarioValue), [rows]);
  const documentosDisponibles = useMemo(() => distinctSorted(rows, getNumeroIdentificacionValue), [rows]);
  const lugaresDisponibles = useMemo(() => distinctSorted(rows, getLugarPrivacionValue), [rows]);
  const departamentosDisponibles = useMemo(() => distinctSorted(rows, getDepartamentoPrivacionValue), [rows]);

  const estadosDisponibles = useMemo(() => {
    return distinctSorted(rows, getEstadoTramiteValue);
  }, [rows]);

  const municipiosDisponiblesDraft = useMemo(() => {
    const depNeedle = normalize(filtrosDraft.departamento);
    const candidates = depNeedle
      ? rows.filter((r) => normalize(getDepartamentoPrivacionValue(r)) === depNeedle)
      : rows;
    return distinctSorted(candidates, getMunicipioPrivacionValue);
  }, [rows, filtrosDraft.departamento]);

  useEffect(() => {
    if (!filtrosDraft.municipio) return;
    const exists = municipiosDisponiblesDraft.some((m) => normalize(m) === normalize(filtrosDraft.municipio));
    if (!exists) {
      setFiltrosDraft((prev) => ({ ...prev, municipio: '' }));
    }
  }, [filtrosDraft.municipio, municipiosDisponiblesDraft]);

  const rowsFiltradas = useMemo(() => {
    return rows.filter((r) => {
      const obj = r || {};

      if (
        filtrosAplicados.documento &&
        !normalize(getNumeroIdentificacionValue(obj)).includes(normalize(filtrosAplicados.documento))
      ) {
        return false;
      }

      if (filtrosAplicados.nombre && !normalize(getNombreUsuarioValue(obj)).includes(normalize(filtrosAplicados.nombre))) {
        return false;
      }

      if (filtrosAplicados.defensor && !normalize(getDefensorValue(obj)).includes(normalize(filtrosAplicados.defensor))) {
        return false;
      }

      if (filtrosAplicados.lugar && !normalize(getLugarPrivacionValue(obj)).includes(normalize(filtrosAplicados.lugar))) {
        return false;
      }

      if (
        filtrosAplicados.departamento &&
        !normalize(getDepartamentoPrivacionValue(obj)).includes(normalize(filtrosAplicados.departamento))
      ) {
        return false;
      }

      if (
        filtrosAplicados.municipio &&
        !normalize(getMunicipioPrivacionValue(obj)).includes(normalize(filtrosAplicados.municipio))
      ) {
        return false;
      }

      if (filtrosAplicados.estado && normalize(getEstadoTramiteValue(obj)) !== normalize(filtrosAplicados.estado)) {
        return false;
      }

      return true;
    });
  }, [rows, filtrosAplicados]);

  function aplicarFiltros() {
    const next = {
      defensor: String(filtrosDraft.defensor || '').trim(),
      nombre: String(filtrosDraft.nombre || '').trim(),
      documento: String(filtrosDraft.documento || '').trim(),
      lugar: String(filtrosDraft.lugar || '').trim(),
      departamento: String(filtrosDraft.departamento || '').trim(),
      municipio: String(filtrosDraft.municipio || '').trim(),
      estado: String(filtrosDraft.estado || '').trim(),
    };

    if (next.departamento) {
      const depKey = normalize(next.departamento);
      const validMunicipios = new Set(
        rows
          .filter((r) => normalize(getDepartamentoPrivacionValue(r)) === depKey)
          .map((r) => normalize(getMunicipioPrivacionValue(r)))
          .filter(Boolean)
      );
      if (next.municipio && !validMunicipios.has(normalize(next.municipio))) {
        next.municipio = '';
      }
    }

    setFiltrosDraft(next);
    setFiltrosAplicados(next);
  }

  function reiniciar() {
    const empty = {
      defensor: '',
      nombre: '',
      documento: '',
      lugar: '',
      departamento: '',
      municipio: '',
      estado: '',
    };
    setFiltrosDraft(empty);
    setFiltrosAplicados(empty);
    setFiltroAdicionalSeleccionado('');
  }

  const orderedColumns = useMemo(() => {
    const fixed = [
      '__situacionJuridica__',
      '__numeroIdentificacion__',
      '__nombreUsuario__',
      '__defensor__',
      '__lugarPrivacion__',
      '__estadoTramite__',
      '__departamentoReclusion__',
      '__municipioReclusion__',
    ];

    const remove = new Set([
      'Situación jurídica',
      'Situación jurídica actualizada (de conformidad con la rama judicial)',
      'Número de identificación',
      'Nombre',
      'Defensor(a) Público(a) Asignado para tramitar la solicitud',
      'Nombre del lugar de privación de la libertad',
      'Departamento del lugar de privación de la libertad',
      'Distrito/municipio del lugar de privación de la libertad',
      'Estado del caso',
      'numeroIdentificacion',
      'Title',
      'title',
      'TITLE',
      'Nombre usuario',
      'nombre',
      'nombreUsuario',
      'NombreUsuario',
      'Situación jurídica ',
      'Situación jurídica ',
      'situacionJuridica',
      'situacionJuridicaActualizada',
      'Departamento del lugar de reclusión',
      'Departamento del lugar de reclusión',
      'departamentoLugarReclusion',
      'departamentoEron',
      'departamento',
      'Municipio del lugar de reclusión',
      'Municipio del lugar de reclusión',
      'municipioLugarReclusion',
      'municipioEron',
      'municipio',
      'Estado entrevista',
      'estadoEntrevista',
      'estado',
      'casos',
      'activeCaseId',
    ]);

    const rest = (columns || []).filter((c) => !remove.has(c));
    return [...fixed, ...rest];
  }, [columns]);

  function renderHeader(col) {
    if (col === '__situacionJuridica__') return 'SITUACIÓN JURÍDICA';
    if (col === '__numeroIdentificacion__') return 'NÚMERO DE IDENTIFICACIÓN';
    if (col === '__nombreUsuario__') return 'NOMBRE USUARIO';
    if (col === '__defensor__') return 'DEFENSOR';
    if (col === '__lugarPrivacion__') return 'Nombre del lugar de privación de la libertad';
    if (col === '__estadoTramite__') return 'ESTADO';
    if (col === '__departamentoReclusion__') return 'DEPARTAMENTO';
    if (col === '__municipioReclusion__') return 'MUNICIPIO';
    return getHeaderLabel(col);
  }

  function renderCell(row, col) {
    if (col === '__situacionJuridica__') return displayOrDash(getSituacionJuridicaValue(row));
    if (col === '__numeroIdentificacion__') return displayOrDash(getNumeroIdentificacionValue(row));
    if (col === '__nombreUsuario__') return displayOrDash(getNombreUsuarioValue(row));
    if (col === '__defensor__') return displayOrDash(getDefensorValue(row));
    if (col === '__lugarPrivacion__') return displayOrDash(getLugarPrivacionValue(row));
    if (col === '__estadoTramite__') {
      const estado = String(getEstadoTramiteValue(row) || '').trim();
      if (!estado) return '—';
      const estadoClass = getEstadoClass(estado);
      if (!estadoClass) return estado;
      return <span className={`estadoBadge ${estadoClass}`}>{estado}</span>;
    }
    if (col === '__departamentoReclusion__') return displayOrDash(getDepartamentoPrivacionValue(row));
    if (col === '__municipioReclusion__') return displayOrDash(getMunicipioPrivacionValue(row));
    return displayOrDash(getCellValue(row, col));
  }

  function getCellTitle(row, col) {
    if (col === '__situacionJuridica__') return String(displayOrDash(getSituacionJuridicaValue(row)));
    if (col === '__numeroIdentificacion__') return String(displayOrDash(getNumeroIdentificacionValue(row)));
    if (col === '__nombreUsuario__') return String(displayOrDash(getNombreUsuarioValue(row)));
    if (col === '__defensor__') return String(displayOrDash(getDefensorValue(row)));
    if (col === '__lugarPrivacion__') return String(displayOrDash(getLugarPrivacionValue(row)));
    if (col === '__estadoTramite__') return String(displayOrDash(getEstadoTramiteValue(row)));
    if (col === '__departamentoReclusion__') return String(displayOrDash(getDepartamentoPrivacionValue(row)));
    if (col === '__municipioReclusion__') return String(displayOrDash(getMunicipioPrivacionValue(row)));
    return String(displayOrDash(getCellValue(row, col)));
  }

  function handleRowClick(r) {
    const doc = String(getNumeroIdentificacionValue(r) || '').trim();
    if (!doc) return;
    if (typeof onSelectRegistro === 'function') {
      onSelectRegistro({ numeroIdentificacion: String(doc) });
    }
  }

  return (
    <div className="card">
      <h2>Usuarios asignados</h2>

      <div className="search-row" style={{ marginBottom: '0.75rem' }}>
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

              <DropdownField
                label="Defensor"
                value={filtrosDraft.defensor}
                onChange={(value) => setFiltroDraft('defensor', value)}
                options={defensoresOrdenados}
                searchable={defensoresOrdenados.length > 20}
                listId="filtro-defensor"
              />

              <InputField
                label="Número de identificación"
                value={filtrosDraft.documento}
                onChange={(value) => setFiltroDraft('documento', value)}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ingrese cédula"
              />

              <DropdownField
                label="Filtrar"
                value={filtroAdicionalSeleccionado}
                onChange={seleccionarFiltroAdicional}
                options={[
                  { value: 'nombre', label: 'Nombre' },
                  { value: 'lugar', label: 'Nombre del lugar de privación de la libertad' },
                  { value: 'departamento', label: 'Departamento del lugar de privación de la libertad' },
                  { value: 'municipio', label: 'Distrito/municipio del lugar de privación de la libertad' },
                  { value: 'estado', label: 'Estado del trámite' },
                ]}
              />

              {filtroAdicionalSeleccionado === 'nombre' && (
                <InputField
                  label="Nombre"
                  value={filtrosDraft.nombre}
                  onChange={(value) => setFiltroDraft('nombre', value)}
                  placeholder="Ingrese nombre"
                />
              )}

              {filtroAdicionalSeleccionado === 'lugar' && (
                <InputField
                  label="Nombre del lugar de privación de la libertad"
                  value={filtrosDraft.lugar}
                  onChange={(value) => setFiltroDraft('lugar', value)}
                  options={lugaresDisponibles}
                  listId="filtro-lugar"
                  placeholder="Ingrese lugar"
                />
              )}

              {filtroAdicionalSeleccionado === 'departamento' && (
                <InputField
                  label="Departamento del lugar de privación de la libertad"
                  value={filtrosDraft.departamento}
                  onChange={(value) =>
                    setFiltrosDraft((prev) => ({
                      ...prev,
                      departamento: value,
                      municipio: '',
                    }))
                  }
                  options={departamentosDisponibles}
                  listId="filtro-departamento"
                  placeholder="Ingrese departamento"
                />
              )}

              {filtroAdicionalSeleccionado === 'municipio' && (
                <InputField
                  label="Distrito/municipio del lugar de privación de la libertad"
                  value={filtrosDraft.municipio}
                  onChange={(value) => setFiltroDraft('municipio', value)}
                  options={municipiosDisponiblesDraft}
                  listId="filtro-municipio"
                  placeholder="Ingrese distrito/municipio"
                />
              )}

              {filtroAdicionalSeleccionado === 'estado' && (
                <DropdownField
                  label="Estado del trámite"
                  value={filtrosDraft.estado}
                  onChange={(value) => setFiltroDraft('estado', value)}
                  options={estadosDisponibles}
                />
              )}

              <div className="search-row" style={{ marginTop: '0.75rem' }}>
                <button className="primary-button primary-button--search" type="button" onClick={aplicarFiltros}>
                  Buscar
                </button>
                <button className="primary-button" type="button" onClick={reiniciar}>
                  Limpiar
                </button>
              </div>
            </div>
          )}

          <div className="asignados-table">
            <div className="table-container tall">
              <table className="data-table aurora-table">
                <colgroup>
                  {orderedColumns.map((c) => (
                    <col key={`col-${c}`} style={{ width: `${getColumnWidth(c)}px` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {orderedColumns.map((c) => (
                      <th key={c} title={renderHeader(c)}>
                        <span className="aurora-th-label">{renderHeader(c)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rowsFiltradas.map((r, idx) => {
                    const key =
                      (documentoKey && pickActiveCaseData(r)?.[documentoKey]) ||
                      getNumeroIdentificacionValue(r) ||
                      r?.id ||
                      idx;

                    return (
                      <tr
                        key={String(key)}
                        onClick={() => handleRowClick(r)}
                        className="clickable-row"
                      >
                        {orderedColumns.map((c) => (
                          <td key={c} title={getCellTitle(r, c)}>
                            {renderCell(r, c)}
                          </td>
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
