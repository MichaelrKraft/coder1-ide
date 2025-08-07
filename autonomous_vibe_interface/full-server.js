const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public/static')));
app.use('/styles.css', express.static(path.join(__dirname, 'public/styles.css')));
app.use(express.static(path.join(__dirname, 'public')));

// Serve the standalone IDE
app.get('/standalone', (req, res) => {
    res.sendFile(path.join(__dirname, 'standalone-ide.html'));
});

// Main route
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>Coder1 IDE Server</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Coder1 IDE Server</h1>
            <p>Choose an option:</p>
            <ul>
                <li><a href="/standalone">Standalone IDE (Working)</a> - A fully functional IDE</li>
                <li><a href="/index.html">Main Application</a></li>
                <li><a href="/ide.html">React IDE</a></li>
            </ul>
        </body>
        </html>
    `);
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Full server running at http://127.0.0.1:${PORT}/`);
    console.log(`Try the standalone IDE at: http://127.0.0.1:${PORT}/standalone`);
});