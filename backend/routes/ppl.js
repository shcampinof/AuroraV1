const express = require('express');
const condenados = require('../db/condenados.repo');
const sindicados = require('../db/sindicados.repo');

const router = express.Router();

function getField(row, keys, fallback = '') {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return fallback;
}

function mapCondenado(row) {
  return {
    numeroIdentificacion: getField(row, ['numeroIdentificacion', 'Title', 'title']),
    nombreUsuario: getField(row, ['Nombre usuario', 'nombre', 'nombreUsuario', 'NombreUsuario']),
    lugarReclusion: getField(row, ['Establecimiento', 'establecimientoReclusion', 'lugarReclusion']),
    departamentoLugarReclusion: getField(row, ['Departamento del lugar de reclusion', 'Departamento del lugar de reclusi?n', 'departamentoEron', 'departamento']),
    municipioLugarReclusion: getField(row, ['Municipio del lugar de reclusion', 'Municipio del lugar de reclusi?n', 'municipioEron', 'municipio']),
    autoridadCargo: getField(row, ['Autoridad a cargo', 'autoridadCargo', 'autoridadJudicial']),
    numeroProceso: getField(row, ['Proceso', 'numeroProceso', 'numeroProcesoJudicial', 'proceso']),
    situacionJuridica: getField(row, ['Situacion juridica', 'Situaci?n jur?dica ', 'Situaci?n jur?dica', 'situacionJuridica', 'situacionJuridicaActualizada']),
    posibleActuacionJudicial: getField(row, ['posibleActuacionJudicial'], '-'),
    defensorAsignado: getField(
      row,
      [
        'Defensor(a) Publico(a) Asignado para tramitar la solicitud',
        'Defensor(a) P?blico(a) Asignado para tramitar la solicitud',
        'defensorAsignado',
      ],
      ''
    ),
  };
}

// Listado por tipo: /api/ppl?tipo=condenado | sindicado
router.get('/', (req, res) => {
  const tipo = String(req.query.tipo || 'condenado');
  if (tipo === 'sindicado') {
    return res.json({ tipo, columns: sindicados.getColumns(), rows: sindicados.getAll() });
  }
  return res.json({ tipo: 'condenado', columns: condenados.getColumns(), rows: condenados.getAll() });
});

// Listado de condenados (mapeado para tabla de asignacion)
router.get('/condenados', (req, res) => {
  const rows = condenados.getAll().map(mapCondenado);
  return res.json({ rows });
});

// Busqueda unificada por documento: devuelve tipo + registro
router.get('/:documento', (req, res) => {
  const doc = req.params.documento;

  const s = sindicados.getByDocumento(doc);
  if (s) return res.json({ tipo: 'sindicado', registro: s });

  const c = condenados.getByDocumento(doc);
  if (c) return res.json({ tipo: 'condenado', registro: c });

  return res.status(404).json({ message: 'No encontrado' });
});

// Update unificado
router.put('/:documento', (req, res) => {
  const doc = req.params.documento;
  const body = req.body || {};

  // si el registro existe en sindicados, se actualiza alli
  if (sindicados.getByDocumento(doc)) {
    const upd = sindicados.updateByDocumento(doc, body);
    return res.json({ tipo: 'sindicado', registro: upd });
  }

  // si existe en condenados, se actualiza alli
  if (condenados.getByDocumento(doc)) {
    const upd = condenados.updateByDocumento(doc, body);
    return res.json({ tipo: 'condenado', registro: upd });
  }

  return res.status(404).json({ message: 'No encontrado' });
});

module.exports = router;
