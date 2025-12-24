const express = require('express');
const router = express.Router();

const {
  getAll,
  getByDocumento,
  updateByDocumento,
} = require('../data/registros.mock');

// GET /api/registros
router.get('/', (req, res) => {
  res.json(getAll());
});

// GET /api/registros/:documento
router.get('/:documento', (req, res) => {
  const doc = String(req.params.documento || '').trim();
  const registro = getByDocumento(doc);
  if (!registro) return res.status(404).json({ message: 'Registro no encontrado' });
  res.json(registro);
});

// PUT /api/registros/:documento
router.put('/:documento', (req, res) => {
  const doc = String(req.params.documento || '').trim();
  const actualizado = updateByDocumento(doc, req.body || {});
  if (!actualizado) return res.status(404).json({ message: 'Registro no encontrado' });
  res.json(actualizado);
});

module.exports = router;
