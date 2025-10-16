const openaiService = require('../services/openaiService');

async function generateMermaid(req, res, next) {
  try {
    const { problem, options } = req.body;
    if (!problem || typeof problem !== 'string') {
      return res.status(400).json({ error: 'Missing required field: problem (string)' });
    }

    // options may contain hints like preferred diagram type (flowchart, sequence, system)
    const mermaid = await openaiService.generateMermaidFromProblem(problem, options || {});
    return res.json({ mermaid });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateMermaid };
