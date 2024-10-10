// src/routes/estaciones.ts
import { Router } from 'express';
import { obtenerDatosEstacion } from '../utils/scraper';

const router = Router();

const estaciones = [
    { name: "Centro", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=CENTRO' },
    { name: "Sureste", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SURESTE' },
    { name: "Noreste", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=NORESTE' },
    { name: "Noroeste", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=NOROESTE' },
    { name: "Suroeste", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SUROESTE' },
    { name: "Noroeste2", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=GARCIA' },
    { name: "Norte", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=NORTE' },
    { name: "Noreste2", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=NORESTE2' },
    { name: "Sureste2", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SURESTE2' },
    { name: "Suroeste2", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=[SAN%20Pedro]' },
    { name: "Sureste3", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SURESTE3' },
    { name: "Norte2", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=NORTE2' },
    { name: "Sur", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SUR' },
  ];

estaciones.forEach(estacion => {
  router.get(`/data/${estacion.name.toLowerCase()}`, async (req, res) => {
    try {
      const jsonData = await obtenerDatosEstacion(estacion.dataUrl);
      res.json(jsonData);
    } catch (error) {
      console.error(`Error al cargar los datos de ${estacion.name}:`, error);
      res.status(500).send(`Error al procesar la solicitud para ${estacion.name}`);
    }
  });
});

export default router;
