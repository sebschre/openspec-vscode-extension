import * as vscode from 'vscode';
import * as path from 'path';
import { OpenSpecStateStore } from '../../core/store';
import { ChangeDetail } from '../../core/types';

type ChangeTreeElement = ChangeItemElement | ArtifactItemElement;

class ChangeItemElement extends vscode.TreeItem {
  constructor(public readonly change: ChangeDetail) {
    super(
      change.name,
      vscode.TreeItemCollapsibleState.Collapsed
    );

    const { total, completed, percentage } = change.taskProgress;
    this.description = total > 0 ? `${completed}/${total} (${percentage}%)` : (change.isComplete ? 'Done' : 'Draft');
    this.tooltip = `Change: ${change.name}\nSchema: ${change.schema}\nTasks: ${completed}/${total} (${percentage}%)\nClick to open in Visual Spec Viewer`;
    this.contextValue = 'change';

    if (change.isComplete) {
      this.iconPath = new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed'));
    } else if (total > 0 && completed > 0) {
      this.iconPath = new vscode.ThemeIcon('pie-chart', new vscode.ThemeColor('charts.blue'));
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-large-outline');
    }

    this.command = {
      command: 'openspec.openViewer',
      title: 'Open in Visual Spec Viewer',
      arguments: [change.name],
    };
  }
}

class ArtifactItemElement extends vscode.TreeItem {
  constructor(
    public readonly labelText: string,
    public readonly filePath: string,
    isComplete: boolean,
    details?: string
  ) {
    super(labelText, vscode.TreeItemCollapsibleState.None);
    this.description = details;
    this.iconPath = isComplete
      ? new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
      : new vscode.ThemeIcon('circle-slash');

    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(filePath)],
    };
  }
}

export class ChangesTreeProvider implements vscode.TreeDataProvider<ChangeTreeElement> {
  private _onDidChangeTreeData: vscode.EventEmitter<ChangeTreeElement | undefined | void> =
    new vscode.EventEmitter<ChangeTreeElement | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ChangeTreeElement | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private store: OpenSpecStateStore) {
    this.store.on('change', () => this.refresh());
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: ChangeTreeElement): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: ChangeTreeElement): vscode.ProviderResult<ChangeTreeElement[]> {
    if (!element) {
      const state = this.store.getState();
      if (!state.hasOpenSpecRoot) {
        const item = new vscode.TreeItem('No openspec/ folder detected');
        item.iconPath = new vscode.ThemeIcon('info');
        return [item as any];
      }

      if (state.changes.length === 0) {
        const item = new vscode.TreeItem('No active changes found');
        item.iconPath = new vscode.ThemeIcon('info');
        return [item as any];
      }

      return state.changes.map((c) => new ChangeItemElement(c));
    }

    if (element instanceof ChangeItemElement) {
      const change = element.change;
      const children: ArtifactItemElement[] = [];

      children.push(
        new ArtifactItemElement(
          'Proposal',
          path.join(change.changeDir, 'proposal.md'),
          change.artifactsPresent.proposal,
          change.proposal?.whatChanges.length ? `${change.proposal.whatChanges.length} changes` : undefined
        )
      );

      children.push(
        new ArtifactItemElement(
          'Specs (Delta)',
          path.join(change.changeDir, 'specs'),
          change.artifactsPresent.specs,
          change.specs.length ? `${change.specs.length} capabilities` : undefined
        )
      );

      children.push(
        new ArtifactItemElement(
          'Design',
          path.join(change.changeDir, 'design.md'),
          change.artifactsPresent.design,
          change.design?.decisions.length ? `${change.design.decisions.length} decisions` : undefined
        )
      );

      children.push(
        new ArtifactItemElement(
          'Tasks',
          path.join(change.changeDir, 'tasks.md'),
          change.artifactsPresent.tasks,
          `${change.taskProgress.completed}/${change.taskProgress.total} completed`
        )
      );

      return children;
    }

    return [];
  }
}
