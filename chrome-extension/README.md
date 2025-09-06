# Coder1 Component Capture - Chrome Extension

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `chrome-extension` directory from this project
5. The extension icon will appear in your Chrome toolbar

## Usage

### Method 1: Right-Click Context Menu
1. Navigate to any website
2. Right-click on any element you want to capture
3. Select "Capture to Coder1" from the context menu
4. The component will be saved to your Coder1 library

### Method 2: Extension Popup
1. Click the Coder1 extension icon in your toolbar
2. Click "Start Capture Mode"
3. Click on any element on the page to capture it

### Method 3: Keyboard Shortcut
- Press `Alt+C` to start capture mode (coming soon)

## Features

- **Full DOM Capture**: Captures complete HTML structure
- **CSS Extraction**: Gets all computed styles including inherited properties
- **Smart Selection**: Visual highlighting of elements on hover
- **Instant Save**: Components are immediately saved to your Coder1 backend
- **Code Generation**: Automatically generates React/Vue/HTML code

## Requirements

- Coder1 backend must be running on `http://localhost:3000`
- Chrome browser (latest version recommended)

## Privacy

This extension:
- Only captures elements you explicitly select
- Only sends data to your local Coder1 instance
- Does not collect any personal information
- Does not send data to external servers

## Icons

For now, the extension uses placeholder icons. To add custom icons:
1. Create 16x16, 48x48, and 128x128 PNG images
2. Save them as `icon-16.png`, `icon-48.png`, and `icon-128.png`
3. Reload the extension

## Troubleshooting

### Extension not connecting to backend
- Ensure Coder1 backend is running: `npm start`
- Check that backend is on port 3000: `http://localhost:3000/health`
- Reload the extension from `chrome://extensions/`

### Components not appearing in library
- Check browser console for errors (F12)
- Verify backend is receiving requests
- Ensure you have write permissions to `/data/captured-components/`

## Development

To modify the extension:
1. Edit files in this directory
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Coder1 extension card
4. Test your changes

## License

MIT - Part of the Coder1 IDE project