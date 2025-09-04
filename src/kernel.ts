import * as vscode from 'vscode';
import { spawn } from 'child_process';
import stripAnsi from 'strip-ansi';

export class ZealKernel {
  public static activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('zeal8bit.kernel.compile', async () => {
      await ZealKernel.build();
    });
    context.subscriptions.push(disposable);
  }

  public static async build(...options: string[]): Promise<number> {
    console.log('Running `zde kernel`');

    const outputChannel = vscode.window.createOutputChannel('zeal8bit.kernel.compile');
    outputChannel.clear();
    outputChannel.show(true);

    const cmd = 'zde';
    const args = ['kernel', ...options];
    const cwd = vscode.workspace.rootPath || process.cwd();

    outputChannel.appendLine(`Running build: ${cmd} ${args.join(' ')}\n`);

    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { cwd, shell: true });

      child.stdout.on('data', (data) => {
        outputChannel.append(stripAnsi(data.toString()));
      });

      child.stderr.on('data', (data) => {
        outputChannel.append(stripAnsi(data.toString()));
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
}
