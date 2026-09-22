import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../core/store';
import { OpenSpecCliBridge } from '../core/cli';
import { SpecViewerPanel } from '../views/webview/specViewerPanel';

export function registerCommands(
  context: vscode.ExtensionContext,
  store: OpenSpecStateStore,
  cli: OpenSpecCliBridge,
  outputChannel: vscode.OutputChannel
) {
  // Command: Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('openspec.refresh', async () => {
      await store.refresh();
      vscode.window.setStatusBarMessage('OpenSpec refreshed', 2000);
    })
  );

  // Command: Open Viewer
  context.subscriptions.push(
    vscode.commands.registerCommand('openspec.openViewer', async (changeNameOrItem?: any) => {
      let targetChange: string | undefined;
      let targetCapability: string | undefined;

      if (typeof changeNameOrItem === 'string') {
        if (changeNameOrItem.startsWith('spec:')) {
          targetCapability = changeNameOrItem.slice(5);
        } else if (store.getState().specs.some((s) => s.capability === changeNameOrItem)) {
          targetCapability = changeNameOrItem;
        } else {
          targetChange = changeNameOrItem;
        }
      } else if (changeNameOrItem && typeof changeNameOrItem.spec?.capability === 'string') {
        targetCapability = changeNameOrItem.spec.capability;
      } else if (changeNameOrItem && typeof changeNameOrItem.change?.name === 'string') {
        targetChange = changeNameOrItem.change.name;
      } else {
        // Prompt user to pick an active change or living spec
        const state = store.getState();
        if (state.changes.length === 0 && state.specs.length === 0) {
          vscode.window.showInformationMessage('No active OpenSpec changes or living specs found to view.');
          return;
        }

        const items: Array<vscode.QuickPickItem & { changeName?: string; capability?: string }> = [
          ...state.changes.map((c) => ({
            label: `$(git-pull-request) ${c.name}`,
            description: `Active change • ${c.taskProgress.completed}/${c.taskProgress.total} tasks`,
            changeName: c.name,
          })),
          ...state.specs.map((s) => ({
            label: `$(book) ${s.capability}`,
            description: `Living spec • ${s.requirements.length} reqs`,
            capability: s.capability,
          })),
        ];

        const picked = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select an OpenSpec change or living specification to view',
        });

        if (picked) {
          targetChange = picked.changeName;
          targetCapability = picked.capability;
        }
      }

      if (targetCapability) {
        SpecViewerPanel.renderLivingSpec(context.extensionUri, store, targetCapability, cli);
      } else if (targetChange) {
        SpecViewerPanel.render(context.extensionUri, store, targetChange, cli);
      }
    })
  );

  // Command: New Change
  context.subscriptions.push(
    vscode.commands.registerCommand('openspec.newChange', async () => {
      SpecViewerPanel.renderNewChange(context.extensionUri, store, cli);
    })
  );

  // Command: Validate
  context.subscriptions.push(
    vscode.commands.registerCommand('openspec.validate', async (item?: any) => {
      const changeName = typeof item === 'string' ? item : item?.change?.name;
      outputChannel.show(true);
      outputChannel.appendLine(`\n[OpenSpec] Validating ${changeName ? `change '${changeName}'` : 'all changes'}...`);

      const res = await cli.validate(changeName);
      outputChannel.appendLine(res.stdout);
      if (res.stderr) {
        outputChannel.appendLine(res.stderr);
      }

      if (res.success) {
        vscode.window.showInformationMessage(
          `OpenSpec validation passed${changeName ? ` for '${changeName}'` : ''}!`
        );
      } else {
        vscode.window.showErrorMessage(
          `OpenSpec validation reported errors. See Output panel for details.`
        );
      }
    })
  );

  // Command: Archive
  context.subscriptions.push(
    vscode.commands.registerCommand('openspec.archive', async (item?: any) => {
      const changeName = typeof item === 'string' ? item : item?.change?.name;
      if (!changeName) {
        vscode.window.showWarningMessage('Please select a change to archive.');
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to archive change '${changeName}'? This will promote its delta specs to living specs and archive its artifacts.`,
        { modal: true },
        'Archive Change'
      );

      if (confirm !== 'Archive Change') return;

      outputChannel.show(true);
      outputChannel.appendLine(`\n[OpenSpec] Archiving '${changeName}'...`);
      const res = await cli.archive(changeName);
      outputChannel.appendLine(res.stdout);
      if (res.stderr) outputChannel.appendLine(res.stderr);

      if (res.success) {
        vscode.window.showInformationMessage(`Change '${changeName}' archived successfully.`);
        await store.refresh();
      } else {
        vscode.window.showErrorMessage(`Archive failed. See Output channel for details.`);
      }
    })
  );

  // Command: Reveal Archive in Explorer
  context.subscriptions.push(
    vscode.commands.registerCommand('openspec.revealArchiveInExplorer', async (item?: any) => {
      let targetPath: string | undefined;
      if (typeof item === 'string') {
        targetPath = item;
      } else if (item?.archive?.path) {
        targetPath = item.archive.path;
      }

      if (targetPath) {
        await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(targetPath));
      }
    })
  );
}
