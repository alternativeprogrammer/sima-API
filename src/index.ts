// src/index.ts
import express from 'express';
import estacionesRouter from './routes/estaciones';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Ruta inicial
app.get('/', (req, res) => {
  res.send('API inicializada');
});

// Rutas para las estaciones
app.use('/api', estacionesRouter);

// Iniciar el servidor
app.listen(port, () => {
  console.log(`API inicializada en http://localhost:${port}`);
});
