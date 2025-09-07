import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export const EXTENSION_ID = 'zoul0813.zeal8bit';

export function getExtensionRootUri(): vscode.Uri {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  if (extension) {
    // Installed extension
    return extension.extensionUri;
  }

  // Development/debug mode
  // __dirname might be .../my-extension/out
  // Go up one level to get the root of the extension
  return vscode.Uri.file(path.join(__dirname, '..'));
}

export function getProjectRoot(): string {
  const config = vscode.workspace.getConfiguration('zeal8bit');
  let projectRoot = config.get<string>('projectRoot');
  if (projectRoot && projectRoot.trim().length > 0) {
    return projectRoot;
  }

  const homeDir = os.homedir();
  projectRoot = homeDir;

  switch (process.platform) {
    case 'win32':
      // On Windows: C:\Users\<User>\Documents
      projectRoot = path.join(homeDir, 'Documents');

    case 'darwin':
      // On macOS: /Users/<User>/Documents
      projectRoot = path.join(homeDir, 'Documents');
  }

  return path.join(projectRoot, 'zeal8bit');
}

export function ensurePath(path: string) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
}

export async function openProjectFolder(path: string) {
  const uri = vscode.Uri.file(path);
  const openInNewWindow = false;
  const success = await vscode.commands.executeCommand('vscode.openFolder', uri, openInNewWindow);

  if (!success) {
    vscode.window.showErrorMessage(`Failed to open project folder: ${path}`);
  }
}
