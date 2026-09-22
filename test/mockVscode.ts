export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class TreeItem {
  public label?: string;
  public collapsibleState?: TreeItemCollapsibleState;
  public description?: string;
  public tooltip?: string;
  public iconPath?: any;
  public contextValue?: string;
  public command?: any;

  constructor(label: string, collapsibleState?: TreeItemCollapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

export class ThemeIcon {
  constructor(public id: string, public color?: any) {}
}

export class ThemeColor {
  constructor(public id: string) {}
}

export class EventEmitter<T> {
  private listeners: ((e: T) => any)[] = [];
  public event = (listener: (e: T) => any) => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        this.listeners = this.listeners.filter((l) => l !== listener);
      },
    };
  };

  public fire(data?: T) {
    for (const listener of this.listeners) {
      listener(data as T);
    }
  }
}

export enum ViewColumn {
  One = 1,
  Two = 2,
}

export const Uri = {
  file: (fsPath: string) => ({
    fsPath,
    path: fsPath,
    scheme: 'file',
    toString: () => `file://${fsPath}`,
  }),
  joinPath: (base: any, ...paths: string[]) => ({
    fsPath: [base.fsPath, ...paths].join('/'),
    path: [base.path, ...paths].join('/'),
    scheme: base.scheme,
    toString: () => `file://${[base.fsPath, ...paths].join('/')}`,
  }),
};

export class MockWebviewPanel {
  public title: string;
  public webview: {
    html: string;
    messagesSent: any[];
    onDidReceiveMessage: (cb: any) => { dispose: () => void };
    postMessage: (msg: any) => Promise<boolean>;
    asWebviewUri: (uri: any) => any;
    cspSource: string;
  };
  private _disposed = false;
  private _disposeListeners: (() => void)[] = [];

  constructor(title: string) {
    this.title = title;
    const messagesSent: any[] = [];
    this.webview = {
      html: '',
      messagesSent,
      onDidReceiveMessage: (_cb: any) => ({ dispose: () => {} }),
      postMessage: async (msg: any) => {
        messagesSent.push(msg);
        return true;
      },
      asWebviewUri: (uri: any) => uri,
      cspSource: 'mock-csp',
    };
  }

  reveal(_col?: any) {}

  onDidDispose(cb: () => void) {
    this._disposeListeners.push(cb);
    return { dispose: () => {} };
  }

  dispose() {
    if (!this._disposed) {
      this._disposed = true;
      this._disposeListeners.forEach((l) => l());
    }
  }
}

export const commands = {
  _registered: new Map<string, Function>(),
  registerCommand(id: string, handler: Function) {
    this._registered.set(id, handler);
    return { dispose: () => this._registered.delete(id) };
  },
  async executeCommand(id: string, ...args: any[]) {
    const fn = this._registered.get(id);
    if (fn) {
      return await fn(...args);
    }
  },
};

export const window = {
  createWebviewPanel: (_viewType: string, title: string, _col: any, _opt: any) => {
    return new MockWebviewPanel(title);
  },
  showInformationMessage: async (..._args: any[]) => undefined,
  showWarningMessage: async (..._args: any[]) => undefined,
  showErrorMessage: async (..._args: any[]) => undefined,
  showQuickPick: async (items: any[]) => items[0],
  setStatusBarMessage: (_msg: string, _timeout?: number) => ({ dispose: () => {} }),
  createOutputChannel: (_name: string) => ({
    show: () => {},
    appendLine: () => {},
    dispose: () => {},
  }),
};

export const env = {
  clipboard: {
    writeText: async (_text: string) => {},
    readText: async () => '',
  },
};

export const workspace = {
  openTextDocument: async (_uri: any) => ({}),
  showTextDocument: async (_doc: any) => ({}),
};

export class LanguageModelChatMessage {
  constructor(public role: number, public content: string) {}
  static User(content: string) {
    return new LanguageModelChatMessage(1, content);
  }
  static Assistant(content: string) {
    return new LanguageModelChatMessage(2, content);
  }
}

export const lm = {
  selectChatModels: async (_selector?: any): Promise<any[]> => [],
};

