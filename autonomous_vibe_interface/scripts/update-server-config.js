const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.js');
let appContent = fs.readFileSync(appPath, 'utf8');

// Update static file serving from CANONICAL to public
if (appContent.includes("path.join(__dirname, '../CANONICAL')")) {
    appContent = appContent.replace(
        /path\.join\(__dirname, '\.\.\/CANONICAL'\)/g,
        "path.join(__dirname, '../public')"
    );
    
    // Update comments
    appContent = appContent.replace(
        /\/\/ Serve static files from CANONICAL directory[^\n]*/g,
        "// Serve static files from public directory"
    );
    
    fs.writeFileSync(appPath, appContent);
    console.log('✓ Updated app.js to serve from public instead of CANONICAL');
} else {
    console.log('✓ app.js already configured correctly');
}
