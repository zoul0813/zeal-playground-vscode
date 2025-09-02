import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { zde_build } from './zde_build';
import { getZeal8bitConfig } from './config';
import { ZealPreviewPanel } from './preview';

const EXTENSION_ID = 'zeal8bit.zeal-8bit-preview';

export function activate(context: vscode.ExtensionContext) {
  console.log('Zeal 8-bit Preview extension is now active!');

  // Log current configuration
  const config = getZeal8bitConfig();
  console.log('Zeal 8-bit configuration:', config);

  // Listen for configuration changes
  const configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('zeal8bit')) {
      const newConfig = getZeal8bitConfig();
      console.log('Zeal 8-bit configuration changed:', newConfig);

      // Update the current panel's configuration if it exists
      if (ZealPreviewPanel.currentPanel) {
        ZealPreviewPanel.currentPanel.updateConfig();
      }
    }
  });

  // Register command to open preview
  const openPreviewCommand = vscode.commands.registerCommand('zeal8bit.openPreview', () => {
    ZealPreviewPanel.createOrShow(context.extensionUri);
  });

  // Register command to load binary
  const loadBinaryCommand = vscode.commands.registerCommand('zeal8bit.loadBinary', (uri: vscode.Uri) => {
    if (uri && uri.fsPath.endsWith('.bin')) {
      ZealPreviewPanel.createOrShow(context.extensionUri);
      ZealPreviewPanel.currentPanel?.loadBinary(uri.fsPath);
    }
  });

  const cmakeCommand = vscode.commands.registerCommand('zeal8bit.zde_cmake', async () => {
    await zde_build('cmake');
    await handleBuildTaskComplete({} as vscode.Task);
  });

  const makeCommand = vscode.commands.registerCommand('zeal8bit.zde_make', async () => {
    await zde_build('make');
    await handleBuildTaskComplete({} as vscode.Task);
  });

  // Listen for task completion
  const taskEndListener = vscode.tasks.onDidEndTask((e: vscode.TaskEndEvent) => {
    // Check if this is a build task
    const taskGroup = e.execution.task.group;
    const isBuildTask =
      taskGroup === vscode.TaskGroup.Build ||
      (taskGroup as any) === 'build' ||
      (taskGroup && typeof taskGroup === 'object' && (taskGroup as any).c === 'build');

    if (isBuildTask) {
      handleBuildTaskComplete(e.execution.task);
    }
  });

  context.subscriptions.push(
    openPreviewCommand,
    loadBinaryCommand,
    cmakeCommand,
    taskEndListener,
    configChangeListener,
  );
}

async function handleBuildTaskComplete(task: vscode.Task) {
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
        const extensionUri =
          vscode.extensions.getExtension(EXTENSION_ID)?.extensionUri || vscode.Uri.file(path.dirname(__filename));
        ZealPreviewPanel.createOrShow(extensionUri);
        setTimeout(() => {
          ZealPreviewPanel.currentPanel?.loadBinary(newestBinary);
        }, 1000);
      }
    }
  }
}

export function deactivate() {}
