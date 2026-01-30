const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', 'sindicados.json');

let cache = null;

function load() {
  const text = fs.readFileSync(JSON_PATH, 'utf8');
  const rows = JSON.parse(text);
  return rows.map((r) => ({ ...r, tipoPpl: 'sindicado' }));
}

function getAll() {
  if (!cache) cache = load();
  return cache;
}

function getByDocumento(documento) {
  const doc = String(documento ?? '').trim();
  return getAll().find((x) => String(x.numeroIdentificacion).trim() === doc) || null;
}

function updateByDocumento(documento, patch) {
  const doc = String(documento ?? '').trim();
  const all = getAll();
  const idx = all.findIndex((x) => String(x.numeroIdentificacion).trim() === doc);
  if (idx < 0) return null;

  const safe = { ...patch };
  delete safe.numeroIdentificacion;

  all[idx] = { ...all[idx], ...safe };
  return all[idx];
}

function getColumns() {
  const all = getAll();
  return all.length ? Object.keys(all[0]) : [];
}

module.exports = { getAll, getByDocumento, updateByDocumento, getColumns };
