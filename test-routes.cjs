const path = require('path');
const fs = require('fs');

// Test path resolution
const testDirname = '/Users/michaelkraft/autonomous_vibe_interface/src';
const testPaths = [
    path.join(testDirname, '../CANONICAL/component-studio.html'),
    path.join(testDirname, '../CANONICAL/templates-hub.html'),
    path.join(testDirname, '../CANONICAL/hooks-v3.html'),
    path.join(testDirname, '../CANONICAL/workflow-dashboard.html')
];

console.log('Testing paths from app.js perspective:\n');

testPaths.forEach(filePath => {
    console.log(`Path: ${filePath}`);
    console.log(`Exists: ${fs.existsSync(filePath)}`);
    console.log(`Is Absolute: ${path.isAbsolute(filePath)}`);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`Size: ${stats.size} bytes`);
        console.log(`Readable: ${fs.accessSync(filePath, fs.constants.R_OK) === undefined}`);
    }
    console.log('---');
});

// Test server response
const http = require('http');
console.log('\nTesting actual server routes:');

const routes = ['/component-studio', '/templates-hub', '/hooks', '/workflow-dashboard'];
let completed = 0;

routes.forEach(route => {
    http.get(`http://localhost:3000${route}`, (res) => {
        console.log(`${route}: Status ${res.statusCode}`);
        if (++completed === routes.length) {
            process.exit(0);
        }
    }).on('error', (e) => {
        console.error(`${route}: Error - ${e.message}`);
        if (++completed === routes.length) {
            process.exit(0);
        }
    });
});

setTimeout(() => {
    console.log('Timeout - exiting');
    process.exit(0);
}, 5000);