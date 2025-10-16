require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const aiRoutes = require('./routes/aiRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' })); // allow large SVG payloads
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/pdf', pdfRoutes);

const mermaidRoutes = require('./routes/mermaidRoutes');
app.use('/api/mermaid', mermaidRoutes);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
