const express = require('express');
const consolidado = require('../db/consolidado.repo');

const router = express.Router();

// Listado por tipo: /api/ppl?tipo=condenado | sindicado
router.get('/', (req, res) => {
  const tipo = String(req.query.tipo || 'all').trim().toLowerCase();

  const allRows = consolidado.getAll();
  const rows =
    tipo === 'condenado' || tipo === 'sindicado'
      ? allRows.filter((r) => consolidado.computeTipo(r) === tipo)
      : allRows;

  return res.json({ tipo, columns: consolidado.getColumns(), rows });
});

// Listado de condenados (mapeado para tabla de asignación)
router.get('/condenados', (req, res) => {
  const rows = consolidado
    .getAll()
    .filter((r) => consolidado.computeTipo(r) === 'condenado')
    .map((row) => ({
      numeroIdentificacion: consolidado.getValue(row, 'Número de identificación', ''),
      nombreUsuario: consolidado.getValue(row, 'Nombre', ''),
      lugarReclusion: consolidado.getValue(row, 'Nombre del lugar de privación de la libertad', ''),
      departamentoLugarReclusion: consolidado.getValue(row, 'Departamento del lugar de privación de la libertad', ''),
      municipioLugarReclusion: consolidado.getValue(row, 'Distrito/municipio del lugar de privación de la libertad', ''),
      autoridadCargo: consolidado.getValue(row, 'Autoridad a cargo', ''),
      numeroProceso: consolidado.getValue(row, 'Número de proceso', ''),
      situacionJuridica: consolidado.getValue(row, 'Situación Jurídica', ''),
      defensorAsignado: consolidado.getValue(
        row,
        'Defensor(a) Público(a) Asignado para tramitar la solicitud',
        ''
      ),
    }));
  return res.json({ rows });
});

// Busqueda unificada por documento: devuelve tipo + registro
router.get('/:documento', (req, res) => {
  const doc = req.params.documento;

  const r = consolidado.getByDocumento(doc);
  if (r) return res.json({ tipo: consolidado.computeTipo(r), registro: r });

  return res.status(404).json({ message: 'No encontrado' });
});

// Update unificado
router.put('/:documento', (req, res) => {
  const doc = req.params.documento;
  const body = req.body || {};

  if (consolidado.getByDocumento(doc)) {
    const upd = consolidado.updateByDocumento(doc, body);
    return res.json({ tipo: consolidado.computeTipo(upd), registro: upd });
  }

  return res.status(404).json({ message: 'No encontrado' });
});

module.exports = router;
