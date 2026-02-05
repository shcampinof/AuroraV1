const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', 'sindicados.json');

let cache = null;
const casesMetaByDoc = new Map();

function makeCaseId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function load() {
  const text = fs.readFileSync(JSON_PATH, 'utf8');
  const rows = JSON.parse(text);
  return rows.map((r) => ({ ...r, tipoPpl: 'sindicado' }));
}

function ensureMetaForRawRow(rawRow) {
  const doc = String(rawRow?.numeroIdentificacion ?? '').trim();
  if (!doc) return null;

  const existing = casesMetaByDoc.get(doc);
  if (existing && Array.isArray(existing.casos) && existing.casos.length) {
    if (!existing.activeCaseId) existing.activeCaseId = existing.casos[existing.casos.length - 1].caseId;
    return existing;
  }

  const caseId = makeCaseId();
  const createdAt = new Date().toISOString();
  const data = { ...(rawRow || {}), tipoPpl: 'sindicado' };
  const meta = { casos: [{ caseId, createdAt, data }], activeCaseId: caseId };
  casesMetaByDoc.set(doc, meta);
  return meta;
}

function buildCaseRecordFromRawRow(rawRow) {
  const doc = String(rawRow?.numeroIdentificacion ?? '').trim();
  const meta = ensureMetaForRawRow(rawRow);
  return {
    numeroIdentificacion: doc,
    tipoPpl: 'sindicado',
    casos: meta?.casos || [],
    activeCaseId: meta?.activeCaseId || '',
  };
}

function upsertCaseForRawRow(rawRow, caseId, dataPatch) {
  const doc = String(rawRow?.numeroIdentificacion ?? '').trim();
  const meta = ensureMetaForRawRow(rawRow);
  if (!meta) return null;

  const requestedCaseId = String(caseId || '').trim();
  const actualCaseId = requestedCaseId || makeCaseId();

  const idx = meta.casos.findIndex((c) => String(c.caseId) === actualCaseId);
  if (idx < 0) {
    const base = { ...(rawRow || {}), tipoPpl: 'sindicado' };
    meta.casos.push({
      caseId: actualCaseId,
      createdAt: new Date().toISOString(),
      data: { ...base, ...(dataPatch || {}), numeroIdentificacion: doc, tipoPpl: 'sindicado' },
    });
  } else {
    meta.casos[idx] = {
      ...meta.casos[idx],
      data: {
        ...(meta.casos[idx].data || {}),
        ...(dataPatch || {}),
        numeroIdentificacion: doc,
        tipoPpl: 'sindicado',
      },
    };
  }

  meta.activeCaseId = actualCaseId;
  return meta;
}

function getAll() {
  if (!cache) cache = load();
  return cache.map(buildCaseRecordFromRawRow);
}

function getByDocumento(documento) {
  const doc = String(documento ?? '').trim();
  if (!cache) cache = load();
  const found = cache.find((x) => String(x.numeroIdentificacion).trim() === doc) || null;
  return found ? buildCaseRecordFromRawRow(found) : null;
}

function updateByDocumento(documento, patch) {
  const doc = String(documento ?? '').trim();
  if (!cache) cache = load();
  const idx = cache.findIndex((x) => String(x.numeroIdentificacion).trim() === doc);
  if (idx < 0) return null;

  const rawRow = cache[idx];
  const incoming = patch && typeof patch === 'object' ? patch : {};

  const incomingCaseId = incoming.caseId;
  const incomingData = incoming.data && typeof incoming.data === 'object' ? incoming.data : null;

  const safe = incomingData ? { ...incomingData } : { ...incoming };
  delete safe.caseId;
  delete safe.data;
  delete safe.casos;
  delete safe.activeCaseId;
  delete safe.tipo;
  delete safe.tipoPpl;
  delete safe.numeroIdentificacion;

  cache[idx] = { ...rawRow, ...safe, tipoPpl: 'sindicado' };

  upsertCaseForRawRow(cache[idx], incomingCaseId, safe);
  return buildCaseRecordFromRawRow(cache[idx]);
}

function getColumns() {
  if (!cache) cache = load();
  const cols = cache.length ? Object.keys(cache[0]) : [];
  if (!cols.includes('numeroIdentificacion')) cols.unshift('numeroIdentificacion');
  if (!cols.includes('tipoPpl')) cols.push('tipoPpl');
  return cols;
}

module.exports = { getAll, getByDocumento, updateByDocumento, getColumns };
