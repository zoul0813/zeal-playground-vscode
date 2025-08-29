# Zeal 8-bit Extension Configuration

The Zeal 8-bit extension supports project-level configuration that allows users to customize the behavior of the extension for their specific projects.

## Configuration Properties

### `zeal8bit.uses`

- **Type**: `string`
- **Default**: `""` (empty string)
- **Scope**: `resource` (can be set per workspace/folder)
- **Description**: Custom property to define what the project uses. Can be used for project-specific settings.

## How to Configure

You can configure the extension in several ways:

### 1. Workspace Settings (Recommended)

Create or edit `.vscode/settings.json` in your project root:

```json
{
  "zeal8bit.uses": "zealos"
}
```

### 2. User Settings

Open VS Code Settings (Cmd/Ctrl + ,) and search for "zeal8bit" to configure globally.

### 3. Settings UI

1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "zeal8bit"
3. Set the "Uses" property to your desired value

## Example Usage

The `uses` property can be used to specify what type of project or toolchain you're working with:

- `"zealos"` - For Zeal OS Programs
- `"bare"` - For Bare Metal Zeal 8-bit Programs

## How It Works

When you set the configuration:

1. The extension reads the configuration on startup
2. The configuration is passed to the preview panel when loading binaries
3. You can see the configuration value in the emulator's listing view
4. The extension automatically updates when you change the configuration

## Example Configuration Files

### Bare Metal Project

This is the default configuration.

```json
{
  "zeal8bit.uses": "bare"
}
```

### Zeal OS Project

```json
{
  "zeal8bit.uses": "zealos"
}
```

## Future Extensions

This configuration system can be extended in the future to support additional properties such as:

- Build configurations
- Emulator settings
- Debug options
- Custom toolchain paths

The configuration is designed to be extensible, so new properties can be added without breaking existing setups.
