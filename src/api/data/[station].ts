import { NowRequest, NowResponse } from '@vercel/node';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chromium from 'chrome-aws-lambda';

puppeteer.use(StealthPlugin());

const estaciones = {
  centro: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=CENTRO',
  sureste: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SURESTE',
  // Add all other stations here...
};

const obtenerDatosEstacion = async (dataUrl: string) => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: true,
  });

  const page = await browser.newPage();
  await page.goto(dataUrl, { waitUntil: 'networkidle2' });

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

export default async (req: NowRequest, res: NowResponse) => {
  const { station } = req.query;
  const dataUrl = estaciones[station as string];

  if (!dataUrl) {
    return res.status(404).json({ error: 'Station not found' });
  }

  try {
    const data = await obtenerDatosEstacion(dataUrl);
    res.status(200).json(data);
  } catch (error) {
    console.error(`Error loading data for station ${station}:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
