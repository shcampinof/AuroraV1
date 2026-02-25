require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const formatosRoutes = require('./routes/formatos');
const pplRoutes = require('./routes/ppl');
const defensoresRoutes = require('./routes/defensores');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Salud
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend AURORA operativo (modo MOCK)' });
});

// Rutas principales
app.use('/api/formatos', formatosRoutes);
app.use('/api/ppl', pplRoutes);
app.use('/api/defensores', defensoresRoutes);

// (Opcional) servir carpeta de formatos como estática si quieres enlaces directos
app.use(
  '/downloads',
  express.static(path.join(__dirname, 'public', 'formatos'))
);

app.listen(port, () => {
  console.log(`Servidor AURORA escuchando en http://localhost:${port}`);
});
