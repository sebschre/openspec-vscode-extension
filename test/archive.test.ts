import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../src/core/store';
import {
  ArchiveTreeProvider,
  ArchiveItemElement,
  ArchiveArtifactItemElement,
} from '../src/views/tree/archiveTreeProvider';

describe('ArchiveTreeProvider & Elements', () => {
  const workspaceRoot = path.resolve(__dirname, '..');

  it('ArchiveItemElement should be collapsed and have no openFolder command', () => {
    const item = new ArchiveItemElement({
      name: '2026-09-21-visual-workspace-extension',
      path: path.join(workspaceRoot, 'openspec', 'changes', 'archive', '2026-09-21-visual-workspace-extension'),
      timestamp: new Date().toISOString(),
    });

    assert.strictEqual(
      item.collapsibleState,
      vscode.TreeItemCollapsibleState.Collapsed,
      'Archived change should be collapsed, not leaf'
    );
    assert.strictEqual(
      item.command,
      undefined,
      'Archived change should NOT have vscode.openFolder or any command attached'
    );
    assert.strictEqual(item.contextValue, 'archiveItem');
  });

  it('ArchiveArtifactItemElement should have vscode.open command with file URI', () => {
    const filePath = path.join(workspaceRoot, 'openspec', 'changes', 'archive', '2026-09-21-visual-workspace-extension', 'proposal.md');
    const artifact = new ArchiveArtifactItemElement('Proposal', filePath);

    assert.strictEqual(artifact.collapsibleState, vscode.TreeItemCollapsibleState.None);
    assert.strictEqual(artifact.command?.command, 'vscode.open');
    assert.strictEqual(artifact.command?.arguments?.[0]?.fsPath, filePath);
  });

  it('ArchiveTreeProvider should return ArchiveItemElements at root and child artifacts when expanded', async () => {
    const store = new OpenSpecStateStore(workspaceRoot);
    await store.refresh();

    const provider = new ArchiveTreeProvider(store);
    const rootChildren = (await provider.getChildren()) as any[];
    assert.ok(rootChildren.length >= 1, 'Should have at least 1 archived item at root');

    const archiveItem = rootChildren.find(
      (c) => c instanceof ArchiveItemElement && c.archive.name === '2026-09-21-visual-workspace-extension'
    ) as ArchiveItemElement;
    assert.ok(archiveItem, 'Should find 2026-09-21-visual-workspace-extension archive element');

    const childArtifacts = (await provider.getChildren(archiveItem)) as any[];
    assert.ok(childArtifacts.length >= 1, 'Should find child artifacts for archived change');

    const labels = childArtifacts.map((c) => c.label || c.labelText);
    assert.ok(labels.includes('Proposal'), 'Should list Proposal artifact');
    assert.ok(labels.includes('Design'), 'Should list Design artifact');
    assert.ok(labels.includes('Tasks'), 'Should list Tasks artifact');

    // Verify all child artifacts have vscode.open command
    for (const child of childArtifacts) {
      if (child instanceof ArchiveArtifactItemElement) {
        assert.strictEqual(child.command?.command, 'vscode.open');
        assert.ok(child.command?.arguments?.[0]?.fsPath?.endsWith('.md'));
      }
    }
  });
});
