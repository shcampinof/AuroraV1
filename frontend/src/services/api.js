const API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL)
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:4000/api';

export async function getRegistros() {
  const res = await fetch(`${API_BASE}/registros`);
  if (!res.ok) throw new Error('Error consultando registros');
  return res.json();
}

export async function getRegistroByDocumento(documento) {
  const res = await fetch(`${API_BASE}/registros/${encodeURIComponent(documento)}`);
  if (!res.ok) throw new Error('Registro no encontrado');
  return res.json();
}

export async function updateRegistro(documento, payload) {
  const res = await fetch(`${API_BASE}/registros/${encodeURIComponent(documento)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error actualizando registro');
  return res.json();
}

export async function getFormatos() {
  const res = await fetch(`${API_BASE}/formatos`);
  if (!res.ok) throw new Error('Error consultando formatos');
  return res.json();
}

export function getFormatoDownloadUrl(id) {
  return `${API_BASE}/formatos/${encodeURIComponent(id)}/download`;
}
