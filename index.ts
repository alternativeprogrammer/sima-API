import express from 'express';
import puppeteer from 'puppeteer-core';
import chromeLambda from 'chrome-aws-lambda';

const app = express();
const port = 3000;

// Función para lanzar el navegador con las opciones correctas
const launchBrowser = async () => {
  let options = {};

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    // Si estamos en AWS Lambda
    options = {
      args: [
        ...chromeLambda.args,
        "--hide-scrollbars",
        "--disable-web-security",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-software-rasterizer",
        "--no-first-run",
      ],
      defaultViewport: chromeLambda.defaultViewport,
      executablePath: await chromeLambda.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  } else {
    // Si estamos en desarrollo local
    options = {
      headless: true,  // Mantenerlo sin interfaz gráfica
      args: ["--no-sandbox", "--disable-setuid-sandbox"],  // Algunos entornos requieren estas opciones
    };
  }

  try {
    return await puppeteer.launch(options);
  } catch (error) {
    console.error('Error al lanzar el navegador:', error);
    throw error;
  }
};

// Ruta inicial
app.get('/', (req, res) => {
  res.send('API inicializada');
});

// Función para obtener los datos de la estación
const obtenerDatosEstacion = async (dataUrl: string) => {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  // Navegar a la URL de la estación
  await page.goto(dataUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  // Esperar hasta que la tabla sea visible y contenga datos válidos
  await page.waitForFunction(() => {
    const tbody = document.querySelector('#tablaIMK_wrapper tbody') as HTMLElement;
    return tbody && tbody.innerText.trim().length > 0 && !tbody.innerText.includes('No datos');
  });

  // Extraer los datos de la tabla
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

// Lista de estaciones
const estaciones = [
  { name: "Centro", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=CENTRO' },
  { name: "Sureste", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SURESTE' },
  // Añadir más estaciones aquí
];

// Crear rutas para cada estación
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
