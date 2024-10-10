import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chromium from 'chrome-aws-lambda';

const app = express();
const port = 3000;

puppeteer.use(StealthPlugin());

// Function to launch Puppeteer with the right executable
const launchBrowser = async () => {
  const executablePath = await chromium.executablePath;

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: executablePath || undefined,  // Use Chromium path if available, otherwise default
    headless: true,
  });
};

const obtenerDatosEstacion = async (dataUrl: string) => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(dataUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  await page.waitForFunction(() => {
    const tbody = document.querySelector('#tablaIMK_wrapper tbody') as HTMLElement;
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
  return jsonData;
};

// API Routes for each station
estaciones.forEach(estacion => {
  app.get(`/data/${estacion.name.toLowerCase()}`, async (req, res) => {
    try {
      const jsonData = await obtenerDatosEstacion(estacion.dataUrl);
      res.json(jsonData);
    } catch (error) {
      console.error(`Error loading data for ${estacion.name}:`, error);
      res.status(500).send(`Error processing request for ${estacion.name}`);
    }
  });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
