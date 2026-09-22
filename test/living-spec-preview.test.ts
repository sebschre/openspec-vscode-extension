import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as vscode from 'vscode';
import { SpecsTreeProvider } from '../src/views/tree/specsTreeProvider';
import { SpecViewerPanel } from '../src/views/webview/specViewerPanel';
import { OpenSpecStateStore } from '../src/core/store';
import { registerCommands } from '../src/commands/index';
import { OpenSpecCliBridge } from '../src/core/cli';
import { SpecDetail } from '../src/core/types';

describe('Living Spec Visual Preview', () => {
  const workspaceRoot = process.cwd();

  const mockSpec: SpecDetail = {
    capability: 'visual-spec-viewer',
    purpose: 'Provide rich interactive preview for living specs',
    filePath: '/path/to/openspec/specs/visual-spec-viewer/spec.md',
    requirements: [
      {
        operation: 'ADDED',
        title: 'Requirement 1: Visual Spec Rendering',
        description: 'The extension SHALL render specs with normative keyword highlighting.',
        scenarios: [
          {
            name: 'Scenario: User views spec',
            given: 'a valid living spec exists',
            when: 'the user clicks the spec in the tree',
            then: 'the interactive webview preview is opened',
            rawText: 'GIVEN a valid living spec exists WHEN the user clicks THEN preview is opened',
          },
        ],
      },
    ],
  };

  it('SpecsTreeProvider creates SpecItemElement configured with openspec.openViewer command', async () => {
    const store = new OpenSpecStateStore(workspaceRoot);
    // Simulate store state with our mock spec
    (store as any).state = {
      ...store.getState(),
      hasOpenSpecRoot: true,
      specs: [mockSpec],
    };

    const provider = new SpecsTreeProvider(store);
    const items = (await provider.getChildren()) as any[];

    assert.strictEqual(items.length, 1);
    const specItem = items[0];
    assert.strictEqual(specItem.label, 'visual-spec-viewer');
    assert.ok(specItem.command, 'SpecItemElement must have a command');
    assert.strictEqual(specItem.command.command, 'openspec.openViewer');
    assert.strictEqual(specItem.command.title, 'Open Spec');
    assert.strictEqual(specItem.command.arguments[0], specItem);
    assert.strictEqual(specItem.command.arguments[0].spec.capability, 'visual-spec-viewer');
  });

  it('SpecViewerPanel.renderLivingSpec creates panel, caches by key, and cleans up on dispose', () => {
    const store = new OpenSpecStateStore(workspaceRoot);
    (store as any).state = {
      ...store.getState(),
      specs: [mockSpec],
    };

    const extUri = vscode.Uri.file('/mock/ext');
    SpecViewerPanel.renderLivingSpec(extUri, store, 'visual-spec-viewer');

    const panelKey = 'spec:visual-spec-viewer';
    assert.ok(SpecViewerPanel.currentPanels.has(panelKey), 'SpecViewerPanel should be registered with spec: prefix');

    const panelInstance = SpecViewerPanel.currentPanels.get(panelKey)!;
    assert.strictEqual((panelInstance as any)._livingSpecCapability, 'visual-spec-viewer');

    // Dispose and verify cleanup
    panelInstance.dispose();
    assert.strictEqual(SpecViewerPanel.currentPanels.has(panelKey), false, 'Panel should be removed from map upon disposal');
  });

  it('openspec.openViewer command routes living spec items to renderLivingSpec', async () => {
    const store = new OpenSpecStateStore(workspaceRoot);
    (store as any).state = {
      ...store.getState(),
      specs: [mockSpec],
      changes: [],
    };
    const cli = new OpenSpecCliBridge(workspaceRoot);
    const outputChannel = vscode.window.createOutputChannel('OpenSpec');
    const mockContext: any = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/mock/ext'),
    };

    registerCommands(mockContext, store, cli, outputChannel);

    // 1. Invoke with tree item having spec.capability
    const treeItem = { spec: mockSpec };
    await vscode.commands.executeCommand('openspec.openViewer', treeItem);
    assert.ok(SpecViewerPanel.currentPanels.has('spec:visual-spec-viewer'));
    SpecViewerPanel.currentPanels.get('spec:visual-spec-viewer')?.dispose();

    // 2. Invoke with capability string starting with spec:
    await vscode.commands.executeCommand('openspec.openViewer', 'spec:visual-spec-viewer');
    assert.ok(SpecViewerPanel.currentPanels.has('spec:visual-spec-viewer'));
    SpecViewerPanel.currentPanels.get('spec:visual-spec-viewer')?.dispose();

    // 3. Invoke with bare capability name matching a living spec
    await vscode.commands.executeCommand('openspec.openViewer', 'visual-spec-viewer');
    assert.ok(SpecViewerPanel.currentPanels.has('spec:visual-spec-viewer'));
    SpecViewerPanel.currentPanels.get('spec:visual-spec-viewer')?.dispose();
  });
});
