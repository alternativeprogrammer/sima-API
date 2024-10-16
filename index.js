const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 4000;

app.get('/api/stations', async (req, res) => {
  const stationName = req.query.station || 'CENTRO';
  const url = `http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=${stationName}`;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Espera adicional para asegurar que la página cargue


    // Esperar a que la tabla tenga datos válidos y no contenga "No datos"
    await page.waitForFunction(() => {
      const tbody = document.querySelector("#tablaIMK_wrapper tbody");
      return (
        tbody &&
        tbody.innerText.trim().length > 0 &&
        !tbody.innerText.includes("No datos")
      );
    }, { timeout: 60000 }); // Timeout aumentado a 60 segundos

    // Extraer datos de la tabla
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

    // Verificar si hay datos válidos antes de enviar la respuesta
    if (jsonData.length === 0) {
      return res.status(404).json({ message: 'No hay datos disponibles.' });
    }

    res.json({ station: stationName, data: jsonData });
  } catch (error) {
    console.error('Error scraping data:', error);
    res.status(500).json({ error: 'Error scraping data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
