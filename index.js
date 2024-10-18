const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 4000;

async function scrapeStation(stationName) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.goto(`http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=${stationName}`, {
      waitUntil: 'networkidle0',
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const data = await page.evaluate(() => {
      const table = document.getElementById('tablaIMK');
      if (!table) return null;

      const tbody = table.querySelector('tbody');
      if (!tbody) return null;

      const rows = Array.from(tbody.querySelectorAll('tr'));
      
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
  const data = await scrapeStation(stationName);
  
  if (data === null) {
    res.status(404).json({ error: 'Data not found or error occurred' });
  } else {
    res.json(data);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});