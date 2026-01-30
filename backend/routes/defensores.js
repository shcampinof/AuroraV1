const express = require('express');
const defensores = require('../db/defensores.repo');
const condenados = require('../db/condenados.repo');

const router = express.Router();

// GET /api/defensores
// ?source=condenados -> lista unica desde condenados.csv
router.get('/', (req, res) => {
  const source = String(req.query.source || '').trim().toLowerCase();
  if (source === 'condenados') {
    return res.json({ defensores: condenados.getDefensoresDistinct() });
  }
  return res.json({ defensores: defensores.getAll() });
});

// GET /api/defensores/casos?defensor=Nombre
router.get('/casos', (req, res) => {
  const defensor = String(req.query.defensor || '').trim();
  if (!defensor) return res.status(400).json({ message: 'Defensor requerido' });

  const casos = condenados.getCasosByDefensor(defensor);
  return res.json({ casos });
});

// POST /api/defensores
router.post('/', (req, res) => {
  const nombre = String(req.body?.nombre || '').trim();
  if (!nombre) return res.status(400).json({ message: 'Nombre requerido' });

  const created = defensores.add(nombre);
  if (!created) return res.status(400).json({ message: 'No se pudo crear defensor' });

  return res.status(201).json({ nombre: created });
});

module.exports = router;
