const express = require('express');
const defensores = require('../db/defensores.repo');
const consolidado = require('../db/consolidado.repo');

const router = express.Router();

// GET /api/defensores
// ?source=condenados -> lista unica desde Datosconsolidados.csv (solo condenados)
router.get('/', (req, res) => {
  const source = String(req.query.source || '').trim().toLowerCase();
  if (source === 'condenados') {
    return res.json({ defensores: consolidado.getDefensoresDistinct({ tipo: 'condenado' }) });
  }
  return res.json({ defensores: defensores.getAll() });
});

module.exports = router;
