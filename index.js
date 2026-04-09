const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/test', async (req, res) => {
  let browser;
  try {
    console.log('launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });

    const page = await browser.newPage();

    // 模擬真實瀏覽器
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    );

    const targetUrl = req.query.url || 'https://daskio.de5.net/forum/api/v1';
    console.log(`navigating to ${targetUrl}`);

    // 訪問頁面，等最多 30 秒讓 CF challenge 完成
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // 等一下看 CF 有沒有跳轉
    await page.waitForFunction(
      () => !document.title.includes('Just a moment'),
      { timeout: 15000 }
    ).catch(() => console.log('still on challenge page after 15s'));

    const finalUrl = page.url();
    const title = await page.title();
    const status = title.includes('Just a moment') ? 'BLOCKED' : 'PASSED';

    // 拿 cookies
    const cookies = await page.cookies();
    const cfCookie = cookies.find(c => c.name === 'cf_clearance');

    // 拿頁面內容（前 500 字）
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
