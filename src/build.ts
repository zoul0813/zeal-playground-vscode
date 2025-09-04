import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ZealPreviewPanel } from './preview';

export class ZealBuild {
  public static activate(context: vscode.ExtensionContext) {
    // Listen for task completion
    const disposable = vscode.tasks.onDidEndTask((e: vscode.TaskEndEvent) => {
      // Check if this is a build task
      const taskGroup = e.execution.task.group;
      const isBuildTask =
        taskGroup === vscode.TaskGroup.Build ||
        (taskGroup as any) === 'build' ||
        (taskGroup && typeof taskGroup === 'object' && (taskGroup as any).c === 'build');

      if (isBuildTask) {
        ZealBuild.buildTaskComplete(e.execution.task);
      }

      context.subscriptions.push(disposable);
    });
  }
  public static async buildTaskComplete(task: vscode.Task) {
    // Look for binary output files in common locations
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const commonBinaryPaths = [
      'build',
      'dist',
      'out',
      'target',
      'bin',
      '.', // current directory
    ];

    const foundBinaries: string[] = [];

    for (const dir of commonBinaryPaths) {
      const dirPath = path.join(workspaceFolder.uri.fsPath, dir);
      if (fs.existsSync(dirPath)) {
        try {
          const stats = fs.statSync(dirPath);
          if (stats.isDirectory()) {
            const files = fs.readdirSync(dirPath);
            const binaryFiles = files.filter((file: string) => file.endsWith('.bin'));
            for (const binaryFile of binaryFiles) {
              foundBinaries.push(path.join(dirPath, binaryFile));
            }
          } else if (dirPath.endsWith('.bin') && stats.isFile()) {
            foundBinaries.push(dirPath);
          }
        } catch (error) {
          // Ignore errors for directories that don't exist or aren't accessible
        }
      }
    }

    if (foundBinaries.length > 0) {
      // Sort by modification time, newest first
      foundBinaries.sort((a, b) => {
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

      const newestBinary = foundBinaries[0];
      const binaryName = path.basename(newestBinary);

      // Auto-load the binary if preview panel is open
      if (ZealPreviewPanel.currentPanel) {
        ZealPreviewPanel.currentPanel.loadBinary(newestBinary);
      } else {
        // Ask user if they want to open preview with the binary
        const action = await vscode.window.showInformationMessage(
          `Build completed. Found binary: ${binaryName}`,
          'Open in Zeal 8-bit Preview',
          'Dismiss',
        );
        if (action === 'Open in Zeal 8-bit Preview') {
          ZealPreviewPanel.createOrShow();
          setTimeout(() => {
            ZealPreviewPanel.currentPanel?.loadBinary(newestBinary);
          }, 500);
        }
      }
    }
  }
}
