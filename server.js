const express = require('express');
const puppeteer = require('puppeteer');
const Redis = require('ioredis');
const Queue = require('bull');

const app = express();
const port = process.env.PORT || 4000;
const redis = new Redis(process.env.REDIS_URL);

// Bull queue setup
const scrapingQueue = new Queue('scraping', process.env.REDIS_URL);

async function scrapeStation(stationName) {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process'
    ],
    headless: true,
    defaultViewport: null,
  });
  const page = await browser.newPage();
  
  try {
    await page.goto(`http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=${stationName}`, {
      waitUntil: 'networkidle0',
    });

    const data = await page.evaluate(() => {
      const table = document.getElementById('tablaIMK');
      if (!table) return null;

      const rows = Array.from(table.querySelectorAll('tbody > tr'));
      
      return rows.map(row => {
        const columns = row.querySelectorAll('td');
        return Array.from(columns, column => column.innerText.trim());
      }).filter(row => row.length > 0);
    });

    return data;
  } catch (error) {
    console.error('An error occurred:', error);
    return null;
  } finally {
    await browser.close();
  }
}

app.get('/api/station/:stationName', async (req, res) => {
  const { stationName } = req.params;
  
  try {
    // Check cache first
    const cachedData = await redis.get(`station:${stationName}`);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // If not in cache, add scraping job to queue and return status
    await scrapingQueue.add({ stationName });
    res.json({ status: 'scraping', message: 'Data is being scraped. Please check back later.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Process scraping jobs
scrapingQueue.process(async (job) => {
  const { stationName } = job.data;
  const data = await scrapeStation(stationName);
  
  if (data) {
    // Cache the result for 1 hour
    await redis.set(`station:${stationName}`, JSON.stringify(data), 'EX', 3600);
  }
  
  return data;
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});