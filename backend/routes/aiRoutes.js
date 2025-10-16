const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

/**
 * POST /api/ai/generate-mermaid
 * Body: { problem: string, options?: { diagramType?: string } }
 * Response: { mermaid: string }
 */
router.post('/generate-mermaid', aiController.generateMermaid);

module.exports = router;
