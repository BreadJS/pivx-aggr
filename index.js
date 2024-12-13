const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Set the public directory for static files
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(PORT, () => {
  console.log(`HTTP Server is running on http://127.0.0.1:${PORT}`);
});
