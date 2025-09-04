import * as vscode from 'vscode';
import * as path from 'path';
import { ZealPreviewPanel } from './preview';
import { ZealMenu } from './panels/menu';
import { zde_setup_env } from './environment';
import { ZealConfig } from './config';
import { ZDE } from './zde';
import { ZealBuild } from './build';
import { ZealKernel } from './kernel';

const EXTENSION_ID = 'zeal8bit.zeal8bit';

export function getExtensionRootUri(): vscode.Uri {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  if (extension) {
    // Installed extension
    return extension.extensionUri;
  }

  // Development/debug mode
  // __dirname might be .../my-extension/out
  // Go up one level to get the root of the extension
  return vscode.Uri.file(path.join(__dirname, '..'));
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Zeal 8-bit Preview extension is now active!');

  // Log current configuration
  const config = ZealConfig.get();
  console.log('Zeal 8-bit configuration:', config);

  zde_setup_env(context);

  ZealConfig.activate(context);
  ZealPreviewPanel.activate(context);
  ZealBuild.activate(context);
  ZDE.activate(context);
  ZealKernel.activate(context);
  ZealMenu.activate(context);

  const cmdReload = vscode.commands.registerCommand('zeal8bit.reload', async () => {
    zde_setup_env(context);
  });

  context.subscriptions.push(cmdReload);
}

export function deactivate() {}
