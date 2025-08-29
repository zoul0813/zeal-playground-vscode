import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  console.log('Zeal 8-bit Preview extension is now active!');

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
    if (e.execution.task.group === vscode.TaskGroup.Build) {
      handleBuildTaskComplete(e.execution.task);
    }
  });

  context.subscriptions.push(openPreviewCommand, loadBinaryCommand, taskEndListener);
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

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : undefined;

    if (ZealPreviewPanel.currentPanel) {
      ZealPreviewPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ZealPreviewPanel.viewType,
      'Zeal 8-bit Preview',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'js'),
          vscode.Uri.joinPath(extensionUri, 'css'),
          vscode.Uri.joinPath(extensionUri, 'wasm'),
        ],
      },
    );

    ZealPreviewPanel.currentPanel = new ZealPreviewPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

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
      });

      vscode.window.showInformationMessage(`Loaded ${path.basename(binaryPath)} into Zeal 8-bit Preview`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load binary: ${error}`);
    }
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
    const playgroundJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'js', 'playground.js'));
    const emulatorJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'js', 'emulator.js'));
    const assemblerJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'js', 'assembler.js'));

    const playgroundCss = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'css', 'playground.css'));
    const emulatorCss = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'css', 'emulator.css'));

    // WASM files
    const zealElfJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'wasm', 'native', 'zeal.elf.js'));
    const asJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'wasm', 'gnu-as', 'as.js'));
    const ldJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'wasm', 'gnu-as', 'ld.js'));
    const objcopyJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'wasm', 'gnu-as', 'objcopy.js'));
    const toolchainJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'wasm', 'gnu-as', 'toolchain.js'));

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
            background: #1e1e1e;
            color: #cccccc;
        }
        .loading-message {
            text-align: center;
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
    </style>
</head>
<body class="loading">
    <div class="loading-message">
        <h2>Zeal 8-bit Emulator Preview</h2>
        <p>Waiting for binary to load...</p>
    </div>

    <div id="viewport" style="display: none;">
        <div id="emulator" class="padding scrollbars">
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
                    loadBinaryFromBase64(message.data, message.fileName);
                    break;
            }
        });

        function loadBinaryFromBase64(base64Data, fileName) {
            try {
                const listing = document.querySelector('#list-view');
                listing.textContent = '';

                // Convert base64 to Uint8Array
                const binaryString = atob(base64Data);
                const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
                
                let listing_text = '';
                listing_text += "base64: " + base64Data;

                // Update editor filename
                if (typeof editor !== 'undefined') {
                    editor.fileName = fileName;
                }
                
                // Show the emulator and hide loading message
                document.getElementById('viewport').style.display = 'block';
                document.querySelector('.loading-message').style.display = 'none';
                document.body.classList.remove('loading');
                
                listing_text += "\\nfilename: " + editor.fileName;


                
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
    <script src="${assemblerJs}"></script>
    <script src="${zealElfJs}"></script>
    <script src="${asJs}"></script>
    <script src="${ldJs}"></script>
    <script src="${objcopyJs}"></script>
    <script src="${toolchainJs}"></script>
</body>
</html>`;
  }
}

export function deactivate() {}
