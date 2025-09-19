const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3001;

app.use(cors());

// Middleware para servir imágenes estáticas desde la carpeta "images"
app.use('/images', express.static(path.join(__dirname, 'images')));

// Endpoints específicos para imágenes individuales
app.get('/api/abdomen', (req, res) => {
  res.sendFile(path.join(__dirname, 'images', 'abdomen.jpg'));
});

app.get('/api/cabeza', (req, res) => {
  res.sendFile(path.join(__dirname, 'images', 'cabeza.jpg'));
});

app.get('/api/mano', (req, res) => {
  res.sendFile(path.join(__dirname, 'images', 'mano.jpg'));
});

app.get('/api/pelvis', (req, res) => {
  res.sendFile(path.join(__dirname, 'images', 'pelvis.jpg'));
});

app.get('/api/pie', (req, res) => {
  res.sendFile(path.join(__dirname, 'images', 'pie.jpg'));
});

app.get('/api/torax', (req, res) => {
  res.sendFile(path.join(__dirname, 'images', 'torax.jpg'));
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
