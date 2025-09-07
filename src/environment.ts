import * as vscode from 'vscode';
import { exec } from 'child_process';
import { EXTENSION_ID } from './paths';

export const EXTENSION_INITIALIZED = `${EXTENSION_ID}_INITIALIZED`.replace('.', '_');

export async function zde_setup_env(context: vscode.ExtensionContext) {
  return new Promise((resolve, reject) => {
    if (!process.env.ZDE_PATH) {
      vscode.window.showErrorMessage('ZDE_PATH is not set');
      return reject('ZDE_PATH is not set');
    }
    exec(`bash -c "$ZDE_PATH/bin/activate"`, async (err, stdout) => {
      if (err) {
        vscode.window.showErrorMessage('Failed to load ZDE environment');
        reject('Failed to load ZDE environment');
      }

      const env = context.environmentVariableCollection;

      stdout.split('\n').forEach((line) => {
        // split into key=value
        const [, assignment = ''] = line.split('export ');
        let [key, value = ''] = assignment.split('=');
        if (!value.trim()) return;

        // remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // expand variables like $ZDE_HOME, $PATH, etc.
        value = value.replace(/\$([A-Za-z_]\w*)/g, (_, varName) => {
          return process.env[varName] ?? '';
        });

        process.env[key] = value;
        env.replace(key, value);
      });

      const cppExt = vscode.extensions.getExtension('ms-vscode.cpptools');
      if (cppExt) await cppExt.activate();

      resolve(true);
    });
  });
}
