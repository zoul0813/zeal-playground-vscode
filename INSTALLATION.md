# Installing the Zeal 8-bit Preview Extension

This guide will help you install the Zeal 8-bit Preview extension in VS Code.

## Installation

1. **Download the extension file**: Get the `zeal-8bit-preview-0.0.1.vsix` file from your coworker.

2. **Install in VS Code**:

   - Open VS Code
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux) to open the Command Palette
   - Type `Extensions: Install from VSIX...` and select it
   - Browse to and select the `zeal-8bit-preview-0.0.1.vsix` file
   - Click "Install"

3. **Alternative installation method**:
   - Open VS Code
   - Go to the Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
   - Click the "..." menu (three dots) at the top right of the Extensions panel
   - Select "Install from VSIX..."
   - Choose the `zeal-8bit-preview-0.0.1.vsix` file

## Usage

After installation, you can:

1. **Open the preview panel**:

   - Press `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Type "Zeal 8-bit: Open Zeal 8-bit Preview"

2. **Load binary files**:

   - Right-click on any `.bin` file in the Explorer
   - Select "Load Binary in Zeal 8-bit Preview"

3. **Configure the extension**:
   - Add settings to your workspace `.vscode/settings.json`:
   ```json
   {
     "zeal8bit.uses": "zealos"
   }
   ```

## Features

- **Preview Panel**: Full Zeal 8-bit emulator in VS Code
- **Build Integration**: Automatically detects build completions
- **Manual Loading**: Right-click context menu for `.bin` files
- **Configuration**: Project-level settings support

For more information, see the [CONFIGURATION.md](CONFIGURATION.md) file.

## Troubleshooting

If you encounter issues:

1. Make sure VS Code is version 1.74.0 or higher
2. Try reloading VS Code (`Cmd+R` / `Ctrl+R`)
3. Check the VS Code Developer Console for errors (`Help > Toggle Developer Tools`)

## Uninstalling

To uninstall:

1. Go to Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Find "Zeal 8-bit Emulator Preview"
3. Click the gear icon and select "Uninstall"
