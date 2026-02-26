import { useEffect, useMemo, useState } from 'react';
import { getPplActuacionesByDocumento } from '../services/api.js';
import { evaluateAuroraRules } from '../utils/evaluateAuroraRules.ts';
import { reportError } from '../utils/reportError.js';
import { getLabelAccionCaso } from '../utils/actuacionesLabels.js';
import './HistorialActuacionesPPL.css';

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
    if (!/[ÃƒÃ‚Ã¢]/.test(out)) break;
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
    .replace(/\best\?/gi, 'est\u00e1')
    .replace(/\bavanzar\?/gi, 'avanzar\u00e1')
    .replace(/\bdemostar\b/gi, 'demostrar')
    .replace(/\?ltima/gi, '\u00faltima');
  return out;
}

function normalizeText(value) {
  return maybeDecodeUtf8Mojibake(decodeUnicodeEscapes(String(value ?? '')))
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

function isEmptyHistorialValue(value) {
  const text = String(value ?? '').trim();
  return text === '' || text === '-' || text === '\u2014';
}

const CAMPOS_CLAVE_PARA_INICIAR_ACTUALIZAR = new Set([
  'fecha de analisis juridico del caso',
  'resumen del analisis del caso',
  'resumen del analisis juridico del presente caso',
  'actuacion a adelantar',
  'procedencia de la solicitud de vencimiento de terminos',
  'fecha de entrevista',
  'fecha de presentacion de solicitud a la autoridad',
  'sentido de la decision',
  'sentido de la decision que resuelve la solicitud',
  'sentido de la decision que resuelve recurso',
]);

function normalizeBloqueField(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasCamposClaveDiligenciados(registro) {
  const source = registro && typeof registro === 'object' ? registro : {};
  return Object.entries(source).some(([fieldName, fieldValue]) => {
    if (!CAMPOS_CLAVE_PARA_INICIAR_ACTUALIZAR.has(normalizeBloqueField(fieldName))) return false;
    return !isEmptyHistorialValue(fieldValue);
  });
}

function normalizeEstado(value) {
  return normalizeText(value);
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

function resolveTipoPpl(registro) {
  const source = registro && typeof registro === 'object' ? registro : {};
  const situacion = firstFilledValue(
    readFirstField(source, [
      'Situaci\u00f3n Jur\u00eddica actualizada (de conformidad con la rama judicial)',
      'Situacion Juridica actualizada (de conformidad con la rama judicial)',
      'Situaci\u00f3n Jur\u00eddica',
      'Situacion Juridica',
    ])
  );

  const key = normalizeText(situacion);
  if (key.includes('condenad')) return 'condenado';
  if (key.includes('sindicad')) return 'sindicado';
  return '';
}

function getActuacionJudicialDisplay(registro) {
  const source = registro && typeof registro === 'object' ? registro : {};
  const auroraP40 = firstFilledValue(
    readFirstField(source, [
      'Actuaci\u00f3n a adelantar',
      'Actuacion a adelantar',
      'Acci\u00f3n a realizar',
      'Accion a realizar',
      'posibleActuacionJudicial',
    ])
  );

  const celesteP21 = firstFilledValue(
    readFirstField(source, [
      'PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE T\u00c9RMINOS',
      'PROCEDENCIA DE LA SOLICITUD DE VENCIMIENTO DE TERMINOS',
      'Procedencia de la solicitud de vencimiento de t\u00e9rminos',
      'Procedencia de la solicitud de vencimiento de terminos',
    ])
  );

  const tipo = resolveTipoPpl(source);
  if (tipo === 'condenado') return auroraP40 || celesteP21;
  if (tipo === 'sindicado') return celesteP21 || auroraP40;
  return auroraP40 || celesteP21;
}

export default function HistorialActuacionesPPL({
  registro,
  numeroDocumento,
  onSelectActuacion,
  onCrearNuevaActuacion,
  onIniciarActuacion,
  refreshToken,
  actuacionActivaId,
  creandoActuacion = false,
  onActionLabelChange,
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
            fechaAnalisisJuridico: firstFilledValue(
              readFirstField(rowData, [
                'Fecha de an\u00e1lisis jur\u00eddico del caso',
                'Fecha de analisis juridico del caso',
                'aurora_b3_fechaAnalisis',
              ])
            ),
            resumenAnalisisPregunta37: firstFilledValue(
              rowData?.['Resumen del an\u00e1lisis del caso'],
              rowData?.['Resumen del analisis del caso'],
              rowData?.['RESUMEN DEL AN\u00c1LISIS JUR\u00cdDICO DEL PRESENTE CASO'],
              rowData?.['RESUMEN DEL ANALISIS JURIDICO DEL PRESENTE CASO']
            ),
            actuacionJudicial: getActuacionJudicialDisplay(rowData),
            estadoLabel: String(estadoInfo?.label || '').trim(),
            estadoClass: String(estadoInfo?.className || '').trim(),
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
    return readFirstField(registro, ['Nombre', 'Nombre usuario', 'nombreUsuario', 'nombre']) || '\u2014';
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

  const tieneActuacionesDiligenciadas = useMemo(
    () => actuaciones.some((actuacion) => hasCamposClaveDiligenciados(actuacion?.registro)),
    [actuaciones]
  );

  const sinActuaciones = useMemo(
    () => !cargandoHistorial && !historialError && !tieneActuacionesDiligenciadas,
    [cargandoHistorial, historialError, tieneActuacionesDiligenciadas]
  );

  const textoAccionCaso = useMemo(() => {
    const activeId = String(actuacionActivaId || '').trim();
    if (activeId) {
      const activa = actuaciones.find((a) => String(a?.id || '').trim() === activeId);
      if (activa) return getLabelAccionCaso(!hasCamposClaveDiligenciados(activa?.registro));
    }
    if (sinActuaciones) return getLabelAccionCaso(true);
    const hayFilasSinDiligenciar = actuaciones.some((a) => !hasCamposClaveDiligenciados(a?.registro));
    return getLabelAccionCaso(hayFilasSinDiligenciar);
  }, [actuacionActivaId, actuaciones, sinActuaciones]);

  useEffect(() => {
    onActionLabelChange?.(textoAccionCaso);
  }, [onActionLabelChange, textoAccionCaso]);

  function handleIniciarDesdeFilaVacia() {
    if (onIniciarActuacion) {
      onIniciarActuacion();
      return;
    }
    onCrearNuevaActuacion?.();
  }

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
      </div>

      {cargandoHistorial && <p className="hint-text">{displayText('Cargando historial de actuaciones...')}</p>}
      {!cargandoHistorial && historialError && <p className="hint-text">{displayText(historialError)}</p>}

      {!cargandoHistorial && !historialError && sinActuaciones && (
        <p className="hint-text">{displayText('Sin actuaciones por el momento')}</p>
      )}

      {!cargandoHistorial && !historialError && (
        <div className="table-container historial-actuaciones-table-container tabla-historial-actuaciones-wrap">
          <table className="data-table historial-actuaciones-table tabla-historial-actuaciones">
            <colgroup>
              <col className="historial-col-numero" />
              <col className="historial-col-fecha" />
              <col className="historial-col-resumen" />
              <col className="historial-col-actuacion" />
              <col className="historial-col-accion" />
              <col className="historial-col-botones" />
            </colgroup>
            <thead>
              <tr>
                <th className="historial-head-numero">{displayText('N\u00famero de actuaci\u00f3n')}</th>
                <th>{displayText('Fecha de an\u00e1lisis jur\u00eddico del caso')}</th>
                <th>{displayText('Resumen del an\u00e1lisis del caso')}</th>
                <th>{displayText('Actuaci\u00f3n judicial a adelantar')}</th>
                <th>{displayText('Acci\u00f3n a impulsar')}</th>
                <th>{displayText('Acciones')}</th>
              </tr>
            </thead>
            <tbody>
              {!sinActuaciones &&
                actuaciones.map((actuacion, index) => {
                  const isActive =
                    String(actuacionActivaId || '').trim() &&
                    String(actuacion?.id || '').trim() === String(actuacionActivaId || '').trim();
                  const textoAccionFila = getLabelAccionCaso(!hasCamposClaveDiligenciados(actuacion?.registro));

                  return (
                    <tr key={String(actuacion?.id || '')} className={isActive ? 'historial-row-active' : ''}>
                      <td className="historial-col-numero-cell">{index + 1}</td>
                      <td>{displayText(firstFilledValue(actuacion?.fechaAnalisisJuridico) || '\u2014')}</td>
                      <td>{displayText(firstFilledValue(actuacion?.resumenAnalisisPregunta37) || '\u2014')}</td>
                      <td>{displayText(firstFilledValue(actuacion?.actuacionJudicial) || '\u2014')}</td>
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
                      <td className="historial-col-acciones-cell">
                        <button
                          type="button"
                          className="primary-button historial-action-button"
                          onClick={() => onSelectActuacion?.(actuacion)}
                        >
                          {displayText(textoAccionFila)}
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {sinActuaciones && (
                <tr className="historial-empty-row">
                  <td className="historial-col-numero-cell">-</td>
                  <td colSpan={4} className="historial-empty-message">
                    {displayText('Sin actuaciones por el momento')}
                  </td>
                  <td className="historial-col-acciones-cell">
                    <button
                      type="button"
                      className="primary-button historial-action-button"
                      onClick={handleIniciarDesdeFilaVacia}
                    >
                      {displayText(textoAccionCaso)}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="historial-create-button-wrap">
        <button
          className="save-button historial-create-button"
          type="button"
          onClick={onCrearNuevaActuacion}
          disabled={creandoActuacion || !documentoNormalizado}
        >
          {creandoActuacion ? displayText('Creando...') : displayText('Crear nueva actuaci\u00f3n')}
        </button>
      </div>
    </section>
  );
}
