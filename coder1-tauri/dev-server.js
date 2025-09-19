const express = require('express');
const path = require('path');

const app = express();
const PORT = 10001;

// Serve static files
app.use(express.static(__dirname));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'xterm-terminal.html'));
});

app.listen(PORT, () => {
    console.log(`Dev server running at http://localhost:${PORT}`);
});