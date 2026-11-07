import * as vscode from 'vscode';
import { OpenSpecStateStore } from './core/store';
import { WorkspaceWatcher } from './core/watcher';
import { OpenSpecCliBridge } from './core/cli';
import { ChangesTreeProvider } from './views/tree/changesTreeProvider';
import { SpecsTreeProvider } from './views/tree/specsTreeProvider';
import { ArchiveTreeProvider } from './views/tree/archiveTreeProvider';
import { SchemasTreeProvider } from './views/tree/schemasTreeProvider';
import { SchemaDiagnostics } from './views/diagnostics/schemaDiagnostics';
import { registerCommands } from './commands';
import { WorkspaceState } from './core/types';
import { changesBadge } from './views/tree/treeUtils';

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const workspaceRoot = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();

  const outputChannel = vscode.window.createOutputChannel('OpenSpec');
  context.subscriptions.push(outputChannel);

  const cli = new OpenSpecCliBridge(workspaceRoot);
  const store = new OpenSpecStateStore(workspaceRoot, {
    schemaDiscovery: () => cli.listSchemas(),
  });
  const watcher = new WorkspaceWatcher(store, [store.getUserSchemasDir()]);
  context.subscriptions.push(watcher);

  // Register Tree Views
  const changesProvider = new ChangesTreeProvider(store);
  const specsProvider = new SpecsTreeProvider(store);
  const archiveProvider = new ArchiveTreeProvider(store);
  const schemasProvider = new SchemasTreeProvider(store);

  const changesView = vscode.window.createTreeView('openspec.views.changes', {
    treeDataProvider: changesProvider,
    showCollapseAll: true,
  });
  const specsView = vscode.window.createTreeView('openspec.views.specs', {
    treeDataProvider: specsProvider,
    showCollapseAll: true,
  });
  const schemasView = vscode.window.createTreeView('openspec.views.schemas', { treeDataProvider: schemasProvider });

  context.subscriptions.push(
    changesView,
    specsView,
    vscode.window.registerTreeDataProvider('openspec.views.archive', archiveProvider),
    schemasView,
    new SchemaDiagnostics(store)
  );

  // Keep the welcome views and the Active Changes badge in sync with the workspace.
  store.on('change', (state: WorkspaceState) => {
    vscode.commands.executeCommand('setContext', 'openspec.hasRoot', state.hasOpenSpecRoot);
    changesView.badge = changesBadge(state.changes.length);
  });

  // Register Commands
  registerCommands(context, store, cli, outputChannel, {
    revealSchema: async (name) => {
      const item = schemasProvider.itemFor(name);
      if (item) await schemasView.reveal(item, { select: true, focus: true, expand: true });
    },
  });

  // Initial scan
  store.refresh().catch((err) => {
    outputChannel.appendLine(`[OpenSpec] Error during initial scan: ${err}`);
  });

  outputChannel.appendLine('[OpenSpec] OpenSpec Extension activated.');
}

export function deactivate() {}
