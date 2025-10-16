const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');

/**
 * POST /api/pdf/export
 * Body: { title: string, problem: string, svg: string }
 * Response: application/pdf (attachment)
 */
router.post('/export', pdfController.exportPdf);

module.exports = router;
