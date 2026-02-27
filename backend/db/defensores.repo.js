const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(__dirname, '..', 'data', 'defensores.csv');

let cache = null;

function createRepoError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function normalizeNombre(nombre) {
  return String(nombre ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function assertNombreValido(nombre) {
  if (!nombre) {
    throw createRepoError('El nombre del defensor es obligatorio.', 400, 'INVALID_DEFENSOR_NAME');
  }
  if (!/^[\p{L}\s]+$/u.test(nombre)) {
    throw createRepoError(
      'El nombre solo puede contener letras y espacios.',
      400,
      'INVALID_DEFENSOR_NAME'
    );
  }
}

function isPlaceholderDefensor(nombre) {
  const raw = normalizeNombre(nombre);
  if (!raw) return false;
  const cleaned = raw;
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
  const map = new Map();

  rows.forEach((r) => {
    const nombre = normalizeNombre(r.nombre);
    if (!nombre || isPlaceholderDefensor(nombre)) return;
    if (!map.has(nombre)) map.set(nombre, nombre);
  });

  return Array.from(map.values());
}

function getAll() {
  if (!cache) cache = load();
  return [...cache];
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function save(allNames) {
  const lines = ['nombre'];
  allNames.forEach((name) => {
    lines.push(escapeCsvValue(name));
  });
  fs.writeFileSync(CSV_PATH, `${lines.join('\n')}\n`, 'utf8');
}

function create(nombreInput) {
  const nombre = normalizeNombre(nombreInput);
  assertNombreValido(nombre);

  const current = getAll();
  if (current.some((item) => normalizeNombre(item) === nombre)) {
    throw createRepoError('El defensor ya existe.', 409, 'DUPLICATE_DEFENSOR');
  }

  const next = [...current, nombre];
  save(next);
  cache = next;
  return nombre;
}

module.exports = {
  getAll,
  create,
  normalizeNombre,
  assertNombreValido,
};
