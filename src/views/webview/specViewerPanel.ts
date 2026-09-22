import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { OpenSpecStateStore } from '../../core/store';
import { OpenSpecCliBridge } from '../../core/cli';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../../protocol/messages';
import {
  inferChangeName,
  heuristicSlugify,
  refineProposalMotivation,
  heuristicRefineMotivation,
} from '../../core/inference';


export class SpecViewerPanel {
  public static currentPanels: Map<string, SpecViewerPanel> = new Map();
  public static currentNewChangePanel?: SpecViewerPanel;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _store: OpenSpecStateStore;
  private readonly _cli: OpenSpecCliBridge;
  private _changeName: string;
  private _isNewChangeMode: boolean = false;
  private _disposables: vscode.Disposable[] = [];

  public static render(
    extensionUri: vscode.Uri,
    store: OpenSpecStateStore,
    changeName: string,
    cli?: OpenSpecCliBridge
  ) {
    const existing = SpecViewerPanel.currentPanels.get(changeName);
    if (existing) {
      existing._panel.reveal(vscode.ViewColumn.One);
      existing.updateChange(changeName);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'openspec.specViewer',
      `OpenSpec: ${changeName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'dist', 'webview'),
        ],
      }
    );

    const viewer = new SpecViewerPanel(panel, extensionUri, store, changeName, false, cli);
    SpecViewerPanel.currentPanels.set(changeName, viewer);
  }

  public static renderNewChange(
    extensionUri: vscode.Uri,
    store: OpenSpecStateStore,
    cli?: OpenSpecCliBridge
  ) {
    if (SpecViewerPanel.currentNewChangePanel) {
      SpecViewerPanel.currentNewChangePanel._panel.reveal(vscode.ViewColumn.One);
      SpecViewerPanel.currentNewChangePanel.showNewChangeMode();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'openspec.specViewer',
      'OpenSpec: New Change',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'dist', 'webview'),
        ],
      }
    );

    const viewer = new SpecViewerPanel(panel, extensionUri, store, '', true, cli);
    SpecViewerPanel.currentNewChangePanel = viewer;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    store: OpenSpecStateStore,
    changeName: string,
    isNewChangeMode: boolean = false,
    cli?: OpenSpecCliBridge
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._store = store;
    this._changeName = changeName;
    this._isNewChangeMode = isNewChangeMode;
    this._cli = cli || new OpenSpecCliBridge(store.getState().rootPath);

    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this._handleMessage(message),
      null,
      this._disposables
    );

    const onStoreChange = () => {
      if (!this._isNewChangeMode && this._changeName) {
        const change = this._store.getChange(this._changeName);
        if (change) {
          this.postMessage({ type: 'UPDATE_STATE', change });
        }
      }
    };
    this._store.on('change', onStoreChange);
    this._disposables.push({
      dispose: () => this._store.removeListener('change', onStoreChange),
    });
  }

  public showNewChangeMode() {
    this._isNewChangeMode = true;
    this._panel.title = 'OpenSpec: New Change';
    this.postMessage({
      type: 'SET_NEW_CHANGE_MODE',
      availableSchemas: ['spec-driven'],
    });
  }

  public updateChange(changeName: string) {
    if (this._changeName && this._changeName !== changeName) {
      SpecViewerPanel.currentPanels.delete(this._changeName);
    }
    this._changeName = changeName;
    this._isNewChangeMode = false;
    SpecViewerPanel.currentPanels.set(changeName, this);
    this._panel.title = `OpenSpec: ${changeName}`;
    const change = this._store.getChange(changeName);
    if (change) {
      this.postMessage({ type: 'SET_CHANGE', change });
    }
  }

  public postMessage(message: ExtensionToWebviewMessage) {
    this._panel.webview.postMessage(message);
  }

  private async _handleMessage(message: WebviewToExtensionMessage) {
    switch (message.type) {
      case 'READY': {
        if (this._isNewChangeMode) {
          this.showNewChangeMode();
        } else {
          const change = this._store.getChange(this._changeName);
          if (change) {
            this.postMessage({ type: 'SET_CHANGE', change });
          }
        }
        break;
      }
      case 'INFER_CHANGE_NAME': {
        try {
          const result = await inferChangeName(message.description);
          this.postMessage({
            type: 'INFERRED_CHANGE_NAME',
            name: result.name,
            isAi: result.isAi,
          });
        } catch {
          this.postMessage({
            type: 'INFERRED_CHANGE_NAME',
            name: heuristicSlugify(message.description),
            isAi: false,
          });
        }
        break;
      }
      case 'REFINE_MOTIVATION': {
        try {
          const result = await refineProposalMotivation(message.description);
          this.postMessage({
            type: 'REFINED_MOTIVATION',
            motivation: result.motivation,
            isAi: result.isAi,
          });
        } catch {
          this.postMessage({
            type: 'REFINED_MOTIVATION',
            motivation: heuristicRefineMotivation(message.description),
            isAi: false,
          });
        }
        break;
      }
      case 'SUBMIT_NEW_CHANGE': {
        const { name, description, motivation, schema } = message;
        const trimmedName = (name || '').trim();
        const trimmedDesc = (description || '').trim();
        const trimmedMotivation = (motivation || '').trim() || trimmedDesc;
        const selectedSchema = schema || 'spec-driven';

        if (!trimmedName || !/^[a-z0-9-]+$/.test(trimmedName)) {
          this.postMessage({
            type: 'CHANGE_CREATION_ERROR',
            error: 'Change name must be kebab-case (lowercase letters, numbers, and hyphens).',
          });
          break;
        }

        const existing = this._store.getChange(trimmedName);
        if (existing) {
          this.postMessage({
            type: 'CHANGE_CREATION_ERROR',
            error: `Change "${trimmedName}" already exists.`,
          });
          break;
        }

        try {
          const state = this._store.getState();
          const isCliAvailable = await this._cli.isCliAvailable();
          let created = false;

          if (isCliAvailable) {
            const res = await this._cli.newChange(trimmedName, selectedSchema, trimmedDesc);
            if (res.success) {
              created = true;
            }
          }

          const changeDir = path.join(state.rootPath, 'openspec', 'changes', trimmedName);
          const proposalPath = path.join(changeDir, 'proposal.md');
          const tasksPath = path.join(changeDir, 'tasks.md');
          const yamlPath = path.join(changeDir, '.openspec.yaml');

          if (!created) {
            // Direct filesystem scaffolding fallback
            fs.mkdirSync(changeDir, { recursive: true });
            fs.writeFileSync(yamlPath, `schema: ${selectedSchema}\n`, 'utf8');

            const whySection = trimmedMotivation ? `\n\n${trimmedMotivation}` : '';
            const whatSection = trimmedDesc ? `\n\n${trimmedDesc}` : '';
            const proposalContent = `# Proposal: ${trimmedName}\n\n## Why${whySection}\n\n## What Changes${whatSection}\n\n## Capabilities\n\n### New Capabilities\n\n### Modified Capabilities\n\n## Impact\n`;
            fs.writeFileSync(proposalPath, proposalContent, 'utf8');

            const tasksContent = `# Tasks\n\n## 1. Implementation\n\n- [ ] 1.1 Initial setup\n`;
            fs.writeFileSync(tasksPath, tasksContent, 'utf8');
          } else if (trimmedMotivation || trimmedDesc) {
            // Ensure proposal.md contains the refined motivation in ## Why and description in ## What Changes
            if (fs.existsSync(proposalPath)) {
              let content = fs.readFileSync(proposalPath, 'utf8');
              if (trimmedMotivation) {
                content = content.replace(/## Why\s*(\n+[\s\S]*?)?(?=\n## What Changes|\n## Capabilities|$)/, `## Why\n\n${trimmedMotivation}\n\n`);
              }
              if (trimmedDesc && !content.includes(trimmedDesc)) {
                content = content.replace(/## What Changes\s*(\n+[\s\S]*?)?(?=\n## Capabilities|$)/, `## What Changes\n\n${trimmedDesc}\n\n`);
              }
              fs.writeFileSync(proposalPath, content, 'utf8');
            } else {
              const proposalContent = `# Proposal: ${trimmedName}\n\n## Why\n\n${trimmedMotivation}\n\n## What Changes\n\n${trimmedDesc}\n\n## Capabilities\n\n### New Capabilities\n\n### Modified Capabilities\n\n## Impact\n`;
              fs.writeFileSync(proposalPath, proposalContent, 'utf8');
            }
          }

          await this._store.refresh();

          if (SpecViewerPanel.currentNewChangePanel === this) {
            SpecViewerPanel.currentNewChangePanel = undefined;
          }
          this._isNewChangeMode = false;
          SpecViewerPanel.currentPanels.set(trimmedName, this);
          this.updateChange(trimmedName);

          vscode.window.showInformationMessage(`Created OpenSpec change '${trimmedName}'`);
        } catch (err: any) {
          this.postMessage({
            type: 'CHANGE_CREATION_ERROR',
            error: `Failed to create change: ${err.message || String(err)}`,
          });
        }
        break;
      }
      case 'CANCEL_NEW_CHANGE': {
        if (this._changeName) {
          this._isNewChangeMode = false;
          this.updateChange(this._changeName);
        } else {
          this.dispose();
        }
        break;
      }
      case 'TOGGLE_TASK': {
        await this._store.toggleTask(message.changeName, message.lineIndex, message.completed);
        break;
      }
      case 'RUN_VALIDATE': {
        try {
          const res = await this._cli.validate(message.changeName);
          this.postMessage({
            type: 'VALIDATION_RESULT',
            changeName: message.changeName,
            success: res.success,
            stdout: res.stdout || '',
            stderr: res.stderr || '',
          });
          if (res.success) {
            vscode.window.showInformationMessage(`OpenSpec validation passed for '${message.changeName}'!`);
          } else {
            vscode.window.showErrorMessage(`OpenSpec validation reported errors. See webview or Output panel for details.`);
          }
        } catch (err: any) {
          this.postMessage({
            type: 'VALIDATION_RESULT',
            changeName: message.changeName,
            success: false,
            stdout: '',
            stderr: err.message || String(err),
          });
          vscode.window.showErrorMessage(`OpenSpec validation failed: ${err.message || String(err)}`);
        }
        break;
      }
      case 'RUN_ARCHIVE': {
        await vscode.commands.executeCommand('openspec.archive', message.changeName);
        break;
      }

      case 'OPEN_FILE': {
        if (message.filePath) {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(message.filePath));
          await vscode.window.showTextDocument(doc);
        }
        break;
      }
      case 'COPY_AI_PROMPT': {
        await vscode.env.clipboard.writeText(message.promptText);
        vscode.window.showInformationMessage('Copied AI prompt to clipboard!');
        break;
      }
    }
  }

  public dispose() {
    if (SpecViewerPanel.currentNewChangePanel === this) {
      SpecViewerPanel.currentNewChangePanel = undefined;
    }
    if (this._changeName) {
      SpecViewerPanel.currentPanels.delete(this._changeName);
    }
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlForWebview(): string {
    const webview = this._panel.webview;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'index.js')
    );
    const codiconCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'codicon.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${codiconCssUri}">
  <title>OpenSpec Viewer</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --font-family: var(--vscode-font-family);
      --font-size: var(--vscode-font-size);
      --card-bg: var(--vscode-editorWidget-background, #1f1f24);
      --card-border: var(--vscode-widget-border, #333338);
      --accent: var(--vscode-button-background, #0078d4);
      --accent-hover: var(--vscode-button-hoverBackground, #026ec1);
      --accent-fg: var(--vscode-button-foreground, #ffffff);
      --badge-added: #2ea043;
      --badge-modified: #d29922;
      --badge-removed: #f85149;
    }
    body {
      background-color: var(--bg);
      color: var(--fg);
      font-family: var(--font-family);
      font-size: var(--font-size);
      padding: 24px;
      margin: 0;
      line-height: 1.5;
    }
    * {
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
