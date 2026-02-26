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

// CONSULTA POR CEDULA (unificada)
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

// CREATE ACTUACION
// POST /api/ppl/:documento/actuaciones
export async function createPplActuacion(documento, payload) {
  const res = await fetch(`${API_BASE}/ppl/${encodeURIComponent(documento)}/actuaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) throw new Error('Error creando actuacion');
  return res.json(); // { documento, actuacion, registro }
}

// HISTORIAL DE ACTUACIONES
// GET /api/ppl/:documento/actuaciones
export async function getPplActuacionesByDocumento(documento) {
  const doc = String(documento ?? '').trim();
  if (!doc) return { documento: '', actuaciones: [] };

  const res = await fetch(`${API_BASE}/ppl/${encodeURIComponent(doc)}/actuaciones`);
  if (!res.ok) throw new Error('Error consultando historial de actuaciones');
  return res.json(); // { documento, actuaciones }
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
