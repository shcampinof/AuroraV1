import { isEmptyValue, pickActiveCaseData } from './entrevistaEstado.js';

export function displayOrDash(v) {
  return isEmptyValue(v) ? '—' : String(v);
}

export function getNumeroIdentificacion(registro) {
  const data = pickActiveCaseData(registro);
  return (
    data?.numeroIdentificacion ??
    data?.Title ??
    data?.title ??
    data?.documento ??
    data?.cedula ??
    data?.numero_documento ??
    ''
  );
}

export function getNombreUsuario(registro, tipo) {
  const t = String(tipo || '').trim().toLowerCase();
  const data = pickActiveCaseData(registro);
  if (t === 'condenado') {
    return data?.['Nombre usuario'] ?? data?.nombreUsuario ?? data?.nombre ?? '';
  }
  return data?.nombre ?? data?.nombreUsuario ?? data?.['Nombre usuario'] ?? '';
}

export function getSituacionJuridica(registro, tipo) {
  const t = String(tipo || '').trim().toLowerCase();
  const data = pickActiveCaseData(registro);
  if (t === 'condenado') {
    return (
      data?.['Situación jurídica '] ??
      data?.['SituaciÃ³n jurÃ­dica '] ??
      data?.situacionJuridica ??
      data?.situacionJuridicaActualizada ??
      ''
    );
  }
  return data?.situacionJuridicaActualizada ?? data?.situacionJuridica ?? '';
}

export function getDepartamentoReclusion(registro, tipo) {
  const t = String(tipo || '').trim().toLowerCase();
  const data = pickActiveCaseData(registro);
  if (t === 'condenado') {
    return (
      data?.['Departamento del lugar de reclusión'] ??
      data?.['Departamento del lugar de reclusiÃ³n'] ??
      data?.departamentoLugarReclusion ??
      data?.departamentoEron ??
      data?.departamento ??
      ''
    );
  }
  return data?.departamento ?? data?.departamentoEron ?? '';
}

export function getMunicipioReclusion(registro, tipo) {
  const t = String(tipo || '').trim().toLowerCase();
  const data = pickActiveCaseData(registro);
  if (t === 'condenado') {
    return (
      data?.['Municipio del lugar de reclusión'] ??
      data?.['Municipio del lugar de reclusiÃ³n'] ??
      data?.municipioLugarReclusion ??
      data?.municipioEron ??
      data?.municipio ??
      ''
    );
  }
  return data?.municipio ?? data?.municipioEron ?? '';
}

