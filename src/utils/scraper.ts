// src/utils/scraper.ts
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export const obtenerDatosEstacion = async (dataUrl: string): Promise<any> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  console.log(await browser.version());
  
  const page = await browser.newPage();
  await page.goto(dataUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000
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
