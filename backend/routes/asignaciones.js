const express = require('express');
const consolidado = require('../db/consolidado.repo');

const router = express.Router();

// POST /api/asignaciones
router.post('/', (req, res) => {
  const defensor = String(req.body?.defensor || '').trim();
  const documentos = Array.isArray(req.body?.documentos) ? req.body.documentos : [];

  if (!defensor) return res.status(400).json({ message: 'Defensor requerido' });
  if (!documentos.length) return res.status(400).json({ message: 'Documentos requeridos' });

  const updated = consolidado.assignDefensor(documentos, defensor);
  return res.json({ updated });
});

module.exports = router;

