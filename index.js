const express = require('express');
const { Cluster } = require('puppeteer-cluster');
const cors = require('cors');
const NodeCache = require('node-cache');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CACHE_TTL = 300; // Cache for 5 minutes

const cache = new NodeCache({ stdTTL: CACHE_TTL });

app.use(cors());

// Cluster setup
let cluster;

(async () => {
  cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE, // Can also use Cluster.CONCURRENCY_CONTEXT
    maxConcurrency: 15, // Adjust based on the load you expect
    puppeteerOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    },
    timeout: 60 * 1000, // Set a timeout for each job to prevent hangs
    monitor: true, // Optional: for logging and monitoring
  });

  // Event listener for errors in cluster tasks
  cluster.on('taskerror', (err, data) => {
    console.error(`Error crawling ${data}: ${err.message}`);
  });
})();

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

    // Define the task for Puppeteer Cluster
    const data = await cluster.execute({
      stationName,
      url: `http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=${stationName}`,
    }, async ({ page, data: { url, stationName } }) => {
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Wait for the table to load
      await page.waitForFunction(() => {
        const tbody = document.querySelector("#tablaIMK_wrapper tbody");
        return (
          tbody &&
          tbody.innerText.trim().length > 0 &&
          !tbody.innerText.includes("No datos")
        );
      }, { timeout: 60000 });

      // Scrape the data
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

      // Close the page
      return { station: stationName, data: jsonData };
    });

    if (!data || data.data.length === 0) {
      return res.status(404).json({ message: 'No hay datos disponibles.' });
    }

    // Store in cache
    cache.set(cacheKey, data);

    res.json(data);
  } catch (error) {
    console.error('Error scraping data:', error);
    res.status(500).json({ error: 'Error scraping data' });
  }
});

// Graceful shutdown for the cluster
process.on('SIGINT', async () => {
  console.log('Gracefully shutting down the cluster...');
  if (cluster) {
    await cluster.idle();
    await cluster.close();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
