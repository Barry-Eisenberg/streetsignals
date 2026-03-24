const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8092/institutional-radar/', { waitUntil: 'networkidle' });
  await page.click('#generateRadarBtn');
  const wrap = page.locator('#radarWrap');
  await wrap.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await wrap.screenshot({ path: '.qa-screens/radar-wrap-mobile-after-fix.png' });
  await browser.close();
})();
