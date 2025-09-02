import * as vscode from 'vscode';

/**
 * Get the project-level configuration for Zeal 8-bit
 */
export function getZeal8bitConfig() {
  const config = vscode.workspace.getConfiguration('zeal8bit');
  return {
    uses: config.get<string>('uses', 'zealos'),
  };
}
