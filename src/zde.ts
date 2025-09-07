import * as vscode from 'vscode';
import { spawn } from 'child_process';
import stripAnsi from 'strip-ansi';
import { ZealBuild } from './build';
import { ensurePath } from './paths';

export type ZDEBuildType = 'cmake' | 'make';
export type ZDEExecArgs = {
  cwd?: string;
  suppress?: boolean;
};

export type ZDEExecResult = {
  code: number;
  output: string;
};

export class Output {
  private outputChannel: vscode.OutputChannel | undefined = undefined;
  private _code: number = 0;
  private _output: string = '';

  public constructor(output: boolean = true) {
    if (output) {
      this.outputChannel = vscode.window.createOutputChannel('zeal8bit.zde_cmake');
      this.outputChannel.clear();
      this.outputChannel.show(true);
    }
  }

  get result(): ZDEExecResult {
    return {
      code: this._code,
      output: this._output,
    };
  }

  set code(value: number) {
    this._code = value;
  }

  public clear() {
    this._output = '';
    if (this.outputChannel) this.outputChannel.clear();
  }
  public show(show: boolean) {
    if (this.outputChannel) this.outputChannel.show(show);
  }
  public append(msg: string) {
    if (this.outputChannel) this.outputChannel.append(msg);
    this._output += msg;
  }
  public appendLine(msg: string) {
    if (this.outputChannel) this.outputChannel.appendLine(msg);
    this._output += `${msg}\n`;
  }
}

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

  public static async exec(command: string, args: ZDEExecArgs = {}, ...options: string[]): Promise<ZDEExecResult> {
    const cmd = 'zde';
    const cmdArgs = [command, ...options];
    const outputChannel = new Output(!args.suppress);

    const cwd = args.cwd ?? (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd());

    // const outputChannel = vscode.window.createOutputChannel('zeal8bit.zde_cmake');
    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`ZDE: ${cmd} ${cmdArgs.join(' ')}\n`);

    return new Promise((resolve, reject) => {
      ensurePath(cwd);
      const child = spawn(cmd, cmdArgs, { cwd, shell: true });

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
          outputChannel.code = code;
          resolve(outputChannel.result);
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

  public static async build(type: ZDEBuildType = 'cmake', ...options: string[]): Promise<ZDEExecResult> {
    return ZDE.exec(type, {}, ...options);
  }
}
