import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { OpenSpecStateStore } from '../../core/store';
import { OpenSpecCliBridge } from '../../core/cli';
import { TerminalManager } from '../../core/terminal';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../../protocol/messages';
import {
  inferChangeName,
  heuristicSlugify,
  refineProposalMotivation,
  heuristicRefineMotivation,
  generateProposalDoc,
  generateDeltaSpecDoc,
  generateDesignDoc,
  generateTasksDoc,
} from '../../core/inference';


export class SpecViewerPanel {
  public static currentPanels: Map<string, SpecViewerPanel> = new Map();
  public static currentNewChangePanel?: SpecViewerPanel;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _store: OpenSpecStateStore;
  private readonly _cli: OpenSpecCliBridge;
  private _changeName: string;
  private _livingSpecCapability?: string;
  private _archivedSpec?: any;
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

  public static renderLivingSpec(
    extensionUri: vscode.Uri,
    store: OpenSpecStateStore,
    capability: string,
    cli?: OpenSpecCliBridge
  ) {
    const panelKey = `spec:${capability}`;
    const existing = SpecViewerPanel.currentPanels.get(panelKey);
    if (existing) {
      existing._panel.reveal(vscode.ViewColumn.One);
      existing.updateLivingSpec(capability);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'openspec.specViewer',
      `Spec: ${capability}`,
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

    const viewer = new SpecViewerPanel(panel, extensionUri, store, '', false, cli, capability);
    SpecViewerPanel.currentPanels.set(panelKey, viewer);
  }

  public static renderArchivedSpec(
    extensionUri: vscode.Uri,
    store: OpenSpecStateStore,
    spec: any,
    cli?: OpenSpecCliBridge
  ) {
    const panelKey = `archived-spec:${spec.archiveName || ''}:${spec.capability}`;
    const existing = SpecViewerPanel.currentPanels.get(panelKey);
    if (existing) {
      existing._panel.reveal(vscode.ViewColumn.One);
      existing.updateArchivedSpec(spec);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'openspec.specViewer',
      `Archived Spec: ${spec.capability}`,
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

    const viewer = new SpecViewerPanel(panel, extensionUri, store, '', false, cli, undefined, spec);
    SpecViewerPanel.currentPanels.set(panelKey, viewer);
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
    cli?: OpenSpecCliBridge,
    livingSpecCapability?: string,
    archivedSpec?: any
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._store = store;
    this._changeName = changeName;
    this._isNewChangeMode = isNewChangeMode;
    this._livingSpecCapability = livingSpecCapability;
    this._archivedSpec = archivedSpec;
    this._cli = cli || new OpenSpecCliBridge(store.getState().rootPath);

    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this._handleMessage(message),
      null,
      this._disposables
    );

    const onStoreChange = () => {
      if (this._archivedSpec) {
        const found = this._store.getArchivedSpec(this._archivedSpec.capability);
        if (found) {
          this._archivedSpec = found;
          this.postMessage({ type: 'SET_LIVING_SPEC', spec: found });
        }
      } else if (this._livingSpecCapability) {
        const spec =
          this._store.getState().specs.find((s) => s.capability === this._livingSpecCapability) ||
          this._store.getArchivedSpec(this._livingSpecCapability);
        if (spec) {
          this.postMessage({ type: 'SET_LIVING_SPEC', spec });
        }
      } else if (!this._isNewChangeMode && this._changeName) {
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
    this._livingSpecCapability = undefined;
    this._archivedSpec = undefined;
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
    this._livingSpecCapability = undefined;
    this._archivedSpec = undefined;
    this._isNewChangeMode = false;
    SpecViewerPanel.currentPanels.set(changeName, this);
    this._panel.title = `OpenSpec: ${changeName}`;
    const change = this._store.getChange(changeName);
    if (change) {
      this.postMessage({ type: 'SET_CHANGE', change });
    }
  }

  public updateLivingSpec(capability: string) {
    const oldKey = this._livingSpecCapability ? `spec:${this._livingSpecCapability}` : '';
    if (oldKey && oldKey !== `spec:${capability}`) {
      SpecViewerPanel.currentPanels.delete(oldKey);
    }
    this._livingSpecCapability = capability;
    this._archivedSpec = undefined;
    this._changeName = '';
    this._isNewChangeMode = false;
    SpecViewerPanel.currentPanels.set(`spec:${capability}`, this);
    this._panel.title = `Spec: ${capability}`;
    const spec =
      this._store.getState().specs.find((s) => s.capability === capability) ||
      this._store.getArchivedSpec(capability);
    if (spec) {
      if (spec.isArchived) {
        this._panel.title = `Archived Spec: ${capability}`;
      }
      this.postMessage({ type: 'SET_LIVING_SPEC', spec });
    }
  }

  public updateArchivedSpec(spec: any) {
    const oldKey = this._archivedSpec
      ? `archived-spec:${this._archivedSpec.archiveName || ''}:${this._archivedSpec.capability}`
      : '';
    const newKey = `archived-spec:${spec.archiveName || ''}:${spec.capability}`;
    if (oldKey && oldKey !== newKey) {
      SpecViewerPanel.currentPanels.delete(oldKey);
    }
    this._archivedSpec = spec;
    this._livingSpecCapability = undefined;
    this._changeName = '';
    this._isNewChangeMode = false;
    SpecViewerPanel.currentPanels.set(newKey, this);
    this._panel.title = `Archived Spec: ${spec.capability}`;
    this.postMessage({ type: 'SET_LIVING_SPEC', spec });
  }

  public postMessage(message: ExtensionToWebviewMessage) {
    this._panel.webview.postMessage(message);
  }

  private async _handleMessage(message: WebviewToExtensionMessage) {
    switch (message.type) {
      case 'READY': {
        if (this._isNewChangeMode) {
          this.showNewChangeMode();
        } else if (this._archivedSpec) {
          this.postMessage({ type: 'SET_LIVING_SPEC', spec: this._archivedSpec });
        } else if (this._livingSpecCapability) {
          const spec =
            this._store.getState().specs.find((s) => s.capability === this._livingSpecCapability) ||
            this._store.getArchivedSpec(this._livingSpecCapability);
          if (spec) {
            this.postMessage({ type: 'SET_LIVING_SPEC', spec });
          }
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
        const { name, description, schema } = message;
        const trimmedName = (name || '').trim();
        const trimmedDesc = (description || '').trim();
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

          // Step 1: Scaffolding
          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'scaffolding',
              status: 'active',
              message: 'Scaffolding change directory...',
            },
          });

          if (isCliAvailable) {
            const res = await this._cli.newChange(trimmedName, selectedSchema, trimmedDesc);
            if (res.success) {
              created = true;
            }
          }

          const changeDir = path.join(state.rootPath, 'openspec', 'changes', trimmedName);
          const proposalPath = path.join(changeDir, 'proposal.md');
          const designPath = path.join(changeDir, 'design.md');
          const tasksPath = path.join(changeDir, 'tasks.md');
          const yamlPath = path.join(changeDir, '.openspec.yaml');

          if (!created) {
            fs.mkdirSync(changeDir, { recursive: true });
            fs.writeFileSync(yamlPath, `schema: ${selectedSchema}\n`, 'utf8');
          }

          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'scaffolding',
              status: 'completed',
              message: 'Scaffolded change directory',
            },
          });

          // Step 2: Proposal
          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'proposal',
              status: 'active',
              message: 'Generating proposal document (proposal.md)...',
            },
          });

          const proposalResult = await generateProposalDoc(trimmedName, trimmedDesc, trimmedName);
          fs.writeFileSync(proposalPath, proposalResult.content, 'utf8');

          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'proposal',
              status: 'completed',
              message: 'Generated proposal.md',
            },
          });

          // Step 3: Delta Specs
          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'specs',
              status: 'active',
              message: `Authoring delta specification (specs/${trimmedName}/spec.md)...`,
            },
          });

          const specDir = path.join(changeDir, 'specs', trimmedName);
          fs.mkdirSync(specDir, { recursive: true });
          const specPath = path.join(specDir, 'spec.md');
          const specResult = await generateDeltaSpecDoc(trimmedName, trimmedDesc);
          fs.writeFileSync(specPath, specResult.content, 'utf8');

          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'specs',
              status: 'completed',
              message: `Generated specs/${trimmedName}/spec.md`,
            },
          });

          // Step 4: Technical Design
          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'design',
              status: 'active',
              message: 'Synthesizing technical design (design.md)...',
            },
          });

          const designResult = await generateDesignDoc(trimmedName, trimmedDesc, trimmedName);
          fs.writeFileSync(designPath, designResult.content, 'utf8');

          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'design',
              status: 'completed',
              message: 'Generated design.md',
            },
          });

          // Step 5: Implementation Tasks
          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'tasks',
              status: 'active',
              message: 'Formulating task checklist (tasks.md)...',
            },
          });

          const tasksResult = await generateTasksDoc(trimmedName, trimmedDesc, trimmedName);
          fs.writeFileSync(tasksPath, tasksResult.content, 'utf8');

          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'tasks',
              status: 'completed',
              message: 'Generated tasks.md',
            },
          });

          // Step 6: Validation
          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'validating',
              status: 'active',
              message: 'Validating OpenSpec schema and artifacts...',
            },
          });

          if (isCliAvailable) {
            await this._cli.validate(trimmedName);
          }

          this.postMessage({
            type: 'GENERATION_PROGRESS',
            progress: {
              step: 'validating',
              status: 'completed',
              message: 'Specification validated successfully',
            },
          });

          await this._store.refresh();

          if (SpecViewerPanel.currentNewChangePanel === this) {
            SpecViewerPanel.currentNewChangePanel = undefined;
          }
          this._isNewChangeMode = false;
          SpecViewerPanel.currentPanels.set(trimmedName, this);
          this.updateChange(trimmedName);

          vscode.window.showInformationMessage(`Created OpenSpec change '${trimmedName}' with full specification suite.`);
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
      case 'OPEN_TERMINAL': {
        const col = message.viewColumn ?? vscode.ViewColumn.Beside;
        TerminalManager.getInstance().getOrCreateTerminal({ viewColumn: col, preserveFocus: false });
        break;
      }
      case 'EXECUTE_TERMINAL_COMMAND': {
        const col = message.viewColumn ?? vscode.ViewColumn.Beside;
        TerminalManager.getInstance().executeCommand(message.command, { viewColumn: col, preserveFocus: false });
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
    if (this._livingSpecCapability) {
      SpecViewerPanel.currentPanels.delete(`spec:${this._livingSpecCapability}`);
    }
    if (this._archivedSpec) {
      SpecViewerPanel.currentPanels.delete(
        `archived-spec:${this._archivedSpec.archiveName || ''}:${this._archivedSpec.capability}`
      );
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
