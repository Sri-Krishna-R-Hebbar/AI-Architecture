const puppeteer = require('puppeteer');

async function generateSvgFromMermaid(mermaidCode) {
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        window.renderMermaid = async (code) => {
          mermaid.initialize({ startOnLoad: false });
          const { svg } = await mermaid.render('graphDiv', code);
          return svg;
        };
      </script>
    </head>
    <body></body>
  </html>
  `;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  const svg = await page.evaluate(async (code) => {
    return await window.renderMermaid(code);
  }, mermaidCode);

  await browser.close();
  return svg;
}

module.exports = { generateSvgFromMermaid };
