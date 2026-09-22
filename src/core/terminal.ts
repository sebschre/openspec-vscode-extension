import * as vscode from 'vscode';

export interface ExecuteTerminalOptions {
  viewColumn?: vscode.ViewColumn;
  preserveFocus?: boolean;
  addNewLine?: boolean;
  name?: string;
}

/**
 * Manages the dedicated terminal instance for OpenSpec.
 * Supports positioning adjacent to the OpenSpec window (ViewColumn.Beside / ViewColumn.Two)
 * and direct command dispatching.
 */
export class TerminalManager {
  private static _instance: TerminalManager;
  private _terminal: vscode.Terminal | undefined;
  private _disposables: vscode.Disposable[] = [];

  constructor() {
    this._disposables.push(
      vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (this._terminal === closedTerminal) {
          this._terminal = undefined;
        }
      })
    );
  }

  public static getInstance(): TerminalManager {
    if (!TerminalManager._instance) {
      TerminalManager._instance = new TerminalManager();
    }
    return TerminalManager._instance;
  }

  public get terminal(): vscode.Terminal | undefined {
    return this._terminal;
  }

  /**
   * Retrieves the active dedicated terminal or creates a new one.
   */
  public getOrCreateTerminal(options?: ExecuteTerminalOptions): vscode.Terminal {
    const name = options?.name || 'OpenSpec Terminal';
    const preserveFocus = options?.preserveFocus ?? true;
    const viewColumn = options?.viewColumn;

    if (!this._terminal) {
      if (viewColumn !== undefined) {
        this._terminal = vscode.window.createTerminal({
          name,
          location: { viewColumn, preserveFocus },
        });
      } else {
        this._terminal = vscode.window.createTerminal({
          name,
        });
      }
    }

    this._terminal.show(preserveFocus);
    return this._terminal;
  }

  /**
   * Sends a command to the dedicated terminal for execution.
   */
  public executeCommand(command: string, options?: ExecuteTerminalOptions): boolean {
    if (!command || !command.trim()) {
      return false;
    }

    try {
      const term = this.getOrCreateTerminal(options);
      term.sendText(command.trim(), options?.addNewLine ?? true);
      return true;
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to execute command in OpenSpec terminal: ${err instanceof Error ? err.message : String(err)}`
      );
      return false;
    }
  }

  public dispose() {
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];
    if (this._terminal) {
      this._terminal.dispose();
      this._terminal = undefined;
    }
  }
}
