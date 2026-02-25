import { useEffect, useMemo, useState } from 'react';
import { getPplActuacionesByDocumento } from '../services/api.js';
import { evaluateAuroraRules } from '../utils/evaluateAuroraRules.ts';
import { reportError } from '../utils/reportError.js';

function decodeUnicodeEscapes(text) {
  return String(text ?? '')
    .replace(/\\\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

const CP1252_REVERSE_MAP = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function cp1252CharsToBytes(input) {
  const text = String(input ?? '');
  const bytes = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = CP1252_REVERSE_MAP.get(code);
    if (mapped != null) {
      bytes.push(mapped);
      continue;
    }
    return null;
  }
  return Uint8Array.from(bytes);
}

function maybeDecodeUtf8Mojibake(text) {
  let out = String(text ?? '');
  for (let pass = 0; pass < 3; pass += 1) {
    if (!/[ÃÂâ]/.test(out)) break;
    try {
      const bytes = cp1252CharsToBytes(out);
      if (!bytes) break;
      const decoded = new TextDecoder('utf-8').decode(bytes);
      if (!decoded || decoded === out) break;
      out = decoded;
    } catch {
      break;
    }
  }
  return out;
}

function displayText(value) {
  let out = decodeUnicodeEscapes(String(value ?? ''));
  out = maybeDecodeUtf8Mojibake(out);
  out = out
    .replace(/\best\?/gi, 'está')
    .replace(/\bavanzar\?/gi, 'avanzará')
    .replace(/\bdemostar\b/gi, 'demostrar')
    .replace(/\?ltima/gi, 'última');
  return out;
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function firstFilledValue(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text && text !== '-' && text !== '\u2014') return text;
  }
  return '';
}

function readFirstField(source, aliases) {
  const obj = source && typeof source === 'object' ? source : {};
  const normalizedAliases = new Set((aliases || []).map((alias) => normalizeText(alias)));

  for (const [key, value] of Object.entries(obj)) {
    if (!normalizedAliases.has(normalizeText(key))) continue;
    const text = String(value ?? '').trim();
    if (text) return text;
  }

  return '';
}

function normalizeEstado(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getEstadoClass(estado) {
  const key = normalizeEstado(estado);
  if (key === 'analizar el caso') return 'estado--verde';
  if (key === 'entrevistar al usuario') return 'estado--amarillo';
  if (key === 'presentar solicitud') return 'estado--rojo';
  if (key === 'pendiente decision') return 'estado--azul';
  if (key === 'caso cerrado') return 'estado--gris';
  if (key === 'cerrado') return 'estado--gris';
  if (key === 'activo') return 'estado--azul';
  return '';
}

function parseDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value ?? '').trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const dmyMatch = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getDaysSince(value) {
  const date = parseDateValue(value);
  if (!date) return null;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
}

function getSemaforoClassByDays(days) {
  if (!Number.isFinite(days)) return '';
  if (days <= 15) return 'estado--verde';
  if (days <= 30) return 'estado--amarillo';
  return 'estado--rojo';
}

function pickFirstValue(source, keys) {
  if (!source || typeof source !== 'object') return '';
  return firstFilledValue(...(keys || []).map((k) => source?.[k]));
}

function canonicalEstadoLabel(value) {
  const key = normalizeEstado(value);
  if (key === 'analizar el caso') return 'Analizar el caso';
  if (key === 'entrevistar al usuario') return 'Entrevistar al usuario';
  if (key === 'presentar solicitud') return 'Presentar solicitud';
  if (key === 'pendiente decision') return 'Pendiente decisi\u00f3n';
  if (key === 'caso cerrado') return 'Caso cerrado';
  return String(value ?? '').trim();
}

function getEstadoDisplayInfo(data, createdAtFallback) {
  const target = data && typeof data === 'object' ? data : {};
  const derivedStatus = canonicalEstadoLabel(evaluateAuroraRules({ answers: target || {} }).derivedStatus);
  const derivedKey = normalizeEstado(derivedStatus);

  if (derivedKey === 'caso cerrado') {
    return { label: 'Caso cerrado', className: 'estado--gris' };
  }
  if (derivedKey === 'pendiente decision') {
    return { label: 'Pendiente decisi\u00f3n', className: 'estado--azul' };
  }
  if (derivedKey === 'analizar el caso') {
    const fechaAsignacionPag = firstFilledValue(
      pickFirstValue(target, [
        'Fecha de asignaci\u00f3n del PAG',
        'Fecha asignaci\u00f3n del PAG',
        'Fecha de asignaci\u00f3n PAG',
        'Fecha asignaci\u00f3n PAG',
        'Fecha de asignaci\u00f3n',
        'Fecha de asignacion',
        'fechaAsignacionPAG',
        'fechaAsignacionPag',
        'fechaAsignacion',
      ]),
      createdAtFallback
    );
    const className = getSemaforoClassByDays(getDaysSince(fechaAsignacionPag));
    return { label: 'Analizar el caso', className: className || 'estado--verde' };
  }
  if (derivedKey === 'entrevistar al usuario') {
    const fechaAnalisis = pickFirstValue(target, [
      'Fecha de an\u00e1lisis jur\u00eddico del caso',
      'Fecha de analisis juridico del caso',
      'aurora_b3_fechaAnalisis',
    ]);
    const className = getSemaforoClassByDays(getDaysSince(fechaAnalisis));
    return { label: 'Entrevistar al usuario', className: className || 'estado--amarillo' };
  }
  if (derivedKey === 'presentar solicitud') {
    const fechaEntrevista = pickFirstValue(target, ['Fecha de entrevista']);
    const className = getSemaforoClassByDays(getDaysSince(fechaEntrevista));
    return { label: 'Presentar solicitud', className: className || 'estado--rojo' };
  }

  const fallbackLabel = firstFilledValue(
    target?.['Acci\u00f3n a realizar'] ??
      target?.['Accion a realizar'] ??
      target?.['Actuaci\u00f3n a adelantar'] ??
      target?.['Actuacion a adelantar'] ??
      target?.posibleActuacionJudicial ??
      target?.['Estado del caso'] ??
      target?.['Estado del tr\u00e1mite'] ??
      target?.['Estado del tramite'] ??
      target?.estado ??
      target?.estadoEntrevista ??
      target?.['Estado entrevista'],
    derivedStatus
  );

  return {
    label: fallbackLabel,
    className: getEstadoClass(fallbackLabel),
  };
}

export default function HistorialActuacionesPPL({
  registro,
  numeroDocumento,
  onSelectActuacion,
  onCrearNuevaActuacion,
  refreshToken,
  actuacionActivaId,
  creandoActuacion = false,
}) {
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [historialError, setHistorialError] = useState('');
  const [actuaciones, setActuaciones] = useState([]);

  const documentoNormalizado = useMemo(() => String(numeroDocumento ?? '').trim(), [numeroDocumento]);

  useEffect(() => {
    let alive = true;

    async function cargarHistorial() {
      if (!documentoNormalizado) {
        setActuaciones([]);
        setHistorialError('');
        return;
      }

      setCargandoHistorial(true);
      setHistorialError('');
      try {
        const response = await getPplActuacionesByDocumento(documentoNormalizado);
        if (!alive) return;

        const rows = Array.isArray(response?.actuaciones) ? response.actuaciones : [];
        const normalizedRows = rows.map((item, idx) => {
          const rowData = item?.registro && typeof item.registro === 'object' ? item.registro : {};
          const estadoInfo = getEstadoDisplayInfo(rowData, item?.createdAt ?? rowData?.createdAt ?? '');
          return {
            id: String(item?.id ?? `actuacion-${idx + 1}`),
            registro: rowData,
            actuacionPregunta40: firstFilledValue(
              rowData?.['Actuaci\u00f3n a adelantar'],
              rowData?.['Actuacion a adelantar'],
              rowData?.['Acci\u00f3n a realizar'],
              rowData?.['Accion a realizar'],
              rowData?.posibleActuacionJudicial
            ),
            estadoLabel: String(estadoInfo?.label || '').trim(),
            estadoClass: String(estadoInfo?.className || '').trim(),
            numeroProceso: firstFilledValue(
              rowData?.['N\u00famero de proceso'],
              rowData?.['Numero de proceso'],
              rowData?.numeroProceso,
              rowData?.proceso
            ),
          };
        });
        setActuaciones(normalizedRows);
      } catch (e) {
        reportError(e, 'historial-actuaciones:cargar');
        if (!alive) return;
        setActuaciones([]);
        setHistorialError('No fue posible cargar el historial de actuaciones.');
      } finally {
        if (alive) setCargandoHistorial(false);
      }
    }

    cargarHistorial();

    return () => {
      alive = false;
    };
  }, [documentoNormalizado, refreshToken]);

  const nombreCompleto = useMemo(() => {
    return (
      readFirstField(registro, ['Nombre', 'Nombre usuario', 'nombreUsuario', 'nombre']) || '\u2014'
    );
  }, [registro]);

  const tipoDocumento = useMemo(() => {
    return (
      readFirstField(registro, [
        'Tipo de indentificaci\u00f3n',
        'Tipo de identificaci\u00f3n',
        'Tipo identificaci\u00f3n',
        'tipoIdentificacion',
      ]) || '\u2014'
    );
  }, [registro]);

  const numeroDocumentoLabel = useMemo(() => {
    const fromRegistro = readFirstField(registro, [
      'N\u00famero de identificaci\u00f3n',
      'Numero de identificacion',
      'numeroIdentificacion',
      'title',
      'Title',
      'documento',
      'cedula',
    ]);
    return firstFilledValue(fromRegistro, documentoNormalizado) || '\u2014';
  }, [registro, documentoNormalizado]);

  return (
    <section className="historial-actuaciones">
      <div className="ppl-summary-card">
        <p className="ppl-summary-line">
          <strong>{displayText('Nombre:')}</strong> {displayText(nombreCompleto)}
        </p>
        <p className="ppl-summary-line">
          <strong>{displayText('Documento:')}</strong> {displayText(tipoDocumento)} {displayText(numeroDocumentoLabel)}
        </p>
      </div>

      <div className="historial-actuaciones-header">
        <h3 className="block-title historial-actuaciones-title">{displayText('Historial de actuaciones')}</h3>
        <div className="historial-actions-wrap">
          <button
            className="primary-button historial-create-button"
            type="button"
            onClick={onCrearNuevaActuacion}
            disabled={creandoActuacion || !documentoNormalizado}
          >
            {creandoActuacion ? displayText('Creando...') : displayText('Crear nueva actuación')}
          </button>
        </div>
      </div>

      {cargandoHistorial && <p className="hint-text">{displayText('Cargando historial de actuaciones...')}</p>}
      {!cargandoHistorial && historialError && <p className="hint-text">{displayText(historialError)}</p>}

      {!cargandoHistorial && !historialError && actuaciones.length === 0 && (
        <p className="hint-text">{displayText('Esta persona no tiene actuaciones registradas.')}</p>
      )}

      {!cargandoHistorial && !historialError && actuaciones.length > 0 && (
        <div className="table-container historial-actuaciones-table-container">
          <table className="data-table historial-actuaciones-table">
            <thead>
              <tr>
                <th>{displayText('Actuación a adelantar')}</th>
                <th>{displayText('Acción a impulsar / Estado')}</th>
                <th>{displayText('Número de proceso')}</th>
                <th>{displayText('Acciones')}</th>
              </tr>
            </thead>
            <tbody>
              {actuaciones.map((actuacion) => {
                const isActive =
                  String(actuacionActivaId || '').trim() &&
                  String(actuacion?.id || '').trim() === String(actuacionActivaId || '').trim();
                return (
                  <tr key={String(actuacion?.id || '')} className={isActive ? 'historial-row-active' : ''}>
                    <td>{displayText(firstFilledValue(actuacion?.actuacionPregunta40) || '\u2014')}</td>
                    <td>
                      {actuacion?.estadoLabel ? (
                        actuacion?.estadoClass ? (
                          <span className={`estadoBadge ${actuacion.estadoClass}`}>{displayText(actuacion.estadoLabel)}</span>
                        ) : (
                          displayText(actuacion.estadoLabel)
                        )
                      ) : (
                        '\u2014'
                      )}
                    </td>
                    <td>{displayText(firstFilledValue(actuacion?.numeroProceso) || '\u2014')}</td>
                    <td>
                      <button
                        type="button"
                        className="primary-button historial-action-button"
                        onClick={() => onSelectActuacion?.(actuacion)}
                      >
                        {displayText('Ver caso')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
