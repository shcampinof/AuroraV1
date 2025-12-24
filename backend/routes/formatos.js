const express = require('express');
const path = require('path');
const router = express.Router();

const { listFormatos, getFormatoById } = require('../data/formatos.mock');

// GET /api/formatos
router.get('/', (req, res) => {
  res.json(listFormatos());
});

// GET /api/formatos/:id/download
router.get('/:id/download', (req, res) => {
  const id = String(req.params.id || '').trim();
  const formato = getFormatoById(id);
  if (!formato) return res.status(404).json({ message: 'Formato no encontrado' });

  // Archivos esperados en: backend/public/formatos/<filename>
  const filePath = path.join(__dirname, '..', 'public', 'formatos', formato.filename);

  res.download(filePath, formato.filename, (err) => {
    if (err) {
      // Si el archivo no existe aún, te va a dar error aquí (normal en modo plantilla).
      res.status(500).json({
        message:
          'No se pudo descargar. Verifica que el archivo exista en backend/public/formatos/',
        detail: err.message,
      });
    }
  });
});

module.exports = router;
