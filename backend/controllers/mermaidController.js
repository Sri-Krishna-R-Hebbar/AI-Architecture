const { generateSvgFromMermaid } = require('../services/mermaidService');

async function generateMermaid(req, res) {
  try {
    const { mermaidCode } = req.body;
    if (!mermaidCode || typeof mermaidCode !== 'string') {
      return res.status(400).json({ error: 'Missing required field: mermaidCode (string)' });
    }

    const svg = await generateSvgFromMermaid(mermaidCode);
    return res.status(200).json({ svg });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate Mermaid SVG' });
  }
}

module.exports = { generateMermaid };
