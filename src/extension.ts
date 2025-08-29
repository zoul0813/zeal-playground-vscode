import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Get the project-level configuration for Zeal 8-bit
 */
function getZeal8bitConfig() {
  const config = vscode.workspace.getConfiguration('zeal8bit');
  return {
    uses: config.get<string>('uses', ''),
  };
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Zeal 8-bit Preview extension is now active!');

  // Log current configuration
  const config = getZeal8bitConfig();
  console.log('Zeal 8-bit configuration:', config);

  // Listen for configuration changes
  const configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('zeal8bit')) {
      const newConfig = getZeal8bitConfig();
      console.log('Zeal 8-bit configuration changed:', newConfig);

      // Update the current panel's configuration if it exists
      if (ZealPreviewPanel.currentPanel) {
        ZealPreviewPanel.currentPanel.updateConfig();
      }
    }
  });

  // Register command to open preview
  const openPreviewCommand = vscode.commands.registerCommand('zeal8bit.openPreview', () => {
    ZealPreviewPanel.createOrShow(context.extensionUri);
  });

  // Register command to load binary
  const loadBinaryCommand = vscode.commands.registerCommand('zeal8bit.loadBinary', (uri: vscode.Uri) => {
    if (uri && uri.fsPath.endsWith('.bin')) {
      ZealPreviewPanel.createOrShow(context.extensionUri);
      ZealPreviewPanel.currentPanel?.loadBinary(uri.fsPath);
    }
  });

  // Listen for task completion
  const taskEndListener = vscode.tasks.onDidEndTask((e: vscode.TaskEndEvent) => {
    // Check if this is a build task
    const taskGroup = e.execution.task.group;
    const isBuildTask =
      taskGroup === vscode.TaskGroup.Build ||
      (taskGroup as any) === 'build' ||
      (taskGroup && typeof taskGroup === 'object' && (taskGroup as any).c === 'build');

    if (isBuildTask) {
      handleBuildTaskComplete(e.execution.task);
    }
  });

  context.subscriptions.push(openPreviewCommand, loadBinaryCommand, taskEndListener, configChangeListener);
}

async function handleBuildTaskComplete(task: vscode.Task) {
  // Look for binary output files in common locations
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  const commonBinaryPaths = [
    'build',
    'dist',
    'out',
    'target',
    'bin',
    '.', // current directory
  ];

  const foundBinaries: string[] = [];

  for (const dir of commonBinaryPaths) {
    const dirPath = path.join(workspaceFolder.uri.fsPath, dir);
    if (fs.existsSync(dirPath)) {
      try {
        const stats = fs.statSync(dirPath);
        if (stats.isDirectory()) {
          const files = fs.readdirSync(dirPath);
          const binaryFiles = files.filter((file: string) => file.endsWith('.bin'));
          for (const binaryFile of binaryFiles) {
            foundBinaries.push(path.join(dirPath, binaryFile));
          }
        } else if (dirPath.endsWith('.bin') && stats.isFile()) {
          foundBinaries.push(dirPath);
        }
      } catch (error) {
        // Ignore errors for directories that don't exist or aren't accessible
      }
    }
  }

  if (foundBinaries.length > 0) {
    // Sort by modification time, newest first
    foundBinaries.sort((a, b) => {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statB.mtime.getTime() - statA.mtime.getTime();
    });

    const newestBinary = foundBinaries[0];
    const binaryName = path.basename(newestBinary);

    // Auto-load the binary if preview panel is open
    if (ZealPreviewPanel.currentPanel) {
      ZealPreviewPanel.currentPanel.loadBinary(newestBinary);
    } else {
      // Ask user if they want to open preview with the binary
      const action = await vscode.window.showInformationMessage(
        `Build completed. Found binary: ${binaryName}`,
        'Open in Zeal 8-bit Preview',
        'Dismiss',
      );
      if (action === 'Open in Zeal 8-bit Preview') {
        const extensionUri =
          vscode.extensions.getExtension('zeal-8bit-preview')?.extensionUri ||
          vscode.Uri.file(path.dirname(__filename));
        ZealPreviewPanel.createOrShow(extensionUri);
        setTimeout(() => {
          ZealPreviewPanel.currentPanel?.loadBinary(newestBinary);
        }, 1000);
      }
    }
  }
}

class ZealPreviewPanel {
  public static currentPanel: ZealPreviewPanel | undefined;
  public static readonly viewType = 'zeal8bitPreview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _config: ReturnType<typeof getZeal8bitConfig>;

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : undefined;

    if (ZealPreviewPanel.currentPanel) {
      ZealPreviewPanel.currentPanel._panel.reveal(column);
      // Update configuration in existing panel
      ZealPreviewPanel.currentPanel._config = getZeal8bitConfig();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ZealPreviewPanel.viewType,
      'Zeal 8-bit Preview',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'playground', 'js'),
          vscode.Uri.joinPath(extensionUri, 'playground', 'css'),
          vscode.Uri.joinPath(extensionUri, 'playground', 'wasm'),
        ],
      },
    );

    ZealPreviewPanel.currentPanel = new ZealPreviewPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._config = getZeal8bitConfig();

    console.log('ZealPreviewPanel created with config:', this._config);

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public loadBinary(binaryPath: string) {
    try {
      const binaryData = fs.readFileSync(binaryPath);
      const base64Data = binaryData.toString('base64');

      this._panel.webview.postMessage({
        command: 'loadBinary',
        data: base64Data,
        fileName: path.basename(binaryPath),
        config: this._config, // Include configuration in the message
      });

      vscode.window.showInformationMessage(`Loaded ${path.basename(binaryPath)} into Zeal 8-bit Preview`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load binary: ${error}`);
    }
  }

  public updateConfig() {
    this._config = getZeal8bitConfig();
    console.log('ZealPreviewPanel config updated:', this._config);

    // Send updated config to webview
    this._panel.webview.postMessage({
      command: 'updateConfig',
      config: this._config,
    });
  }

  public dispose() {
    ZealPreviewPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get URIs for all the resources
    const playgroundJs = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'playground', 'js', 'playground.js'),
    );
    const emulatorJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'playground', 'js', 'emulator.js'));
    const playgroundCss = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'playground', 'css', 'playground.css'),
    );
    const emulatorCss = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'playground', 'css', 'emulator.css'),
    );

    // WASM files
    const zealElfJs = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'playground', 'wasm', 'native', 'zeal.elf.js'),
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zeal 8-bit Preview</title>
    <link rel="stylesheet" href="${playgroundCss}">
    <link rel="stylesheet" href="${emulatorCss}">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
        }
        .loading-message {
            text-align: center;
            padding: 20px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
        }

    </style>
</head>
<body class="loading">
    <div class="loading-message">
        <h2>Zeal 8-bit Emulator Preview</h2>
        <p>Waiting for binary to load...</p>
    </div>

    <div id="viewport" style="display: none;">
        <div id="emulator">
            <div id="canvas-container">
                <canvas id="canvas" tabindex="0" width="640" height="480"></canvas>
            </div>
            <div class="controls border-t border-b margin-t hidden">
                <button class="btn toggle-fps">Toggle FPS</button>
                <button class="btn code-stop" onclick="code_stop()">
                    <span>■</span> Stop
                </button>
            </div>
            <div class="output margin-t hidden"></div>
        </div>
        <div id="assembler" class="scrollbars">
            <div class="log" id="log">Ready to load binary...</div>
            <pre id="hex-view">Hex view will appear here.</pre>
        </div>
        <div id="listing" class="scrollbars">
            <pre id="list-view">Listing will appear here.</pre>
        </div>
    </div>

    <script>
        // VS Code API - must be first script
        const vscode = acquireVsCodeApi();

        // Override the original playground.js DOMContentLoaded behavior
        let originalCode_run;

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'loadBinary':
                    loadBinaryFromBase64(message.data, message.fileName, message.config);
                    break;
                case 'updateConfig':
                    updateConfiguration(message.config);
                    break;
            }
        });

        function updateConfiguration(config) {
            console.log('Configuration updated:', config);
            // Store config globally for use in other functions
            window.zeal8bitConfig = config;

            // You can add logic here to respond to configuration changes
            // For example, update UI elements based on the 'uses' property
            if (config.uses) {
                console.log('Project uses:', config.uses);
                // Example: Update a status display or modify behavior based on the 'uses' property
            }
        }

        function loadBinaryFromBase64(base64Data, fileName, config) {
            try {
                const listing = document.querySelector('#list-view');
                listing.textContent = '';

                // Store config for use throughout the webview
                if (config) {
                    updateConfiguration(config);
                }

                // Convert base64 to Uint8Array
                const binaryString = atob(base64Data);
                const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));

                let listing_text = '';
                listing_text += "base64: " + base64Data;

                // Include configuration info in the listing
                if (config && config.uses) {
                    listing_text += "\\nProject uses: " + config.uses;
                }

                // Show the emulator and hide loading message
                document.getElementById('viewport').style.display = 'block';
                document.querySelector('.loading-message').style.display = 'none';
                document.body.classList.remove('loading');

                // Load the binary into the emulator
                if (typeof code_run === 'function') {
                    listing_text += "\\ncode_run available";
                    code_run(bytes);
                } else {
                    // If code_run isn't available yet, wait a bit and try again
                  listing_text += "\\ncode_run unavailable";
                    setTimeout(() => {
                        if (typeof code_run === 'function') {
                            listing_text += "\\ncode_run available";
                            code_run(bytes);
                        }
                    }, 100);
                }

                listing_text += "\\nuses: " + (window.zeal8bitConfig?.uses || "bare");

                console.log('Loaded binary:', fileName, bytes.length, 'bytes');

                listing.textContent = listing_text;
            } catch (error) {
                console.error('Failed to load binary:', error);
            }
        }

        // Flag to indicate we're in VS Code extension context
        window.IS_VSCODE_EXTENSION = true;
    </script>

    <script src="${playgroundJs}"></script>
    <script src="${emulatorJs}"></script>
    <script src="${zealElfJs}"></script>
</body>
</html>`;
  }
}

export function deactivate() {}
