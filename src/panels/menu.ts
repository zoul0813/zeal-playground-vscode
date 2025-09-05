import * as vscode from 'vscode';

export class ZealMenu {
  public static activate(context: vscode.ExtensionContext) {
    const treeViewProvider = new MenuDataProvider();
    vscode.window.createTreeView('zeal8bit-menu', {
      treeDataProvider: treeViewProvider,
    });
  }
}
export class MenuDataProvider implements vscode.TreeDataProvider<vscode.Command> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.Command | undefined | void> = new vscode.EventEmitter<
    vscode.Command | undefined | void
  >();
  readonly onDidChangeTreeData: vscode.Event<vscode.Command | undefined | void> = this._onDidChangeTreeData.event;

  getTreeItem(command: vscode.Command): vscode.TreeItem {
    const item = new vscode.TreeItem(command.title, vscode.TreeItemCollapsibleState.None);
    item.command = command;
    return item;
  }

  getChildren(element?: vscode.Command): vscode.ProviderResult<vscode.Command[]> {
    if (!element) {
      return Promise.resolve([
        {
          command: 'zeal8bit.project.create',
          title: 'Create Project',
        },
        {
          command: 'zeal8bit.preview.open',
          title: 'Open Preview',
        },
        {
          command: 'zeal8bit.zde.make',
          title: 'Run Make',
        },
        {
          command: 'zeal8bit.zde.cmake',
          title: 'Run CMake',
        },
        {
          command: 'zeal8bit.kernel.compile',
          title: 'Compile Kernel',
        },
        {
          command: 'zeal8bit.hardware.xfer',
          title: 'Xfer to Hardware',
        },
        {
          command: 'zeal8bit.emulator.run',
          title: 'Run Emulator',
        },
        {
          command: 'zeal8bit.reload',
          title: 'Reload ZDE',
        },
      ]);
    }
    return Promise.resolve([]);
  }
}
