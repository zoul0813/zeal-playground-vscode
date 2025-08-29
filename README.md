# Zeal 8-bit Emulator Preview Extension

This VS Code extension loads Zeal 8-bit binaries into a preview panel with the Native Emulator. It will auto-refresh after running the build task to reload the most recent ".bin" found in the project.

## Features

- **Preview Panel**: Open a Zeal 8-bit emulator directly in VS Code
- **Build Integration**: Automatically detects when build tasks complete and loads the generated binary
- **Manual Loading**: Right-click on `.bin` files to load them directly into the emulator
- **Embedded Emulator**: Full Zeal 8-bit computer emulation with graphics, sound, and controls

## Usage

### Opening the Preview Panel

1. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run the command: `Zeal 8-bit: Open Zeal 8-bit Preview`

### Loading Binaries

#### Automatic (from Build Tasks)

1. Set up a build task in your workspace that generates `.bin` files
2. Run your build task (`Cmd+Shift+P` → `Tasks: Run Build Task`)
3. When the build completes, the extension will reload the most recent `.bin`

#### Manual Loading

1. Right-click on any `.bin` file in the Explorer
2. Select `Load Binary in Zeal 8-bit Preview`

### Build Task Integration

The extension automatically looks for binary outputs in common directories after build tasks complete:

- `build/`
- `dist/`
- `out/`
- `target/`
- `bin/`

## Configuration

The extension supports project-level configuration through VS Code settings. You can customize the extension behavior for your specific project.

### Available Settings

- **`zeal8bit.uses`**: A string property that allows you to specify what your project uses (e.g., "assembler", "c", "game", etc.)

### Example Configuration

Add to your `.vscode/settings.json`:

```json
{
  "zeal8bit.uses": "zealos"
}
```

For more details, see [CONFIGURATION.md](CONFIGURATION.md).

## Commands

- `zeal8bit.openPreview` - Open the Zeal 8-bit preview panel
- `zeal8bit.loadBinary` - Load a binary file into the preview

## Requirements

- VS Code 1.74.0 or higher
- A project that builds Zeal 8-bit compatible binaries

## Known Issues

- Large binary files may take a moment to load
- The emulator panel requires JavaScript to be enabled

## Release Notes

### 0.0.1

Initial release of the Zeal 8-bit Preview extension.
