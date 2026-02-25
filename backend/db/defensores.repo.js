const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(__dirname, '..', 'data', 'defensores.csv');

let cache = null;

function isPlaceholderDefensor(nombre) {
  const raw = String(nombre || '').trim();
  if (!raw) return false;
  const cleaned = raw.toUpperCase().replace(/\s+/g, ' ');
  if (cleaned === 'DEFENSOR(A) - EJEMPLO') return true;
  if (/^DEFENSOR\s*\(A\)\s*\d+$/.test(cleaned)) return true;
  return false;
}

function ensureFile() {
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, 'nombre\n', 'utf8');
  }
}

function load() {
  ensureFile();
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true });

  return rows
    .map((r) => String(r.nombre || '').trim())
    .filter(Boolean)
    .filter((name) => !isPlaceholderDefensor(name));
}

function getAll() {
  if (!cache) cache = load();
  return cache;
}

module.exports = { getAll };
