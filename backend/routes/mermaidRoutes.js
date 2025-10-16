const express = require('express');
const router = express.Router();
const { generateMermaid } = require('../controllers/mermaidController');

router.post('/render', generateMermaid);

module.exports = router;
