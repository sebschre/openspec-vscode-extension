import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../../core/store';
import { ArchiveItem } from '../../core/types';

class ArchiveItemElement extends vscode.TreeItem {
  constructor(public readonly archive: ArchiveItem) {
    super(archive.name, vscode.TreeItemCollapsibleState.None);

    if (archive.timestamp) {
      try {
        const date = new Date(archive.timestamp);
        this.description = date.toLocaleDateString();
      } catch {
        this.description = archive.timestamp;
      }
    }

    this.tooltip = `Archived Change: ${archive.name}\nPath: ${archive.path}`;
    this.iconPath = new vscode.ThemeIcon('archive');
    this.contextValue = 'archive';

    this.command = {
      command: 'vscode.openFolder',
      title: 'Open in Explorer',
      arguments: [vscode.Uri.file(archive.path)],
    };
  }
}

export class ArchiveTreeProvider implements vscode.TreeDataProvider<ArchiveItemElement> {
  private _onDidChangeTreeData: vscode.EventEmitter<ArchiveItemElement | undefined | void> =
    new vscode.EventEmitter<ArchiveItemElement | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ArchiveItemElement | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private store: OpenSpecStateStore) {
    this.store.on('change', () => this.refresh());
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: ArchiveItemElement): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: ArchiveItemElement): vscode.ProviderResult<ArchiveItemElement[]> {
    if (!element) {
      const state = this.store.getState();
      if (!state.hasOpenSpecRoot || state.archive.length === 0) {
        const item = new vscode.TreeItem('No archived changes');
        item.iconPath = new vscode.ThemeIcon('info');
        return [item as any];
      }

      return state.archive.map((a) => new ArchiveItemElement(a));
    }

    return [];
  }
}
