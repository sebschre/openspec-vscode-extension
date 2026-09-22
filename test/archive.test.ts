import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../src/core/store';
import {
  ArchiveTreeProvider,
  ArchiveItemElement,
  ArchiveArtifactItemElement,
  ArchiveSpecItemElement,
} from '../src/views/tree/archiveTreeProvider';
import { SpecViewerPanel } from '../src/views/webview/specViewerPanel';
import { registerCommands } from '../src/commands/index';
import { OpenSpecCliBridge } from '../src/core/cli';
import { SpecDetail } from '../src/core/types';

describe('ArchiveTreeProvider & Elements', () => {
  const workspaceRoot = path.resolve(__dirname, '..');

  const mockArchivedSpec: SpecDetail = {
    capability: 'sample-archived-capability',
    purpose: 'Provide archived capability documentation and history',
    filePath: path.join(workspaceRoot, 'openspec', 'changes', 'archive', '2026-09-21-visual-workspace-extension', 'specs', 'sample-archived-capability', 'spec.md'),
    isArchived: true,
    archiveName: '2026-09-21-visual-workspace-extension',
    requirements: [
      {
        operation: 'STANDARD',
        title: 'Requirement 1: Historical Requirement',
        description: 'The system MUST preserve historical specs with visual distinction.',
        scenarios: [
          {
            name: 'Scenario: User inspects archived spec',
            when: 'viewed in the archive tree',
            then: 'it is highlighted with purple book icon and openViewer command',
            rawText: 'WHEN viewed THEN highlighted',
          },
        ],
      },
    ],
  };

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

  it('ArchiveSpecItemElement should have visual highlighting, rich tooltip, and openspec.openViewer command', () => {
    const item = new ArchiveSpecItemElement(mockArchivedSpec, 'Spec (sample-archived-capability)', '2026-09-21-visual-workspace-extension');

    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
    assert.strictEqual(item.label, 'Spec (sample-archived-capability)');
    const tooltipStr = String(item.tooltip || '');
    assert.ok(tooltipStr.includes('[Archived Spec]'), 'Tooltip should indicate archived spec');
    assert.ok(tooltipStr.includes('Capability: sample-archived-capability'), 'Tooltip should show capability');
    assert.ok(tooltipStr.includes('Purpose: Provide archived capability documentation'), 'Tooltip should show purpose');
    assert.ok(tooltipStr.includes('1 requirement'), 'Tooltip should show requirement count');
    assert.ok(tooltipStr.includes('Archived Change: 2026-09-21-visual-workspace-extension'), 'Tooltip should show archived change');

    // Visual highlighting: book icon with purple theme color
    const icon = item.iconPath as vscode.ThemeIcon;
    assert.strictEqual(icon?.id, 'book');
    assert.strictEqual((icon?.color as vscode.ThemeColor)?.id, 'charts.purple');
    assert.strictEqual(item.contextValue, 'archiveSpec');

    // Command configuration
    assert.strictEqual(item.command?.command, 'openspec.openViewer');
    assert.strictEqual(item.command?.arguments?.[0], item);
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

    // Verify all child artifacts have vscode.open command except specs which have openspec.openViewer
    for (const child of childArtifacts) {
      if (child instanceof ArchiveArtifactItemElement) {
        assert.strictEqual(child.command?.command, 'vscode.open');
        assert.ok(child.command?.arguments?.[0]?.fsPath?.endsWith('.md'));
      } else if (child instanceof ArchiveSpecItemElement) {
        assert.strictEqual(child.command?.command, 'openspec.openViewer');
        assert.strictEqual(child.contextValue, 'archiveSpec');
        assert.ok(String(child.description || '').includes('[Archived]'));
      }
    }
  });

  it('OpenSpecStateStore should populate archived specs with isArchived: true', async () => {
    const store = new OpenSpecStateStore(workspaceRoot);
    await store.refresh();

    const state = store.getState();
    const visualWorkspaceArchive = state.archive.find((a) => a.name === '2026-09-21-visual-workspace-extension');
    assert.ok(visualWorkspaceArchive, 'Should locate archived change');
    assert.ok(visualWorkspaceArchive.specs && visualWorkspaceArchive.specs.length > 0, 'Should have parsed delta specs');

    for (const s of visualWorkspaceArchive.specs) {
      assert.strictEqual(s.isArchived, true, 'Archived spec should have isArchived = true');
      assert.strictEqual(s.archiveName, '2026-09-21-visual-workspace-extension');
    }

    const foundSpec = store.getArchivedSpec('visual-spec-viewer');
    assert.ok(foundSpec, 'store.getArchivedSpec should find archived spec by capability');
    assert.strictEqual(foundSpec?.isArchived, true);
  });

  it('SpecViewerPanel.renderArchivedSpec creates panel and posts SET_LIVING_SPEC with isArchived: true', () => {
    const store = new OpenSpecStateStore(workspaceRoot);
    const extUri = vscode.Uri.file('/mock/ext');

    SpecViewerPanel.renderArchivedSpec(extUri, store, mockArchivedSpec);

    const panelKey = 'archived-spec:2026-09-21-visual-workspace-extension:sample-archived-capability';
    assert.ok(SpecViewerPanel.currentPanels.has(panelKey), 'SpecViewerPanel should be registered for archived spec');

    const panelInstance = SpecViewerPanel.currentPanels.get(panelKey)!;
    assert.strictEqual((panelInstance as any)._panel.title, 'Archived Spec: sample-archived-capability');

    // Dispose and verify cleanup
    panelInstance.dispose();
    assert.strictEqual(SpecViewerPanel.currentPanels.has(panelKey), false);
  });

  it('openspec.openViewer command routes ArchiveSpecItemElement to renderArchivedSpec', async () => {
    const store = new OpenSpecStateStore(workspaceRoot);
    (store as any).state = {
      ...store.getState(),
      specs: [],
      changes: [],
      archive: [
        {
          name: '2026-09-21-visual-workspace-extension',
          path: '/mock/path',
          specs: [mockArchivedSpec],
        },
      ],
    };

    const cli = new OpenSpecCliBridge(workspaceRoot);
    const outputChannel = vscode.window.createOutputChannel('OpenSpec');
    const mockContext: any = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/mock/ext'),
    };

    registerCommands(mockContext, store, cli, outputChannel);

    const item = new ArchiveSpecItemElement(mockArchivedSpec, 'Spec (sample-archived-capability)', '2026-09-21-visual-workspace-extension');
    await vscode.commands.executeCommand('openspec.openViewer', item);

    const panelKey = 'archived-spec:2026-09-21-visual-workspace-extension:sample-archived-capability';
    assert.ok(SpecViewerPanel.currentPanels.has(panelKey), 'Panel should be created for archived spec');
    SpecViewerPanel.currentPanels.get(panelKey)?.dispose();
  });
});
