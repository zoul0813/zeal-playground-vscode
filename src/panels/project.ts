import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ZealConfig, ZealConfiguration } from '../config';
import { getExtensionRootUri, getProjectRoot, openProjectFolder } from '../paths';
import { ZDE } from '../zde';

export class ZealProject {
  public static currentPanel: ZealProject | undefined;
  public static readonly viewType = 'zeal8bitPreview';
  public static templates: string[] = [];

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _config: ZealConfiguration;

  public static activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('zeal8bit.project.create', async () => {
      await ZealProject.createOrShow();
    });
    context.subscriptions.push(disposable);
  }

  public static createOrShow() {
    const extensionUri = getExtensionRootUri();
    // const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : undefined;
    const column = undefined;

    if (ZealProject.currentPanel) {
      ZealProject.currentPanel._panel.reveal(column);
      // Update configuration in existing panel
      ZealProject.currentPanel._config = ZealConfig.get();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ZealProject.viewType,
      'Zeal 8-bit - Create Project',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    ZealProject.currentPanel = new ZealProject(panel);
  }

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;
    this._config = ZealConfig.get();

    console.log('ZealProject created with config:', this._config);

    this._panel.webview.onDidReceiveMessage(this.onDidReceiveMessage.bind(this), undefined, this._disposables);

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public updateConfig() {
    this._config = ZealConfig.get();
    console.log('ZealProject config updated:', this._config);

    // Send updated config to webview
    this._panel.webview.postMessage({
      command: 'updateConfig',
      config: this._config,
    });
  }

  public async onDidReceiveMessage(message: any) {
    switch (message.command) {
      case 'create':
        const { name, template, type, destination } = message;
        vscode.window.showInformationMessage(
          `Creating ${type} project '${name}' at ${destination} using ${template} template`,
        );
        // TODO: actually create the project

        await ZDE.exec('create', { cwd: destination }, template, `name=${name}`);
        await openProjectFolder(path.join(destination, name));

        this.dispose();
        break;
      case 'cancel':
        this.dispose();
        break;
    }
  }

  public dispose() {
    ZealProject.currentPanel = undefined;

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

    ZDE.exec('create', { suppress: true }, '-t')
      .then((result) => {
        const output = result.output;
        console.log('output', output);
        ZealProject.templates = [];
        output.split(`\n`).forEach((line) => {
          console.log('line', line);
          if (line.startsWith('template: ')) {
            const [_, template] = line.split('template: ');
            ZealProject.templates.push(template);
          }
        });
      })
      .then(() => {
        this._panel.webview.html = this._getHtmlForWebview(webview);
      });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get URIs for all the resources
    const extensionUri = getExtensionRootUri();
    const paths: Record<string, vscode.Uri | string> = {
      projectJs: vscode.Uri.joinPath(extensionUri, 'project', 'project.js'),
      projectCss: vscode.Uri.joinPath(extensionUri, 'project', 'project.css'),
      projectRoot: getProjectRoot(),
      templates: JSON.stringify(ZealProject.templates),
    };

    const htmlPath = path.join(extensionUri.fsPath, 'project', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    const replaceAssetPath = (src: string) => {
      const replacement = paths[src];
      if (typeof replacement === 'string') {
        return replacement;
      }
      return webview.asWebviewUri(replacement).toString();
    };

    html = html.replace(/<script\s+src="\$\{(.+?)\}"><\/script>/g, (match, src) => {
      return `<script src="${replaceAssetPath(src)}"></script>`;
    });

    html = html.replace(/<link\s+rel="stylesheet"\s+href="\$\{(.+?)\}"\s*\/?>/g, (match, href) => {
      return `<link rel="stylesheet" href="${replaceAssetPath(href)}" />`;
    });

    html = html.replace(/(window\.\w+\s*=\s*'?)\$\{(.+?)\}('?;)/g, (match, before, src, after) => {
      return `${before}${replaceAssetPath(src)}${after}`;
    });

    return html;
  }
}
