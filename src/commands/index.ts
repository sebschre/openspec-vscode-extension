import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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

      if (typeof changeNameOrItem === 'string') {
        targetChange = changeNameOrItem;
      } else if (changeNameOrItem && typeof changeNameOrItem.change?.name === 'string') {
        targetChange = changeNameOrItem.change.name;
      } else {
        // Prompt user to pick an active change
        const state = store.getState();
        if (state.changes.length === 0) {
          vscode.window.showInformationMessage('No active OpenSpec changes found to view.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          state.changes.map((c) => ({
            label: c.name,
            description: `${c.taskProgress.completed}/${c.taskProgress.total} tasks`,
            change: c,
          })),
          { placeHolder: 'Select an OpenSpec change to view' }
        );

        if (picked) {
          targetChange = picked.label;
        }
      }

      if (targetChange) {
        SpecViewerPanel.render(context.extensionUri, store, targetChange);
      }
    })
  );

  // Command: New Change
  context.subscriptions.push(
    vscode.commands.registerCommand('openspec.newChange', async () => {
      const changeName = await vscode.window.showInputBox({
        prompt: 'Enter a kebab-case name for the new OpenSpec change',
        placeHolder: 'e.g. add-user-auth',
        validateInput: (value) => {
          if (!value || !value.trim()) {
            return 'Change name cannot be empty';
          }
          if (!/^[a-z0-9-]+$/.test(value.trim())) {
            return 'Change name must be kebab-case (lowercase letters, numbers, and hyphens)';
          }
          return null;
        },
      });

      if (!changeName) return;

      const trimmed = changeName.trim();
      const isCliAvailable = await cli.isCliAvailable();

      if (isCliAvailable) {
        const res = await cli.newChange(trimmed);
        if (res.success) {
          vscode.window.showInformationMessage(`Created OpenSpec change '${trimmed}'`);
        } else {
          vscode.window.showErrorMessage(`Failed to create change via CLI: ${res.stderr || res.stdout}`);
        }
      } else {
        // Direct filesystem scaffold
        const state = store.getState();
        const changeDir = path.join(state.rootPath, 'openspec', 'changes', trimmed);
        fs.mkdirSync(changeDir, { recursive: true });

        const yamlContent = `schema: spec-driven\n`;
        const proposalContent = `# Proposal: ${trimmed}\n\n## Why\n\n## What Changes\n\n## Capabilities\n\n### New Capabilities\n\n### Modified Capabilities\n\n## Impact\n`;
        const tasksContent = `# Tasks\n\n## 1. Implementation\n\n- [ ] 1.1 Initial setup\n`;

        fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), yamlContent, 'utf8');
        fs.writeFileSync(path.join(changeDir, 'proposal.md'), proposalContent, 'utf8');
        fs.writeFileSync(path.join(changeDir, 'tasks.md'), tasksContent, 'utf8');

        vscode.window.showInformationMessage(`Scaffolded OpenSpec change '${trimmed}'`);
      }

      await store.refresh();
      SpecViewerPanel.render(context.extensionUri, store, trimmed);
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
}
