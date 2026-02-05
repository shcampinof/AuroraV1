const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(__dirname, '..', 'data', 'condenados.csv');
const DEFENSOR_COL = 'Defensor(a) Publico(a) Asignado para tramitar la solicitud';
const DEFENSOR_COL_ALT = 'Defensor(a) Publico(a) Asignado para tramitar la solicitud';

let rawCache = null;
let headersCache = null;
const casesMetaByDoc = new Map();

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isPlaceholderDefensor(nombre) {
  const raw = String(nombre || '').trim();
  if (!raw) return false;
  const cleaned = raw.toUpperCase().replace(/\s+/g, ' ');
  if (cleaned === 'DEFENSOR(A) - EJEMPLO') return true;
  if (/^DEFENSOR\s*\(A\)\s*\d+$/.test(cleaned)) return true;
  return false;
}

function makeCaseId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function parseCreatedAt(rawRow) {
  const value = rawRow?.Creado ?? rawRow?.creado ?? '';
  const s = String(value || '').trim();
  if (!s) return '';

  // Formato comun: dd/mm/yyyy hh:mm
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return '';

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const hh = m[4] != null ? Number(m[4]) : 0;
  const min = m[5] != null ? Number(m[5]) : 0;

  const d = new Date(yyyy, mm - 1, dd, hh, min, 0, 0);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
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

function ensureMetaForRawRow(rawRow) {
  const doc = String(rawRow?.Title ?? '').trim();
  if (!doc) return null;

  const existing = casesMetaByDoc.get(doc);
  if (existing && Array.isArray(existing.casos) && existing.casos.length) {
    if (!existing.activeCaseId) existing.activeCaseId = existing.casos[existing.casos.length - 1].caseId;
    return existing;
  }

  const caseId = makeCaseId();
  const createdAt = parseCreatedAt(rawRow) || new Date().toISOString();
  const data = normalizeRow(rawRow);
  const meta = { casos: [{ caseId, createdAt, data }], activeCaseId: caseId };
  casesMetaByDoc.set(doc, meta);
  return meta;
}

function buildCaseRecordFromRawRow(rawRow) {
  const doc = String(rawRow?.Title ?? '').trim();
  const meta = ensureMetaForRawRow(rawRow);
  return {
    numeroIdentificacion: doc,
    tipoPpl: 'condenado',
    casos: meta?.casos || [],
    activeCaseId: meta?.activeCaseId || '',
  };
}

function upsertCaseForRawRow(rawRow, caseId, dataPatch) {
  const doc = String(rawRow?.Title ?? '').trim();
  const meta = ensureMetaForRawRow(rawRow);
  if (!meta) return null;

  const requestedCaseId = String(caseId || '').trim();
  const actualCaseId = requestedCaseId || makeCaseId();

  const idx = meta.casos.findIndex((c) => String(c.caseId) === actualCaseId);
  if (idx < 0) {
    const base = normalizeRow(rawRow);
    meta.casos.push({
      caseId: actualCaseId,
      createdAt: new Date().toISOString(),
      data: { ...base, ...(dataPatch || {}), numeroIdentificacion: doc, tipoPpl: 'condenado' },
    });
  } else {
    meta.casos[idx] = {
      ...meta.casos[idx],
      data: {
        ...(meta.casos[idx].data || {}),
        ...(dataPatch || {}),
        numeroIdentificacion: doc,
        tipoPpl: 'condenado',
      },
    };
  }

  meta.activeCaseId = actualCaseId;
  return meta;
}

function getAll() {
  if (!rawCache) rawCache = loadRaw();
  return rawCache.map(buildCaseRecordFromRawRow);
}

function getByDocumento(documento) {
  const doc = String(documento ?? '').trim();
  if (!rawCache) rawCache = loadRaw();
  const found = rawCache.find((x) => String(x.Title ?? '').trim() === doc) || null;
  return found ? buildCaseRecordFromRawRow(found) : null;
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

  const rawRow = rawCache[idx];
  const incoming = patch && typeof patch === 'object' ? patch : {};

  // Formato preferido: { caseId, data }
  const incomingCaseId = incoming.caseId;
  const incomingData = incoming.data && typeof incoming.data === 'object' ? incoming.data : null;

  // Compat: patch legacy directo sobre el caso activo
  const safe = incomingData ? { ...incomingData } : { ...incoming };
  delete safe.caseId;
  delete safe.data;
  delete safe.casos;
  delete safe.activeCaseId;
  delete safe.tipo;
  delete safe.tipoPpl;
  delete safe.numeroIdentificacion;
  delete safe.Title;

  if (safe.defensorAsignado !== undefined) setDefensor(rawRow, safe.defensorAsignado);
  if (safe.defensor !== undefined) setDefensor(rawRow, safe.defensor);

  // Persistencia (CSV): solo columnas existentes.
  Object.keys(safe).forEach((key) => {
    if (rawRow[key] !== undefined) rawRow[key] = safe[key];
  });

  // Historial (in-memory): actualiza/crea caso.
  const meta = upsertCaseForRawRow(rawRow, incomingCaseId, safe);
  if (meta) {
    const active = meta.casos.find((c) => String(c.caseId) === String(meta.activeCaseId));
    if (active && active.data) {
      if (safe.defensorAsignado !== undefined) {
        active.data.defensorAsignado = safe.defensorAsignado;
        if (rawRow[DEFENSOR_COL] !== undefined) active.data[DEFENSOR_COL] = rawRow[DEFENSOR_COL];
        if (rawRow[DEFENSOR_COL_ALT] !== undefined) active.data[DEFENSOR_COL_ALT] = rawRow[DEFENSOR_COL_ALT];
      }
      if (safe.defensor !== undefined) {
        active.data.defensorAsignado = safe.defensor;
        if (rawRow[DEFENSOR_COL] !== undefined) active.data[DEFENSOR_COL] = rawRow[DEFENSOR_COL];
        if (rawRow[DEFENSOR_COL_ALT] !== undefined) active.data[DEFENSOR_COL_ALT] = rawRow[DEFENSOR_COL_ALT];
      }
    }
  }

  saveRaw(rawCache);
  return buildCaseRecordFromRawRow(rawRow);
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

    const meta = ensureMetaForRawRow(row);
    if (meta) {
      upsertCaseForRawRow(row, meta.activeCaseId, { defensorAsignado: defensor });
    }
  });
  if (updated > 0) saveRaw(rawCache);
  return updated;
}

function getColumns() {
  const rows = rawCache || loadRaw();
  const cols = rows.length ? Object.keys(rows[0]) : [];
  if (!cols.includes('numeroIdentificacion')) cols.unshift('numeroIdentificacion');
  if (!cols.includes('tipoPpl')) cols.push('tipoPpl');
  return cols;
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
    if (val && !isPlaceholderDefensor(val)) set.add(val);
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
