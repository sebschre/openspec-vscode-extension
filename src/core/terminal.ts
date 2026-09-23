import * as vscode from 'vscode';

export interface ExecuteTerminalOptions {
  viewColumn?: vscode.ViewColumn;
  preserveFocus?: boolean;
  addNewLine?: boolean;
  name?: string;
  raw?: boolean;
}

/**
 * Resolves a command string using a configured agent command template.
 * If {command} placeholder is present, replaces it with the target command.
 * Otherwise, appends the target command enclosed in double quotes.
 */
export function resolveAgentCommand(template: string, command: string): string {
  const trimmedTemplate = template.trim();
  const trimmedCommand = command.trim();
  if (!trimmedTemplate) {
    return trimmedCommand;
  }
  if (trimmedTemplate.includes('{command}')) {
    return trimmedTemplate.replace(/\{command\}/g, trimmedCommand);
  }
  return `${trimmedTemplate} "${trimmedCommand}"`;
}

/**
 * Manages the dedicated terminal instance for OpenSpec.
 * Supports positioning adjacent to the OpenSpec window (ViewColumn.Beside / ViewColumn.Two),
 * configurable AI coding agent command dispatching, and session reuse tracking.
 */
export class TerminalManager {
  private static _instance: TerminalManager;
  private _terminal: vscode.Terminal | undefined;
  private _hasSessionLaunched = false;
  private _disposables: vscode.Disposable[] = [];

  constructor() {
    this._disposables.push(
      vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (this._terminal === closedTerminal) {
          this._terminal = undefined;
          this._hasSessionLaunched = false;
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

  public get hasSessionLaunched(): boolean {
    return this._hasSessionLaunched;
  }

  public resetSession(): void {
    this._hasSessionLaunched = false;
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
   * Displays guidance when an AI agent command is required but unset.
   */
  public async handleUnsetAgentCommand(command: string): Promise<void> {
    const action = await vscode.window.showInformationMessage(
      "OpenSpec terminal execution requires an AI coding agent command. Please set 'openspec.terminal.agentCommand' in settings (e.g. 'agy -i \"{command}\"' or 'claude \"{command}\"').",
      'Configure Setting',
      'Copy Command'
    );

    if (action === 'Configure Setting') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'openspec.terminal.agentCommand');
    } else if (action === 'Copy Command') {
      await vscode.env.clipboard.writeText(command.trim());
      vscode.window.showInformationMessage('Copied command to clipboard!');
    }
  }

  /**
   * Sends a command to the dedicated terminal for execution.
   * If the command is a slash command (e.g. /openspec-apply-change) and not raw:
   *  - Checks if openspec.terminal.agentCommand is configured. If unset, prompts user and aborts.
   *  - If session is fresh, wraps command in configured template and sets session launched.
   *  - If session is already active, sends raw slash command directly to the running agent REPL.
   */
  public executeCommand(command: string, options?: ExecuteTerminalOptions): boolean {
    if (!command || !command.trim()) {
      return false;
    }

    const trimmed = command.trim();
    const isSlashCommand = trimmed.startsWith('/');

    if (isSlashCommand && !options?.raw) {
      const config = vscode.workspace.getConfiguration('openspec.terminal');
      const agentTemplate = (config.get<string>('agentCommand') || '').trim();

      if (!agentTemplate) {
        // Unset configuration: abort execution and show guidance notification
        this.handleUnsetAgentCommand(trimmed);
        return false;
      }

      try {
        const term = this.getOrCreateTerminal(options);
        if (this._hasSessionLaunched) {
          // Reusing existing agent session: send raw command
          term.sendText(trimmed, options?.addNewLine ?? true);
        } else {
          // Initial launch in fresh terminal: resolve with template
          const launchCmd = resolveAgentCommand(agentTemplate, trimmed);
          term.sendText(launchCmd, options?.addNewLine ?? true);
          this._hasSessionLaunched = true;
        }
        return true;
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to execute command in OpenSpec terminal: ${err instanceof Error ? err.message : String(err)}`
        );
        return false;
      }
    }

    try {
      const term = this.getOrCreateTerminal(options);
      term.sendText(trimmed, options?.addNewLine ?? true);
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
    this._hasSessionLaunched = false;
  }
}
