const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({width: 1920, height: 1080});
  await page.goto('https://webcwm.vercel.app/admin.html');
  await page.type('#userId', '12345');
  await page.type('#password', '4599');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({path: 'C:\\Users\\dines\\.gemini\\antigravity\\brain\\ca55fd5b-7001-48f9-a9d9-edc4b286f39a\\scratch\\screenshot_vercel.png'});
  await browser.close();
})();
