import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Get the project-level configuration for Zeal 8-bit
 */
function getZeal8bitConfig() {
  const config = vscode.workspace.getConfiguration('zeal8bit');
  return {
    uses: config.get<string>('uses', 'zealos'),
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
        retainContextWhenHidden: true,
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
    this._panel.webview.html = this._getHtmlForWebview(webview, this._extensionUri);
  }

  private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
    // Get URIs for all the resources
    const paths: Record<string, vscode.Uri> = {
      playgroundJs: vscode.Uri.joinPath(extensionUri, 'playground', 'js', 'playground.js'),
      vscodeJs: vscode.Uri.joinPath(extensionUri, 'playground', 'js', 'vscode.js'),
      emulatorJs: vscode.Uri.joinPath(extensionUri, 'playground', 'js', 'emulator.js'),
      playgroundCss: vscode.Uri.joinPath(extensionUri, 'playground', 'css', 'playground.css'),
      emulatorCss: vscode.Uri.joinPath(extensionUri, 'playground', 'css', 'emulator.css'),
      // WASM files
      zealElfJs: vscode.Uri.joinPath(extensionUri, 'playground', 'wasm', 'native', 'zeal.elf.js'),
    };

    const htmlPath = path.join(extensionUri.fsPath, 'playground', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    const replaceAssetPath = (src: string) => {
      const replacement = paths[src];
      return webview.asWebviewUri(replacement).toString();
    };

    html = html.replace(/<script\s+src="\$\{(.+?)\}"><\/script>/g, (match, src) => {
      return `<script src="${replaceAssetPath(src)}"></script>`;
    });

    html = html.replace(/<link\s+rel="stylesheet"\s+href="\$\{(.+?)\}"\s*\/?>/g, (match, href) => {
      return `<link rel="stylesheet" href="${replaceAssetPath(href)}" />`;
    });

    return html;
  }
}

export function deactivate() {}
