const API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL)
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:4000/api';

// =====================
// PPL (condenados / sindicados)
// =====================

// LISTADO
// GET /api/ppl?tipo=condenado|sindicado (opcional). Sin `tipo` -> devuelve todos.
export async function getPplListado(tipo) {
  const qs = tipo ? `?tipo=${encodeURIComponent(tipo)}` : '';
  const res = await fetch(`${API_BASE}/ppl${qs}`);
  if (!res.ok) throw new Error('Error consultando PPL');
  return res.json(); // { tipo, columns, rows }
}

// CONSULTA POR CÉDULA (unificada)
// GET /api/ppl/:documento
export async function getPplByDocumento(documento) {
  const res = await fetch(`${API_BASE}/ppl/${encodeURIComponent(documento)}`);
  if (!res.ok) throw new Error('Registro no encontrado');
  return res.json(); // { tipo, registro }
}

// UPDATE (mock unificado)
// PUT /api/ppl/:documento
export async function updatePpl(documento, payload) {
  const res = await fetch(`${API_BASE}/ppl/${encodeURIComponent(documento)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error actualizando registro');
  return res.json(); // { tipo, registro }
}

// =====================
// Formatos
// =====================
export async function getFormatos() {
  const res = await fetch(`${API_BASE}/formatos`);
  if (!res.ok) throw new Error('Error consultando formatos');
  return res.json();
}

export function getFormatoDownloadUrl(id) {
  return `${API_BASE}/formatos/${encodeURIComponent(id)}/download`;
}

// =====================
// Asignacion de defensores (condenados)
// =====================
export async function getCondenados() {
  const res = await fetch(`${API_BASE}/ppl/condenados`);
  if (!res.ok) throw new Error('Error consultando condenados');
  return res.json(); // { rows }
}

export async function getDefensores() {
  const res = await fetch(`${API_BASE}/defensores`);
  if (!res.ok) throw new Error('Error consultando defensores');
  return res.json(); // { defensores }
}

export async function getDefensoresCondenados() {
  const res = await fetch(`${API_BASE}/defensores?source=condenados`);
  if (!res.ok) throw new Error('Error consultando defensores');
  return res.json(); // { defensores }
}

function normalizeDocValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function readDocumentoFromRegistro(registro) {
  const source = registro && typeof registro === 'object' ? registro : {};
  return String(
    source.numeroIdentificacion ??
      source['Número de identificación'] ??
      source['Numero de identificacion'] ??
      source.documento ??
      source.cedula ??
      source.Title ??
      source.title ??
      ''
  ).trim();
}

export async function getPplActuacionesByDocumento(documento) {
  const doc = String(documento ?? '').trim();
  if (!doc) return { documento: '', actuaciones: [] };

  const listing = await getPplListado();
  const rows = Array.isArray(listing?.rows) ? listing.rows : [];
  const docNeedle = normalizeDocValue(doc);

  const actuaciones = rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => normalizeDocValue(readDocumentoFromRegistro(row)) === docNeedle)
    .map(({ row, rowIndex }) => ({
      id: `${docNeedle}-${rowIndex}`,
      rowIndex,
      registro: row,
    }));

  return { documento: doc, actuaciones };
}


