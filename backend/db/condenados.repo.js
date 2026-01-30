const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(__dirname, '..', 'data', 'condenados.csv');
const DEFENSOR_COL = 'Defensor(a) Publico(a) Asignado para tramitar la solicitud';
const DEFENSOR_COL_ALT = 'Defensor(a) Publico(a) Asignado para tramitar la solicitud';

let rawCache = null;
let headersCache = null;

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);

  // Escapar si contiene coma, saltos de línea o comillas
  if (/[,\n\r"]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function saveRaw(rows) {
  const headers =
    headersCache && headersCache.length
      ? headersCache
      : rows[0]
        ? Object.keys(rows[0])
        : [];

  const lines = [];
  lines.push(headers.join(','));

  for (const row of rows) {
    const line = headers.map((h) => csvEscape(row[h])).join(',');
    lines.push(line);
  }

  fs.writeFileSync(CSV_PATH, lines.join('\n'), 'utf8');
}


function loadRaw() {
  const raw = fs.readFileSync(CSV_PATH);
  const text = raw.toString('utf8');

  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  headersCache = rows.length ? Object.keys(rows[0]) : [];
  return rows;
}

function normalizeRow(r) {
  return {
    ...r,
    numeroIdentificacion: String(r.Title ?? '').trim(),
    tipoPpl: 'condenado',
  };
}

function getAll() {
  if (!rawCache) rawCache = loadRaw();
  return rawCache.map(normalizeRow);
}

function getByDocumento(documento) {
  const doc = String(documento ?? '').trim();
  if (!rawCache) rawCache = loadRaw();
  const found = rawCache.find((x) => String(x.Title ?? '').trim() === doc) || null;
  return found ? normalizeRow(found) : null;
}

function setDefensor(rawRow, defensor) {
  if (rawRow[DEFENSOR_COL] !== undefined) {
    rawRow[DEFENSOR_COL] = defensor;
    return;
  }
  if (rawRow[DEFENSOR_COL_ALT] !== undefined) {
    rawRow[DEFENSOR_COL_ALT] = defensor;
    return;
  }
  rawRow[DEFENSOR_COL_ALT] = defensor;
}

function updateByDocumento(documento, patch) {
  const doc = String(documento ?? '').trim();
  if (!rawCache) rawCache = loadRaw();
  const idx = rawCache.findIndex((x) => String(x.Title ?? '').trim() === doc);
  if (idx < 0) return null;

  const safe = { ...patch };
  delete safe.numeroIdentificacion;
  delete safe.Title;

  if (safe.defensorAsignado !== undefined) {
    setDefensor(rawCache[idx], safe.defensorAsignado);
    delete safe.defensorAsignado;
  }
  if (safe.defensor !== undefined) {
    setDefensor(rawCache[idx], safe.defensor);
    delete safe.defensor;
  }

  Object.keys(safe).forEach((key) => {
    if (rawCache[idx][key] !== undefined) rawCache[idx][key] = safe[key];
  });

  saveRaw(rawCache);
  return normalizeRow(rawCache[idx]);
}

function assignDefensor(documentos, defensor) {
  if (!rawCache) rawCache = loadRaw();
  const set = new Set((documentos || []).map((d) => String(d).trim()));
  let updated = 0;
  rawCache.forEach((row) => {
    const doc = String(row.Title ?? '').trim();
    if (!set.has(doc)) return;
    setDefensor(row, defensor);
    updated += 1;
  });
  if (updated > 0) saveRaw(rawCache);
  return updated;
}

function getColumns() {
  const all = getAll();
  return all.length ? Object.keys(all[0]) : [];
}

function getRawRows() {
  if (!rawCache) rawCache = loadRaw();
  return rawCache;
}


function getDefensorValue(row) {
  if (row[DEFENSOR_COL] !== undefined && row[DEFENSOR_COL] !== null) return row[DEFENSOR_COL];
  if (row[DEFENSOR_COL_ALT] !== undefined && row[DEFENSOR_COL_ALT] !== null) return row[DEFENSOR_COL_ALT];
  if (row.defensorAsignado !== undefined && row.defensorAsignado !== null) return row.defensorAsignado;

  const keys = Object.keys(row || {});
  const hit = keys.find((key) => normalizeKey(key).includes('defensor'));
  if (hit) return row[hit];
  return '';
}

function getDefensoresDistinct() {
  if (!rawCache) rawCache = loadRaw();
  const set = new Set();
  rawCache.forEach((row) => {
    const val = String(getDefensorValue(row) || '').trim();
    if (val) set.add(val);
  });
  return Array.from(set).sort();
}

function getCasosByDefensor(defensor) {
  const needle = String(defensor || '').trim().toLowerCase();
  if (!needle) return [];
  if (!rawCache) rawCache = loadRaw();

  const getField = (row, keys, fallback = '') => {
    const normalizedMap = new Map(
      Object.keys(row || {}).map((key) => [normalizeKey(key), key])
    );
    for (const key of keys) {
      if (row && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        return row[key];
      }
      const normalized = normalizedMap.get(normalizeKey(key));
      if (normalized && row[normalized] !== undefined && row[normalized] !== null && String(row[normalized]).trim() !== '') {
        return row[normalized];
      }
    }
    return fallback;
  };

  return rawCache
    .filter((row) => String(getDefensorValue(row) || '').trim().toLowerCase() == needle)
    .map((row) => ({
      situacionJuridica: getField(
        row,
        ['Situacion juridica', 'Situacion jurídica', 'situacionJuridica', 'situacionJuridicaActualizada'],
        '-'
      ),
      numeroIdentificacion: getField(row, ['Title', 'numeroIdentificacion']),
      nombreUsuario: getField(row, ['Nombre usuario', 'nombre', 'nombreUsuario', 'NombreUsuario'], '-'),
      departamentoReclusion: getField(
        row,
        ['Departamento del lugar de reclusion', 'Departamento del lugar de reclusión', 'departamentoEron', 'departamento'],
        '-'
      ),
      municipioReclusion: getField(
        row,
        ['Municipio del lugar de reclusion', 'Municipio del lugar de reclusión', 'municipioEron', 'municipio'],
        '-'
      ),
      // Estado proviene de la columna "Estado entrevista" si existe.
      estado: getField(row, ['Estado entrevista', 'estadoEntrevista'], '-'),
    }));
}

module.exports = {
  getAll,
  getByDocumento,
  updateByDocumento,
  assignDefensor,
  getColumns,
  getRawRows,
  getDefensoresDistinct,
  getCasosByDefensor,
  DEFENSOR_COL,
  DEFENSOR_COL_ALT,
};
