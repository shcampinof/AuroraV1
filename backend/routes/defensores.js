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

// POST /api/defensores
// body: { nombre: string }
router.post('/', (req, res) => {
  try {
    const nombre = defensores.normalizeNombre(req.body?.nombre);
    defensores.assertNombreValido(nombre);

    const existsInCondenados = consolidado
      .getDefensoresDistinct({ tipo: 'condenado' })
      .some((value) => defensores.normalizeNombre(value) === nombre);

    if (existsInCondenados) {
      return res.status(409).json({
        error: 'El defensor ya existe.',
        code: 'DUPLICATE_DEFENSOR',
      });
    }

    const created = defensores.create(nombre);
    return res.status(201).json({ defensor: created });
  } catch (err) {
    const status = Number(err?.status) || 500;
    const code = err?.code || 'DEFENSOR_CREATE_ERROR';
    const error =
      status >= 500 ? 'Error guardando defensor.' : String(err?.message || 'Error guardando defensor.');
    return res.status(status).json({ error, code });
  }
});

module.exports = router;
