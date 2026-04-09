const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/test', async (req, res) => {
  let browser;
  try {
    console.log('launching browser...');
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    );

    const targetUrl = req.query.url || 'https://daskio.de5.net/forum/api/v1';
    console.log(`navigating to ${targetUrl}`);

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForFunction(
      () => !document.title.includes('Just a moment'),
      { timeout: 15000 }
    ).catch(() => console.log('still on challenge page after 15s'));

    const finalUrl = page.url();
    const title = await page.title();
    const status = title.includes('Just a moment') ? 'BLOCKED' : 'PASSED';

    const cookies = await page.cookies();
    const cfCookie = cookies.find(c => c.name === 'cf_clearance');

    const body = await page.evaluate(() => document.body.innerText.slice(0, 500));

    const result = {
      status,
      finalUrl,
      title,
      cfClearanceCookie: cfCookie ? cfCookie.value : null,
      allCookies: cookies.map(c => `${c.name}=${c.value.slice(0, 20)}...`),
      bodyPreview: body
    };

    console.log('result:', JSON.stringify(result, null, 2));
    res.json(result);

  } catch (err) {
    console.error('error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/', (req, res) => {
  res.send('CF Test Server is running. Visit /test to run the test.');
});

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
