import * as vscode from 'vscode';

type MenuItem = {
  title: string;
  command?: string;
};
export class ZealMenu {
  public static activate(context: vscode.ExtensionContext) {
    const treeViewProvider = new MenuDataProvider();
    vscode.window.createTreeView('zeal8bit-menu', {
      treeDataProvider: treeViewProvider,
    });
  }
}
export class MenuDataProvider implements vscode.TreeDataProvider<MenuItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MenuItem | undefined | void> = new vscode.EventEmitter<
    MenuItem | undefined | void
  >();
  readonly onDidChangeTreeData: vscode.Event<MenuItem | undefined | void> = this._onDidChangeTreeData.event;

  private menu: MenuItem[] = [];
  private initialized = false;

  getTreeItem(element: MenuItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);
    if (element.command) item.command = { command: element.command, title: element.title };
    return item;
  }

  constructor() {
    this.initialize();
  }

  async initialize() {
    const hasMakefile = await this.hasFile('Makefile');
    const hasCMakeLists = await this.hasFile('CMakeLists.txt');
    const hasEmulator = false;
    this.menu = [
      { title: 'Create Project', command: 'zeal8bit.project.create' },
      { title: 'Open Preview', command: 'zeal8bit.preview.open' },
      ...(hasMakefile ? [{ title: 'Run Make', command: 'zeal8bit.zde.make' }] : []),
      ...(hasCMakeLists ? [{ title: 'Run CMake', command: 'zeal8bit.zde.cmake' }] : []),
      { title: 'Compile Kernel', command: 'zeal8bit.kernel.compile' },
      { title: 'Xfer to Hardware', command: 'zeal8bit.hardware.xfer' },
      ...(hasEmulator ? [{ title: 'Run Emulator', command: 'zeal8bit.emulator.run' }] : []),
      { title: 'Reload ZDE', command: 'zeal8bit.reload' },
    ];
    this.initialized = true;
    this._onDidChangeTreeData.fire();
  }

  getChildren(element?: MenuItem): MenuItem[] {
    if (!this.initialized) {
      return [
        {
          title: 'Initializing ZDE',
        },
      ];
    }

    return this.menu;
  }

  async hasFile(pattern: string): Promise<boolean> {
    const files = await vscode.workspace.findFiles(pattern, null, 1);
    return files.length > 0;
  }
}
