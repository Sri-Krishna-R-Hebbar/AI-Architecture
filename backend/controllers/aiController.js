const openaiService = require("../services/openaiService");

/**
 * POST /api/ai/generate-mermaid
 * Body: {
 *   conversation: string   // concatenated conversation + previous diagrams (if any)
 *   options?: {}
 * }
 *
 * Response: { title, problem, tech_stack, mermaid }
 */
async function generateMermaid(req, res, next) {
  try {
    const { conversation, options } = req.body;

    if (!conversation || typeof conversation !== "string") {
      return res.status(400).json({ error: "Missing required field: conversation (string)" });
    }

    const result = await openaiService.generateArchitectureFromConversation(conversation, options || {});
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { generateMermaid };
