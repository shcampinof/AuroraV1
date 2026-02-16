const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(__dirname, '..', 'data', 'Datosconsolidados.csv');

let rawCache = null;
let rawHeaders = null; // headers como aparecen en el CSV (incluye vacíos)
let headers = null; // headers saneados (clave de objeto)
let headerByNorm = null; // norm(header) -> header saneado

function norm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function makeUniqueHeader(existing, base) {
  let out = base;
  let n = 1;
  while (existing.has(out)) {
    n += 1;
    out = `${base}__${n}`;
  }
  existing.add(out);
  return out;
}

function sanitizeHeaders(input) {
  const existing = new Set();
  return (input || []).map((h, i) => {
    const raw = String(h ?? '');
    const trimmed = raw.trim();
    const base = trimmed || `__extra_${i}`;
    return makeUniqueHeader(existing, base);
  });
}

function buildHeaderIndex(raw, sanitized) {
  const map = new Map();
  (raw || []).forEach((h, i) => {
    const rawKey = String(h ?? '');
    const sanitizedKey = sanitized[i];
    map.set(norm(rawKey), sanitizedKey);
    map.set(norm(sanitizedKey), sanitizedKey);
  });
  return map;
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[,\n\r"]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function loadRaw() {
  const text = fs.readFileSync(CSV_PATH, 'utf8');

  let hdr = null;
  const rows = parse(text, {
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    columns: (h) => {
      hdr = Array.isArray(h) ? h.map((x) => String(x ?? '')) : [];
      return sanitizeHeaders(hdr);
    },
  });

  rawHeaders = hdr || [];
  headers = sanitizeHeaders(rawHeaders);
  headerByNorm = buildHeaderIndex(rawHeaders, headers);

  return rows;
}

function getRaw() {
  if (!rawCache) rawCache = loadRaw();
  return rawCache;
}

function getHeaderKey(columnName) {
  getRaw();
  return headerByNorm.get(norm(columnName)) || null;
}

function ensureColumn(columnName, defaultValue = '') {
  getRaw();

  const existing = getHeaderKey(columnName);
  if (existing) return existing;

  const raw = String(columnName ?? '');
  const sanitized = makeUniqueHeader(new Set(headers), raw.trim() || `__extra_${rawHeaders.length}`);

  rawHeaders.push(raw);
  headers.push(sanitized);
  headerByNorm = buildHeaderIndex(rawHeaders, headers);

  rawCache.forEach((row) => {
    if (row && row[sanitized] === undefined) row[sanitized] = defaultValue;
  });

  return sanitized;
}

function getValue(row, columnName, fallback = '') {
  const key = getHeaderKey(columnName);
  if (!key) return fallback;
  const val = row?.[key];
  const text = val == null ? '' : String(val);
  return text.trim() === '' ? fallback : val;
}

function setValue(row, columnName, value) {
  const key = ensureColumn(columnName);
  row[key] = value == null ? '' : value;
}

function getDocumentoKey() {
  return (
    getHeaderKey('Número de identificación') ||
    getHeaderKey('Numero de identificacion') ||
    getHeaderKey('numeroIdentificacion')
  );
}

function getSituacionKey() {
  return getHeaderKey('Situación Jurídica') || getHeaderKey('situacion_juridica');
}

function getSituacionActualizadaKey() {
  return (
    getHeaderKey('Situación Jurídica actualizada (de conformidad con la rama judicial)') ||
    getHeaderKey('situacion_juridica_actualizada')
  );
}

function computeTipo(row) {
  const sj = String(getValue(row, 'Situación Jurídica', '') || '').toLowerCase();
  const sja = String(
    getValue(row, 'Situación Jurídica actualizada (de conformidad con la rama judicial)', '') || ''
  ).toLowerCase();

  // Preferencia: si la situación jurídica actualizada dice CONDENADO, se trata como condenado.
  if (sja.includes('condenad')) return 'condenado';
  if (sj.includes('condenad')) return 'condenado';
  return 'sindicado';
}

function getAll() {
  return getRaw();
}

function getColumns() {
  getRaw();
  // Devuelve nombres del CSV (sin saneo), pero sin columnas vacías.
  return (rawHeaders || []).map((h) => String(h ?? '')).filter((h) => h.trim() !== '');
}

function getByDocumento(documento) {
  const doc = String(documento ?? '').trim();
  if (!doc) return null;

  const docKey = getDocumentoKey();
  if (!docKey) return null;

  const rows = getRaw();
  const hit = rows.find((r) => String(r?.[docKey] ?? '').trim() === doc) || null;
  return hit;
}

function updateByDocumento(documento, patch) {
  const doc = String(documento ?? '').trim();
  if (!doc) return null;

  const docKey = getDocumentoKey();
  if (!docKey) return null;

  const rows = getRaw();
  const idx = rows.findIndex((r) => String(r?.[docKey] ?? '').trim() === doc);
  if (idx < 0) return null;

  const incoming = patch && typeof patch === 'object' ? patch : {};
  const safe = incoming.data && typeof incoming.data === 'object' ? { ...incoming.data } : { ...incoming };

  // Campo de estado (Activo/Cerrado) requerido por la UI wizard.
  ensureColumn('Estado del caso', '');
  ensureColumn('Sentido de la decisión que resuelve la solicitud', '');
  ensureColumn('RESUMEN DEL ANÁLISIS JURÍDICO DEL PRESENTE CASO', '');
  ensureColumn('SENTIDO DE LA DECISIÓN', '');
  ensureColumn('MOTIVO DE LA DECISIÓN NEGATIVA', '');
  ensureColumn('¿SE RECURRIÓ EN CASO DE DECISIÓN NEGATIVA?', '');
  ensureColumn('Fecha de presentación del recurso', '');
  ensureColumn('SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO', '');
  ensureColumn('redirectedToAurora', '');

  // Limpia payload no persistible.
  delete safe.caseId;
  delete safe.casos;
  delete safe.activeCaseId;
  delete safe.tipo;
  delete safe.tipoPpl;
  delete safe.data;

  // Parchea solo columnas existentes (o creadas explícitamente via ensureColumn).
  const row = rows[idx];
  Object.keys(safe).forEach((k) => {
    const key = getHeaderKey(k);
    if (key) row[key] = safe[k];
  });

  // Mantiene el documento consistente si viene en payload con otra llave.
  row[docKey] = doc;

  saveRaw(rows);
  return row;
}

function saveRaw(rows) {
  getRaw();
  const hdr = rawHeaders && rawHeaders.length ? rawHeaders : [];
  const keys = headers && headers.length ? headers : [];

  const lines = [];
  lines.push(hdr.map((h) => csvEscape(h)).join(','));

  for (const r of rows || []) {
    const line = keys.map((k) => csvEscape(r?.[k])).join(',');
    lines.push(line);
  }

  fs.writeFileSync(CSV_PATH, lines.join('\n'), 'utf8');
}

function isPlaceholderDefensor(nombre) {
  const raw = String(nombre || '').trim();
  if (!raw) return false;
  const cleaned = raw.toUpperCase().replace(/\s+/g, ' ');
  if (cleaned === 'DEFENSOR(A) - EJEMPLO') return true;
  if (/^DEFENSOR\s*\(A\)\s*\d+$/.test(cleaned)) return true;
  return false;
}

function getDefensorKey() {
  return (
    getHeaderKey('Defensor(a) Público(a) Asignado para tramitar la solicitud') ||
    getHeaderKey('Defensor(a) Publico(a) Asignado para tramitar la solicitud')
  );
}

function assignDefensor(documentos, defensor) {
  const docs = new Set((documentos || []).map((d) => String(d).trim()).filter(Boolean));
  if (!docs.size) return 0;

  const defKey = ensureColumn('Defensor(a) Público(a) Asignado para tramitar la solicitud', '');
  const docKey = getDocumentoKey();
  if (!docKey) return 0;

  let updated = 0;
  getRaw().forEach((row) => {
    const doc = String(row?.[docKey] ?? '').trim();
    if (!docs.has(doc)) return;
    row[defKey] = String(defensor ?? '');
    updated += 1;
  });

  if (updated) saveRaw(rawCache);
  return updated;
}

function getDefensoresDistinct({ tipo } = {}) {
  const defKey = getDefensorKey();
  const docKey = getDocumentoKey();
  const sitKey = getSituacionKey();
  const sitActKey = getSituacionActualizadaKey();

  if (!defKey || !docKey) return [];
  const needTipo = String(tipo || '').trim().toLowerCase();

  const set = new Set();
  getRaw().forEach((row) => {
    if (needTipo) {
      const computed = computeTipo(row);
      if (computed !== needTipo) return;
    }

    const val = String(row?.[defKey] ?? '').trim();
    if (val && !isPlaceholderDefensor(val)) set.add(val);
  });
  return Array.from(set).sort();
}

function getCasosByDefensor(defensor) {
  const needle = String(defensor || '').trim().toLowerCase();
  if (!needle) return [];

  const defKey = getDefensorKey();
  const docKey = getDocumentoKey();
  if (!defKey || !docKey) return [];

  // Campo de estado para reportes (si no existe, se muestra '-').
  ensureColumn('Estado del caso', '');

  return getRaw()
    .filter((row) => String(row?.[defKey] ?? '').trim().toLowerCase() === needle)
    .map((row) => ({
      situacionJuridica: getValue(row, 'Situación Jurídica', '-'),
      numeroIdentificacion: String(row?.[docKey] ?? '').trim(),
      nombreUsuario: getValue(row, 'Nombre', '-'),
      departamentoReclusion: getValue(row, 'Departamento del lugar de privación de la libertad', '-'),
      municipioReclusion: getValue(row, 'Distrito/municipio del lugar de privación de la libertad', '-'),
      estado: getValue(row, 'Estado del caso', '-'),
    }));
}

module.exports = {
  getAll,
  getColumns,
  getByDocumento,
  updateByDocumento,
  assignDefensor,
  getDefensoresDistinct,
  getCasosByDefensor,
  getHeaderKey,
  getValue,
  setValue,
  ensureColumn,
  computeTipo,
};
