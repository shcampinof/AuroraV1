// Lista base (títulos tomados de tu pantalla "Caja de Herramientas").
// OJO: filename son placeholders; reemplázalos por tus nombres reales.
const formatos = [
  { id: 'f1', titulo: 'INPEC-Asignación cupo TEE - JETEE', filename: 'INPEC_Asignacion_cupo_TEE_JETEE.docx' },
  { id: 'f2', titulo: 'JEPMS-Aplicación retroactiva 2x3 redención por trabajo', filename: 'JEPMS_Aplicacion_retroactiva_2x3_trabajo.docx' },
  { id: 'f3', titulo: 'JEPMS-Autorización para radicar solicitud UP', filename: 'JEPMS_Autorizacion_radicar_UP.docx' },
  { id: 'f4', titulo: 'INPEC-Cambio de fase tratamiento penitenciario - CET', filename: 'INPEC_Cambio_fase_tratamiento_CET.docx' },
  { id: 'f5', titulo: 'Aplicación retroactiva y analógica 2x3 redención otras actividades', filename: 'Aplicacion_retroactiva_analogica_2x3_otras_actividades.docx' },
  { id: 'f6', titulo: 'JEPMS-Acumulación jurídica de penas', filename: 'JEPMS_Acumulacion_juridica_penas.docx' },
  { id: 'f7', titulo: 'Solicitud libertad condicional', filename: 'Solicitud_libertad_condicional.docx' },
  { id: 'f8', titulo: 'Entrevista - Pruebas tipo para arraigo', filename: 'Entrevista_Pruebas_arraigo.docx' },
  { id: 'f9', titulo: 'JEPMS-Traslado del proceso de Distrito Judicial por traslado de persona', filename: 'JEPMS_Traslado_proceso_distrito_judicial.docx' },
  { id: 'f10', titulo: 'Solicitud prisión domiciliaria', filename: 'Solicitud_prision_domiciliaria.docx' },
];

function listFormatos() {
  return formatos;
}

function getFormatoById(id) {
  return formatos.find((f) => f.id === id);
}

module.exports = { listFormatos, getFormatoById };
