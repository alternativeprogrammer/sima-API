const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const app = express();
const port = 3000;

puppeteer.use(StealthPlugin());

// Lista de estaciones
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

// Ruta inicial
app.get('/', (req, res) => {
  res.send('API inicializada');
});

// Función para obtener datos de una estación
const obtenerDatosEstacion = async (dataUrl) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(dataUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Esperar a que los datos sean visibles y que no contengan 'No datos'
  await page.waitForFunction(() => {
    const tbody = document.querySelector('#tablaIMK_wrapper tbody');
    return tbody && tbody.innerText.trim().length > 0 && !tbody.innerText.includes('No datos');
  });

  // Obtener los datos de la tabla
  const jsonData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#tablaIMK_wrapper tbody tr'));
    return rows.map(row => {
      const cells = row.querySelectorAll('td');
      return {
        parametro: cells[0]?.innerText.trim(),
        valor: cells[1]?.innerText.trim(),
        descriptor: cells[2]?.innerText.trim(),
      };
    });
  });

  await browser.close();
  return jsonData;
};

// Crear rutas específicas para cada estación
estaciones.forEach(estacion => {
  app.get(`/data/${estacion.name.toLowerCase()}`, async (req, res) => {
    try {
      const jsonData = await obtenerDatosEstacion(estacion.dataUrl);
      res.json(jsonData);
    } catch (error) {
      console.error(`Error al cargar los datos de ${estacion.name}:`, error);
      res.status(500).send(`Error al procesar la solicitud para ${estacion.name}`);
    }
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`API inicializada en http://localhost:${port}`);
});
