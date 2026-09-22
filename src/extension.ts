import * as vscode from 'vscode';
import { OpenSpecStateStore } from './core/store';
import { WorkspaceWatcher } from './core/watcher';
import { OpenSpecCliBridge } from './core/cli';
import { ChangesTreeProvider } from './views/tree/changesTreeProvider';
import { SpecsTreeProvider } from './views/tree/specsTreeProvider';
import { ArchiveTreeProvider } from './views/tree/archiveTreeProvider';
import { registerCommands } from './commands';

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const workspaceRoot = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();

  const outputChannel = vscode.window.createOutputChannel('OpenSpec');
  context.subscriptions.push(outputChannel);

  const store = new OpenSpecStateStore(workspaceRoot);
  const cli = new OpenSpecCliBridge(workspaceRoot);
  const watcher = new WorkspaceWatcher(store);
  context.subscriptions.push(watcher);

  // Register Tree Views
  const changesProvider = new ChangesTreeProvider(store);
  const specsProvider = new SpecsTreeProvider(store);
  const archiveProvider = new ArchiveTreeProvider(store);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('openspec.views.changes', changesProvider),
    vscode.window.registerTreeDataProvider('openspec.views.specs', specsProvider),
    vscode.window.registerTreeDataProvider('openspec.views.archive', archiveProvider)
  );

  // Register Commands
  registerCommands(context, store, cli, outputChannel);

  // Initial scan
  store.refresh().catch((err) => {
    outputChannel.appendLine(`[OpenSpec] Error during initial scan: ${err}`);
  });

  outputChannel.appendLine('[OpenSpec] OpenSpec Visual Companion Extension activated.');
}

export function deactivate() {}
