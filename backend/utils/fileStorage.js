// Placeholder for file saving (if needed later)
const fs = require('fs');
const path = require('path');

function saveTempFile(filename, data) {
  const filepath = path.join(__dirname, '../temp', filename);
  fs.writeFileSync(filepath, data);
  return filepath;
}

module.exports = { saveTempFile };
