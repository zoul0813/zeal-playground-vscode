import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

export async function zde_build(type = 'cmake'): Promise<number> {
  console.log('Running `zde cmake` in project root');

  const outputChannel = vscode.window.createOutputChannel('zeal8bit.zde_cmake');
  outputChannel.clear();
  outputChannel.show(true);

  const cmd = 'zde';
  const args = ['cmake'];
  const cwd = vscode.workspace.rootPath || process.cwd();

  outputChannel.appendLine(`Running build: ${cmd} ${args.join(' ')}\n`);

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: true });

    child.stdout.on('data', (data) => {
      outputChannel.append(data.toString());
    });

    child.stderr.on('data', (data) => {
      outputChannel.append(data.toString());
    });

    child.on('close', (code) => {
      outputChannel.appendLine(`\nBuild finished with exit code ${code}`);

      if (code === 0) {
        vscode.window.showInformationMessage('✅ Build succeeded!');
        resolve(code ?? 0);
      } else {
        vscode.window.showErrorMessage(`❌ Build failed (exit code ${code})`);
        reject(new Error(`Build failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      outputChannel.appendLine(`\nBuild process error: ${err.message}`);
      reject(err);
    });
  });
}
