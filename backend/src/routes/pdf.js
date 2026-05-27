const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/pdf/:token — generate PDF for quote
router.get('/:token', async (req, res) => {
  const q = db.prepare('SELECT * FROM quotes WHERE token = ? AND is_template = 0').get(req.params.token);
  if (!q) return res.status(404).json({ error: 'Not found' });

  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach((r) => { settings[r.key] = r.value; });

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    return res.status(500).json({ error: 'Puppeteer not available' });
  }

  const printUrl = `http://localhost:${process.env.PORT || 3001}/p/${req.params.token}?print=true`;
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });
    const page = await browser.newPage();
    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(500);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    const clientName = q.client_name.replace(/\s+/g, '_') || 'לקוח';
    const date = (q.date || '').replace(/-/g, '');
    const filename = `הצעת_מחיר_${clientName}_${date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(pdf);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
