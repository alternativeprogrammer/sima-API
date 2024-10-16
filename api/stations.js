const express = require("express");
const app = express();

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

app.get("/api/stations", async (req, res) => {
  const stationName = req.query.station || 'CENTRO'; // Estación por defecto
  const url = `http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=${stationName}`;

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

  let browser;
  try {
    browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

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

    res.json({ station: stationName, data: jsonData });
  } catch (error) {
    console.error('Error scraping data:', error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ error: 'Error scraping data' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
