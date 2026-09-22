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

export const Uri = {
  file: (fsPath: string) => ({
    fsPath,
    path: fsPath,
    scheme: 'file',
    toString: () => `file://${fsPath}`,
  }),
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

