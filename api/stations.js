const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
  const stationName = req.query.station || 'CENTRO';
  const url = `http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=${stationName}`;

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Wait for the table to load
    await page.waitForSelector('#tablaIMK_wrapper tbody tr', { timeout: 60000 });

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

    if (jsonData.length === 0 || (jsonData.length === 1 && jsonData[0].parametro === "No datos")) {
      return res.status(404).json({ message: 'No hay datos disponibles.' });
    }

    res.status(200).json({ station: stationName, data: jsonData });
  } catch (error) {
    console.error('Error scraping data:', error);
    res.status(500).json({ error: 'Error scraping data', details: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
};