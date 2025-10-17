const pdfGenerator = require("../utils/pdfGenerator");

async function exportPdf(req, res, next) {
  try {
    const { title, problem, svg, tech_stack } = req.body;
    if (!title || !problem || !svg) {
      return res.status(400).json({ error: "Missing title, problem or svg in request body" });
    }

    // pdfGenerator returns a Buffer
    const pdfBuffer = await pdfGenerator.generatePdfFromSvg({ title, problem, svg, tech_stack });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(title)}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_\- ]/gi, "_").trim().slice(0, 150);
}

module.exports = { exportPdf };
