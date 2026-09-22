import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { OpenSpecStateStore } from '../../core/store';
import { ArchiveItem } from '../../core/types';

export class ArchiveItemElement extends vscode.TreeItem {
  constructor(public readonly archive: ArchiveItem) {
    super(archive.name, vscode.TreeItemCollapsibleState.Collapsed);

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
    this.contextValue = 'archiveItem';
    // Clicking toggles expansion in the tree; no command set so the project root is never reset.
  }
}

export class ArchiveArtifactItemElement extends vscode.TreeItem {
  constructor(
    public readonly labelText: string,
    public readonly filePath: string,
    details?: string
  ) {
    super(labelText, vscode.TreeItemCollapsibleState.None);
    this.description = details;
    this.iconPath = new vscode.ThemeIcon('file-text');
    this.contextValue = 'archiveArtifact';

    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(filePath)],
    };
  }
}

export type ArchiveTreeElement = ArchiveItemElement | ArchiveArtifactItemElement | vscode.TreeItem;

export class ArchiveTreeProvider implements vscode.TreeDataProvider<ArchiveTreeElement> {
  private _onDidChangeTreeData: vscode.EventEmitter<ArchiveTreeElement | undefined | void> =
    new vscode.EventEmitter<ArchiveTreeElement | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ArchiveTreeElement | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private store: OpenSpecStateStore) {
    this.store.on('change', () => this.refresh());
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: ArchiveTreeElement): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: ArchiveTreeElement): vscode.ProviderResult<ArchiveTreeElement[]> {
    if (!element) {
      const state = this.store.getState();
      if (!state.hasOpenSpecRoot || state.archive.length === 0) {
        const item = new vscode.TreeItem('No archived changes');
        item.iconPath = new vscode.ThemeIcon('info');
        return [item];
      }

      return state.archive.map((a) => new ArchiveItemElement(a));
    }

    if (element instanceof ArchiveItemElement) {
      const archiveDir = element.archive.path;
      if (!fs.existsSync(archiveDir)) {
        const missing = new vscode.TreeItem('Archive directory not found');
        missing.iconPath = new vscode.ThemeIcon('warning');
        return [missing];
      }

      const children: ArchiveArtifactItemElement[] = [];

      // Check Proposal
      const proposalPath = path.join(archiveDir, 'proposal.md');
      if (fs.existsSync(proposalPath)) {
        children.push(new ArchiveArtifactItemElement('Proposal', proposalPath));
      }

      // Check Delta Specs
      const specsDir = path.join(archiveDir, 'specs');
      if (fs.existsSync(specsDir)) {
        const specFiles = this.findSpecFiles(specsDir);
        for (const sf of specFiles) {
          children.push(
            new ArchiveArtifactItemElement(
              specFiles.length === 1 ? 'Spec (Delta)' : `Spec (${sf.capability})`,
              sf.filePath
            )
          );
        }
      }

      // Check Design
      const designPath = path.join(archiveDir, 'design.md');
      if (fs.existsSync(designPath)) {
        children.push(new ArchiveArtifactItemElement('Design', designPath));
      }

      // Check Tasks
      const tasksPath = path.join(archiveDir, 'tasks.md');
      if (fs.existsSync(tasksPath)) {
        children.push(new ArchiveArtifactItemElement('Tasks', tasksPath));
      }

      if (children.length === 0) {
        const emptyItem = new vscode.TreeItem('No artifacts found');
        emptyItem.iconPath = new vscode.ThemeIcon('info');
        return [emptyItem];
      }

      return children;
    }

    return [];
  }

  private findSpecFiles(specsDir: string): { capability: string; filePath: string }[] {
    const results: { capability: string; filePath: string }[] = [];

    const walk = (dir: string, relativeCap: string = '') => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath, relativeCap ? `${relativeCap}/${entry.name}` : entry.name);
          } else if (entry.name === 'spec.md' || entry.name.endsWith('.md')) {
            const cap = relativeCap || entry.name.replace(/\.md$/, '');
            results.push({ capability: cap, filePath: fullPath });
          }
        }
      } catch {
        // ignore unreadable dirs
      }
    };

    walk(specsDir);
    return results;
  }
}
