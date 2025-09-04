import * as vscode from 'vscode';
import { ZealPreviewPanel } from './preview';

/**
 * Get the project-level configuration for Zeal 8-bit
 */
export function getZeal8bitConfig() {}

export type ZealUses = 'zealos' | 'bare' | undefined | null;

export type ZealConfiguration = {
  uses?: ZealUses;
};
export class ZealConfig {
  public static activate(context: vscode.ExtensionContext) {
    // Listen for configuration changes
    const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('zeal8bit')) {
        const newConfig = ZealConfig.get();
        console.log('Zeal 8-bit configuration changed:', newConfig);

        // Update the current panel's configuration if it exists
        if (ZealPreviewPanel.currentPanel) {
          ZealPreviewPanel.currentPanel.updateConfig();
        }
      }
    });
    context.subscriptions.push(disposable);
  }

  public static get(): ZealConfiguration {
    const config = vscode.workspace.getConfiguration('zeal8bit');
    return {
      uses: config.get<ZealUses>('uses', 'zealos'),
    };
  }
}
