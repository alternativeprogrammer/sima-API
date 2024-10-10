import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const app = express();
const port = process.env.PORT || 3000;

puppeteer.use(StealthPlugin());

// Variables para manejar AWS Lambda y local
let chrome = {};
let puppeteerInstance;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteerInstance = require("puppeteer-core");
} else {
  puppeteerInstance = puppeteer;  // Si no es AWS, usa puppeteer normal
}

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

// Ruta para obtener datos de una estación específica
app.get('/api', async (req, res) => {
  const { station } = req.query;

  // Verificar si el nombre de la estación es válido
  if (!station || typeof station !== 'string') {
    return res.status(400).json({ error: 'Parámetro "station" es requerido' });
  }

  const estacion = estaciones.find(e => e.name.toLowerCase() === station.toLowerCase());

  if (!estacion) {
    return res.status(404).json({ error: `Estación "${station}" no encontrada` });
  }

  let options = {};
  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  try {
    const browser = await puppeteerInstance.launch(options);
    const page = await browser.newPage();
    await page.goto(estacion.dataUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForFunction(() => {
      const tbody = document.querySelector('#tablaIMK_wrapper tbody');
      return tbody && tbody.innerText.trim().length > 0 && !tbody.innerText.includes('No datos');
    });

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
    res.json(jsonData);

  } catch (error) {
    console.error(`Error al procesar los datos de la estación "${station}":`, error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
