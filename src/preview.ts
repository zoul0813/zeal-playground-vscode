import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getZeal8bitConfig } from './config';
import { getExtensionRootUri } from './extension';

export class ZealPreviewPanel {
  public static currentPanel: ZealPreviewPanel | undefined;
  public static readonly viewType = 'zeal8bitPreview';

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _config: ReturnType<typeof getZeal8bitConfig>;

  public static createOrShow() {
    const extensionUri = getExtensionRootUri();
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

    ZealPreviewPanel.currentPanel = new ZealPreviewPanel(panel);
  }

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;
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
    const extensionUri = getExtensionRootUri();
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
