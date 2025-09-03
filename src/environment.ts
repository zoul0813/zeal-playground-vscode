import * as vscode from 'vscode';
import { exec } from 'child_process';

export async function zde_setup_env(context: vscode.ExtensionContext) {
  return new Promise((resolve, reject) => {
    if (!process.env.ZDE_PATH) {
      vscode.window.showErrorMessage('ZDE_PATH is not set');
      return reject('ZDE_PATH is not set');
    }
    exec(`bash -c "source $ZDE_PATH/bin/activate && env"`, async (err, stdout) => {
      if (err) {
        vscode.window.showErrorMessage('Failed to load ZDE environment');
        reject('Failed to load ZDE environment');
      }

      const env = context.environmentVariableCollection;
      stdout.split('\n').forEach((line) => {
        const [key, ...rest] = line.split('=');
        if (key) {
          process.env[key] = rest.join('=');
          env.replace(key, rest.join('='));
        }
      });

      const cppExt = vscode.extensions.getExtension('ms-vscode.cpptools');
      if (cppExt) await cppExt.activate();

      const alreadyReloaded = context.workspaceState.get<boolean>('zde_env_reloaded', false);
      if (!alreadyReloaded) {
        await context.workspaceState.update('zde_env_reloaded', true);
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      } else {
        await context.workspaceState.update('zde_env_reloaded', false);
        vscode.window.showInformationMessage('ZDE environment loaded.');
      }

      resolve(true);
    });
  });
}
