const express = require('express');
const router = express.Router();

const aiRoutes = require('./aiRoutes');
const pdfRoutes = require('./pdfRoutes');

router.use('/ai', aiRoutes);
router.use('/pdf', pdfRoutes);

module.exports = router;
