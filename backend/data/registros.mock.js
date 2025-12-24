// MOCK mínimo para que todo funcione.
// Puedes ampliar estos campos con los que tengas en PowerApps/BD.

let _registros = [
  {
    // Para tabla y búsqueda
    numeroIdentificacion: '1111111111',
    nombre: 'USUARIO DE PRUEBA',
    establecimientoReclusion: 'ERON - EJEMPLO',
    autoridadCargo: 'AUTORIDAD - EJEMPLO',
    defensorAsignado: 'DEFENSOR(A) - EJEMPLO',
    numeroProceso: '0000000000',
    departamentoEron: 'DEPARTAMENTO - EJEMPLO',
    municipioEron: 'MUNICIPIO - EJEMPLO',
    estadoEntrevista: 'SIN INICIAR',
    avanceFormulario: '-',

    // BLOQUE 1
    genero: '',
    enfoqueDiferencial: '',
    faseTratamiento: '',
    fechaNacimiento: '',
    situacionJuridica: '',

    // BLOQUE 2
    delitos: '',
    penaAniosMesesDias: '',
    penaTotalDias: '',
    tiempoPrivadoDias: '',
    tiempoEfectivoDias: '',
    redencionDias: '',
    requerimientosOtrosProcesos: '-',

    // BLOQUE 3
    fechaAnalisisJuridico: '',
    procedenciaLibCondicional: '-',
    procedenciaPrisionDomiciliariaMitad: '-',
    procedenciaPenaCumplida: '-',
    procedenciaAcumulacionPenas: '-',
    procesosAcumular: '',
    otrasSolicitudes: '-',
    resumenAnalisis: '',

    // BLOQUE 4
    decisionUsuario: '-',
    fechaEntrevista: '',
    requierePruebas: '-',
    poderAvanzarSolicitud: '-',

    // BLOQUE 5 (subrogados penales)
    fechaRecepcionPruebas: '',
    fechaSolicitudDocsInpec: '',
    fechaPresentacionSolicitud: '',
    fechaDecisionAutoridad: '',
    sentidoDecision: '-',
    motivoDecisionNegativaLibCondicional: '-',
    motivoDecisionNegativaPrisionDomiciliaria: '-',
    fechaRecursoDesfavorable: '',
    sentidoDecisionRecurso: '-',

    // BLOQUE 6 (distinta a subrogados)
    tipoSolicitudTramitar: '-',
    autoridadDirige: '',
    fechaSolicitud: '',
    fechaRespuestaSolicitud: '',
    sentidoDecisionResuelveSolicitud: '-',
    fechaInsistenciaSolicitud: '',
  },
];

function getAll() {
  return _registros;
}

function getByDocumento(documento) {
  return _registros.find((r) => String(r.numeroIdentificacion) === String(documento));
}

function updateByDocumento(documento, patch) {
  const idx = _registros.findIndex((r) => String(r.numeroIdentificacion) === String(documento));
  if (idx === -1) return null;

  // Evita que cambien el id por accidente
  const safePatch = { ...patch, numeroIdentificacion: _registros[idx].numeroIdentificacion };

  _registros[idx] = { ..._registros[idx], ...safePatch };

  // (Opcional) recalcular avanceFormulario en base a completitud
  _registros[idx].avanceFormulario = calcularAvanceFormulario(_registros[idx]);

  return _registros[idx];
}

function calcularAvanceFormulario(r) {
  // Regla simple y transparente (puedes reemplazarla por la de PowerApps):
  // cuenta campos clave diligenciados y devuelve un “bajo/medio/alto”.
  const claves = [
    'nombre',
    'establecimientoReclusion',
    'autoridadCargo',
    'numeroProceso',
    'delitos',
    'fechaAnalisisJuridico',
    'fechaEntrevista',
  ];
  const diligenciados = claves.filter((k) => String(r[k] || '').trim().length > 0).length;
  if (diligenciados <= 2) return 'BAJO';
  if (diligenciados <= 5) return 'MEDIO';
  return 'ALTO';
}

module.exports = { getAll, getByDocumento, updateByDocumento };
