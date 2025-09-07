import * as vscode from 'vscode';
import { spawn } from 'child_process';
import stripAnsi from 'strip-ansi';
import { ZDE } from './zde';

export class ZealKernel {
  public static activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('zeal8bit.kernel.compile', async () => {
      await ZealKernel.build();
    });
    context.subscriptions.push(disposable);
  }

  public static async build(...options: string[]): Promise<number> {
    console.log('Running `zde kernel`');

    return ZDE.exec('kernel', {}, ...options).then((result) => {
      return result.code ?? 0;
    });
  }
}
