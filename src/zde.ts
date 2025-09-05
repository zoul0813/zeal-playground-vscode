import * as vscode from 'vscode';
import { spawn } from 'child_process';
import stripAnsi from 'strip-ansi';
import { ZealBuild } from './build';
import { ensurePath } from './paths';

export type ZDEBuildType = 'cmake' | 'make';

export class ZDE {
  public static activate(context: vscode.ExtensionContext) {
    const cmdZDECMake = vscode.commands.registerCommand('zeal8bit.zde.cmake', async () => {
      await ZDE.build('cmake');
      await ZealBuild.buildTaskComplete({} as vscode.Task);
    });

    const cmdZDEMake = vscode.commands.registerCommand('zeal8bit.zde.make', async () => {
      await ZDE.build('make');
      await ZealBuild.buildTaskComplete({} as vscode.Task);
    });

    context.subscriptions.push(cmdZDECMake, cmdZDEMake);
  }

  public static async exec(command: string, cwd: string, ...options: string[]): Promise<number> {
    const outputChannel = vscode.window.createOutputChannel('zeal8bit.zde_cmake');
    outputChannel.clear();
    outputChannel.show(true);

    const cmd = 'zde';
    const args = [command, ...options];
    outputChannel.appendLine(`ZDE: ${cmd} ${args.join(' ')}\n`);

    return new Promise((resolve, reject) => {
      ensurePath(cwd);
      const child = spawn(cmd, args, { cwd, shell: true });

      child.stdout.on('data', (data) => {
        outputChannel.append(stripAnsi(data.toString()));
      });

      child.stderr.on('data', (data) => {
        outputChannel.append(stripAnsi(data.toString()));
      });

      child.on('close', (code) => {
        outputChannel.appendLine(`\Command exitted with code ${code}`);

        if (code === 0) {
          vscode.window.showInformationMessage('✅ Success!');
          resolve(code ?? 0);
        } else {
          vscode.window.showErrorMessage(`❌ Failed (exit code ${code})`);
          reject(new Error(`Failed with exit code ${code}`));
        }
      });

      child.on('error', (err) => {
        outputChannel.appendLine(`\nProcess error: ${err.message}`);
        reject(err);
      });
    });
  }

  public static async build(type: ZDEBuildType = 'cmake', ...options: string[]): Promise<number> {
    return ZDE.exec(type, vscode.workspace.rootPath || process.cwd(), ...options);
  }
}
