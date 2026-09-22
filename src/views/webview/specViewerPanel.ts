import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../../core/store';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../../protocol/messages';

export class SpecViewerPanel {
  public static currentPanels: Map<string, SpecViewerPanel> = new Map();
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _store: OpenSpecStateStore;
  private _changeName: string;
  private _disposables: vscode.Disposable[] = [];

  public static render(extensionUri: vscode.Uri, store: OpenSpecStateStore, changeName: string) {
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

    const viewer = new SpecViewerPanel(panel, extensionUri, store, changeName);
    SpecViewerPanel.currentPanels.set(changeName, viewer);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    store: OpenSpecStateStore,
    changeName: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._store = store;
    this._changeName = changeName;

    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this._handleMessage(message),
      null,
      this._disposables
    );

    const onStoreChange = () => {
      const change = this._store.getChange(this._changeName);
      if (change) {
        this.postMessage({ type: 'UPDATE_STATE', change });
      }
    };
    this._store.on('change', onStoreChange);
    this._disposables.push({
      dispose: () => this._store.removeListener('change', onStoreChange),
    });
  }

  public updateChange(changeName: string) {
    this._changeName = changeName;
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
        const change = this._store.getChange(this._changeName);
        if (change) {
          this.postMessage({ type: 'SET_CHANGE', change });
        }
        break;
      }
      case 'TOGGLE_TASK': {
        await this._store.toggleTask(message.changeName, message.lineIndex, message.completed);
        break;
      }
      case 'RUN_VALIDATE': {
        await vscode.commands.executeCommand('openspec.validate', message.changeName);
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
    SpecViewerPanel.currentPanels.delete(this._changeName);
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
