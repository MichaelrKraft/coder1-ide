const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Serve static files
app.use('/ide/static', express.static(path.join(__dirname, 'coder1-ide/static')));

// Serve the IDE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'coder1-ide/ide-react.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 IDE server running at http://localhost:${PORT}`);
    console.log(`📁 Serving from: ${__dirname}/coder1-ide`);
});