const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const NodeCache = require('node-cache');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CACHE_TTL = 300; // Cache for 5 minutes

const cache = new NodeCache({ stdTTL: CACHE_TTL });

app.use(cors());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/api/stations', async (req, res) => {
  const stationName = req.query.station || 'CENTRO';
  const cacheKey = `station_${stationName}`;

  try {
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const url = `http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=${stationName}`;

    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
      headless: true,
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.waitForFunction(() => {
      const tbody = document.querySelector("#tablaIMK_wrapper tbody");
      return (
        tbody &&
        tbody.innerText.trim().length > 0 &&
        !tbody.innerText.includes("No datos")
      );
    }, { timeout: 60000 });

    const jsonData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("#tablaIMK_wrapper tbody tr"));
      return rows.map((row) => {
        const cells = row.querySelectorAll("td");
        return {
          parametro: cells[0]?.innerText.trim() || '',
          valor: cells[1]?.innerText.trim() || '',
          descriptor: cells[2]?.innerText.trim() || '',
        };
      });
    });

    await browser.close();

    if (jsonData.length === 0) {
      return res.status(404).json({ message: 'No hay datos disponibles.' });
    }

    const responseData = { station: stationName, data: jsonData };
    
    // Store in cache
    cache.set(cacheKey, responseData);

    res.json(responseData);
  } catch (error) {
    console.error('Error scraping data:', error);
    res.status(500).json({ error: 'Error scraping data' });
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});