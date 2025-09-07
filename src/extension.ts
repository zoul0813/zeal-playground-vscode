import * as vscode from 'vscode';
import * as path from 'path';
import { ZealPreviewPanel } from './preview';
import { ZealMenu } from './panels/menu';
import { EXTENSION_INITIALIZED, zde_setup_env } from './environment';
import { ZealConfig } from './config';
import { ZDE } from './zde';
import { ZealBuild } from './build';
import { ZealKernel } from './kernel';
import { ZealProject } from './panels/project';

let extensionContext: vscode.ExtensionContext;
export function activate(context: vscode.ExtensionContext) {
  extensionContext = context;
  console.log('Zeal 8-bit Preview extension is now active!');

  // Log current configuration
  const config = ZealConfig.get();
  console.log('Zeal 8-bit configuration:', config);

  const initialized = extensionContext.globalState.get<boolean>('zde_env_initialized', false);
  if (!initialized) {
    zde_setup_env(extensionContext).then(async () => {
      await context.globalState.update('zde_env_initialized', true);
      vscode.commands.executeCommand('workbench.action.reloadWindow');
    });
    return;
  } else {
    vscode.window.showInformationMessage('ZDE environment loaded.');
  }

  ZealConfig.activate(extensionContext);
  ZealPreviewPanel.activate(extensionContext);
  ZealBuild.activate(extensionContext);
  ZDE.activate(extensionContext);
  ZealKernel.activate(extensionContext);
  ZealMenu.activate(extensionContext);
  ZealProject.activate(extensionContext);

  const cmdReload = vscode.commands.registerCommand('zeal8bit.reload', async () => {
    zde_setup_env(extensionContext);
  });

  extensionContext.subscriptions.push(cmdReload);
}

export function deactivate() {
  if (!extensionContext) return; /// something went wrong here, lol
  extensionContext.globalState.update('zde_env_initialized', undefined);
}
