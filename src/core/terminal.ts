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

export const AGENT_COMMAND_SETTING = 'openspec.terminal.agentCommand';

export interface AgentPreset {
  id: string;
  label: string;
  binary: string;
  template: string;
}

/**
 * Known AI coding agent CLIs. Each template starts an interactive session with
 * the slash command as the first prompt, so later commands can be sent to the
 * running session.
 */
export const AGENT_PRESETS: readonly AgentPreset[] = [
  { id: 'claude', label: 'Claude Code', binary: 'claude', template: 'claude "{command}"' },
  { id: 'antigravity', label: 'Antigravity', binary: 'agy', template: 'agy -i "{command}"' },
  { id: 'gemini', label: 'Gemini CLI', binary: 'gemini', template: 'gemini -i "{command}"' },
  { id: 'codex', label: 'Codex CLI', binary: 'codex', template: 'codex "{command}"' },
  { id: 'opencode', label: 'opencode', binary: 'opencode', template: 'opencode --prompt "{command}"' },
];

export type AgentPickResult =
  | { kind: 'template'; template: string; label: string }
  | { kind: 'openSettings' }
  | { kind: 'copy' };

interface AgentPickItem extends vscode.QuickPickItem {
  action: 'preset' | 'custom' | 'openSettings' | 'copy';
  preset?: AgentPreset;
}

/**
 * Shows the agent preset picker. When `command` is given (the unset flow), the
 * picker also offers Open Settings and Copy Command entries.
 */
export async function pickAgentCommand(context?: { command?: string }): Promise<AgentPickResult | undefined> {
  const current = (vscode.workspace.getConfiguration('openspec.terminal').get<string>('agentCommand') || '').trim();
  const isCustomCurrent = !!current && !AGENT_PRESETS.some((p) => p.template === current);

  const items: AgentPickItem[] = AGENT_PRESETS.map((preset) => ({
    label: preset.label,
    description: preset.template === current ? `${preset.template} (current)` : preset.template,
    detail: `Requires the \`${preset.binary}\` CLI on your PATH`,
    action: 'preset',
    preset,
  }));
  items.push({
    label: 'Custom command…',
    description: isCustomCurrent ? `${current} (current)` : 'Any CLI; use {command} where the slash command goes',
    action: 'custom',
  });
  if (context?.command) {
    items.push(
      { label: 'Open Settings', description: AGENT_COMMAND_SETTING, action: 'openSettings' },
      { label: 'Copy Command', description: context.command, action: 'copy' }
    );
  }

  const picked = await vscode.window.showQuickPick(items, {
    title: 'OpenSpec: Choose the AI coding agent for the OpenSpec terminal',
    placeHolder: context?.command
      ? `No agent configured yet. Pick one to run ${context.command}`
      : 'Pick the agent that OpenSpec terminal actions launch',
    ignoreFocusOut: true,
  });
  if (!picked) {
    return undefined;
  }

  switch (picked.action) {
    case 'preset':
      return { kind: 'template', template: picked.preset!.template, label: picked.preset!.label };
    case 'openSettings':
      return { kind: 'openSettings' };
    case 'copy':
      return { kind: 'copy' };
    case 'custom': {
      const entered = await vscode.window.showInputBox({
        title: 'OpenSpec: Custom agent command',
        prompt: 'Command that launches your agent. {command} is replaced with the slash command; without it, the command is appended in quotes.',
        placeHolder: 'my-agent --prompt "{command}"',
        value: current,
        ignoreFocusOut: true,
        validateInput: (value) => (value.trim() ? undefined : 'Enter a command, e.g. my-agent "{command}"'),
      });
      const template = entered?.trim();
      return template ? { kind: 'template', template, label: 'a custom agent command' } : undefined;
    }
  }
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
   * Handles a terminal action attempted while no agent command is configured:
   * offers the agent preset picker, saves the choice and re-runs the command.
   */
  public async handleUnsetAgentCommand(command: string, options?: ExecuteTerminalOptions): Promise<void> {
    const trimmed = command.trim();
    const choice = await pickAgentCommand({ command: trimmed });
    if (!choice) {
      return;
    }
    if (choice.kind === 'openSettings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', AGENT_COMMAND_SETTING);
      return;
    }
    if (choice.kind === 'copy') {
      await vscode.env.clipboard.writeText(trimmed);
      vscode.window.showInformationMessage('Copied command to clipboard!');
      return;
    }
    await this.saveAgentCommand(choice.template, choice.label);
    const effective = (vscode.workspace.getConfiguration('openspec.terminal').get<string>('agentCommand') || '').trim();
    if (effective) {
      // Only re-run when the setting now resolves; otherwise the picker would reopen.
      this.executeCommand(trimmed, options);
    }
  }

  /**
   * Lets the user choose or change the agent command at any time.
   * Returns the saved template, or undefined if cancelled.
   */
  public async configureAgentCommand(): Promise<string | undefined> {
    const choice = await pickAgentCommand();
    if (!choice || choice.kind !== 'template') {
      return undefined;
    }
    await this.saveAgentCommand(choice.template, choice.label);
    return choice.template;
  }

  /**
   * Saves the template to user settings and resets the session so the next
   * execution launches the newly configured agent.
   */
  private async saveAgentCommand(template: string, label: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('openspec.terminal');
    await config.update('agentCommand', template, vscode.ConfigurationTarget.Global);
    this.resetSession();

    // A workspace or folder value takes precedence over the user setting.
    const effective = (vscode.workspace.getConfiguration('openspec.terminal').get<string>('agentCommand') || '').trim();
    if (effective !== template) {
      vscode.window.showWarningMessage(
        `Saved ${label} to your user settings, but this workspace overrides '${AGENT_COMMAND_SETTING}' with '${effective}'.`
      );
    } else {
      vscode.window.showInformationMessage(`OpenSpec terminal will use ${label}: ${template}`);
    }
  }

  /**
   * Sends a command to the dedicated terminal for execution.
   * If the command is a slash command (e.g. /openspec-apply-change) and not raw:
   *  - Checks if openspec.terminal.agentCommand is configured. If unset, offers the agent picker and returns false.
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
        // Unset configuration: nothing goes to the shell; offer the agent picker,
        // which re-runs this command once an agent is chosen.
        void this.handleUnsetAgentCommand(trimmed, options);
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
