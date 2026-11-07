import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { AGENT_PRESETS, TerminalManager, resolveAgentCommand } from '../src/core/terminal';

describe('TerminalManager & Agent Command Resolution', () => {
  let manager: TerminalManager;

  beforeEach(() => {
    (vscode.window as any).terminalsCreated = [];
    (vscode.window as any).lastInformationMessage = undefined;
    (vscode.window as any).lastInformationActions = [];
    (vscode.window as any).showInformationMessageResponse = undefined;
    (vscode.window as any).showQuickPickResponse = undefined;
    (vscode.window as any).showInputBoxResponse = undefined;
    (vscode.window as any).lastQuickPickItems = [];
    (vscode.window as any).lastInputBoxOptions = undefined;
    (vscode.window as any).lastWarningMessage = undefined;
    (vscode.workspace as any).lastConfigUpdate = undefined;
    (vscode.commands as any).commandsExecuted = [];
    (vscode.env.clipboard as any).lastWrittenText = '';
    (vscode.workspace as any)._config.clear();
    manager = new TerminalManager();
  });

  describe('resolveAgentCommand', () => {
    it('should return command as-is if template is empty', () => {
      assert.strictEqual(resolveAgentCommand('', '/openspec-propose'), '/openspec-propose');
      assert.strictEqual(resolveAgentCommand('   ', '/openspec-propose'), '/openspec-propose');
    });

    it('should replace {command} placeholder in template', () => {
      assert.strictEqual(
        resolveAgentCommand('agy -i "{command}"', '/openspec-apply-change foo'),
        'agy -i "/openspec-apply-change foo"'
      );
      assert.strictEqual(
        resolveAgentCommand('claude "{command}"', '/openspec-propose'),
        'claude "/openspec-propose"'
      );
      assert.strictEqual(
        resolveAgentCommand('aider --message "{command}" --yes', '/openspec-explore'),
        'aider --message "/openspec-explore" --yes'
      );
    });

    it('should append command in double quotes if template lacks placeholder', () => {
      assert.strictEqual(
        resolveAgentCommand('claude', '/openspec-apply-change foo'),
        'claude "/openspec-apply-change foo"'
      );
      assert.strictEqual(
        resolveAgentCommand('agy -i', '/openspec-propose'),
        'agy -i "/openspec-propose"'
      );
    });
  });

  describe('Terminal lifecycle and options', () => {
    it('should create a dedicated terminal with default options and show it', () => {
      const term = manager.getOrCreateTerminal();
      assert.ok(term);
      assert.strictEqual((term as any).name, 'OpenSpec Terminal');
      assert.strictEqual((term as any).isShown, true);
      assert.strictEqual((vscode.window as any).terminalsCreated.length, 1);
    });

    it('should support custom options such as viewColumn for adjacent placement', () => {
      const term = manager.getOrCreateTerminal({
        name: 'Custom OpenSpec',
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: false,
      });
      assert.ok(term);
      assert.strictEqual((term as any).name, 'Custom OpenSpec');
      assert.strictEqual((term as any).options.location.viewColumn, vscode.ViewColumn.Two);
      assert.strictEqual((term as any).options.location.preserveFocus, false);
    });

    it('should reuse active terminal instance until closed', () => {
      const term1 = manager.getOrCreateTerminal();
      const term2 = manager.getOrCreateTerminal();
      assert.strictEqual(term1, term2);
      assert.strictEqual((vscode.window as any).terminalsCreated.length, 1);

      // Simulate closing terminal
      term1.dispose();
      assert.strictEqual(manager.terminal, undefined);

      const term3 = manager.getOrCreateTerminal();
      assert.notStrictEqual(term1, term3);
      assert.strictEqual((vscode.window as any).terminalsCreated.length, 2);
    });

    it('should reject empty commands without dispatching', () => {
      const success = manager.executeCommand('   ');
      assert.strictEqual(success, false);
      assert.strictEqual((vscode.window as any).terminalsCreated.length, 0);
    });
  });

  describe('Unset agent command behavior', () => {
    const win = () => vscode.window as any;
    const flush = () => new Promise((r) => setTimeout(r, 0));

    it('should not dispatch and should offer the agent picker when agentCommand is unset', async () => {
      win().showQuickPickResponse = null; // dismiss
      const success = manager.executeCommand('/openspec-apply-change test-change');
      assert.strictEqual(success, false);
      await flush();

      assert.strictEqual(win().terminalsCreated.length, 0);
      const labels = win().lastQuickPickItems.map((i: any) => i.label);
      assert.deepStrictEqual(labels, [
        ...AGENT_PRESETS.map((p) => p.label),
        'Custom command…',
        'Open Settings',
        'Copy Command',
      ]);
      assert.strictEqual((vscode.workspace as any)._config.has('openspec.terminal.agentCommand'), false);
    });

    it('should save a picked preset to user settings and run the original command', async () => {
      win().showQuickPickResponse = 'Claude Code';
      await manager.handleUnsetAgentCommand('/openspec-apply-change my-change');

      const update = (vscode.workspace as any).lastConfigUpdate;
      assert.deepStrictEqual(update, {
        key: 'openspec.terminal.agentCommand',
        value: 'claude "{command}"',
        target: vscode.ConfigurationTarget.Global,
      });
      const term = manager.terminal as any;
      assert.deepStrictEqual(term.textsSent, ['claude "/openspec-apply-change my-change"']);
      assert.strictEqual(manager.hasSessionLaunched, true);
    });

    it('should save a custom command and reject empty input', async () => {
      win().showQuickPickResponse = 'Custom command…';
      win().showInputBoxResponse = '  aider --message  ';
      await manager.handleUnsetAgentCommand('/openspec-propose');

      const validate = win().lastInputBoxOptions.validateInput;
      assert.ok(validate('   '));
      assert.strictEqual(validate('x'), undefined);
      assert.strictEqual((vscode.workspace as any)._config.get('openspec.terminal.agentCommand'), 'aider --message');
      assert.deepStrictEqual((manager.terminal as any).textsSent, ['aider --message "/openspec-propose"']);
    });

    it('should do nothing when the custom input is cancelled', async () => {
      win().showQuickPickResponse = 'Custom command…';
      win().showInputBoxResponse = null;
      await manager.handleUnsetAgentCommand('/openspec-propose');

      assert.strictEqual((vscode.workspace as any)._config.has('openspec.terminal.agentCommand'), false);
      assert.strictEqual(win().terminalsCreated.length, 0);
    });

    it('should open settings when Open Settings is picked', async () => {
      win().showQuickPickResponse = 'Open Settings';
      await manager.handleUnsetAgentCommand('/openspec-propose');

      const executed = (vscode.commands as any).commandsExecuted.find(
        (c: any) => c.id === 'workbench.action.openSettings'
      );
      assert.ok(executed);
      assert.deepStrictEqual(executed.args, ['openspec.terminal.agentCommand']);
      assert.strictEqual(win().terminalsCreated.length, 0);
    });

    it('should write command to clipboard when Copy Command is picked', async () => {
      win().showQuickPickResponse = 'Copy Command';
      await manager.handleUnsetAgentCommand('/openspec-apply-change my-change');

      assert.strictEqual((vscode.env.clipboard as any).lastWrittenText, '/openspec-apply-change my-change');
      assert.strictEqual(win().terminalsCreated.length, 0);
    });
  });

  describe('Configure agent command', () => {
    const win = () => vscode.window as any;

    it('should mark the current preset and omit unset-only entries', async () => {
      (vscode.workspace as any)._config.set('openspec.terminal.agentCommand', 'gemini -i "{command}"');
      win().showQuickPickResponse = null;
      await manager.configureAgentCommand();

      const items = win().lastQuickPickItems;
      const gemini = items.find((i: any) => i.label === 'Gemini CLI');
      assert.ok(gemini.description.includes('(current)'));
      assert.ok(!items.find((i: any) => i.label === 'Claude Code').description.includes('(current)'));
      assert.ok(!items.some((i: any) => i.label === 'Open Settings' || i.label === 'Copy Command'));
    });

    it('should pre-fill the custom input with a custom current value', async () => {
      (vscode.workspace as any)._config.set('openspec.terminal.agentCommand', 'my-agent run');
      win().showQuickPickResponse = 'Custom command…';
      win().showInputBoxResponse = null;
      await manager.configureAgentCommand();

      const custom = win().lastQuickPickItems.find((i: any) => i.label === 'Custom command…');
      assert.ok(custom.description.includes('(current)'));
      assert.strictEqual(win().lastInputBoxOptions.value, 'my-agent run');
    });

    it('should switch agents and reset an active session', async () => {
      (vscode.workspace as any)._config.set('openspec.terminal.agentCommand', 'agy -i "{command}"');
      manager.executeCommand('/openspec-propose');
      assert.strictEqual(manager.hasSessionLaunched, true);

      win().showQuickPickResponse = 'Codex CLI';
      const saved = await manager.configureAgentCommand();
      assert.strictEqual(saved, 'codex "{command}"');
      assert.strictEqual(manager.hasSessionLaunched, false);
      assert.ok(win().lastInformationMessage.includes('Codex CLI'));

      manager.executeCommand('/openspec-apply-change foo');
      assert.deepStrictEqual((manager.terminal as any).textsSent, [
        'agy -i "/openspec-propose"',
        'codex "/openspec-apply-change foo"',
      ]);
    });

    it('should warn when a workspace value shadows the saved user setting', async () => {
      const ws = vscode.workspace as any;
      const original = ws.getConfiguration;
      ws.getConfiguration = (section?: string) => ({
        ...original(section),
        get: () => 'workspace-agent "{command}"',
      });
      try {
        win().showQuickPickResponse = 'Claude Code';
        await manager.configureAgentCommand();
        assert.ok(win().lastWarningMessage.includes('workspace-agent'));
      } finally {
        ws.getConfiguration = original;
      }
    });
  });

  describe('Configured agent command execution and session reuse', () => {
    it('should launch agent template on fresh terminal and track active session', () => {
      (vscode.workspace as any)._config.set('openspec.terminal.agentCommand', 'agy -i "{command}"');

      assert.strictEqual(manager.hasSessionLaunched, false);
      const success = manager.executeCommand('/openspec-apply-change my-change');
      assert.strictEqual(success, true);
      assert.strictEqual(manager.hasSessionLaunched, true);

      const term = manager.terminal as any;
      assert.ok(term);
      assert.deepStrictEqual(term.textsSent, ['agy -i "/openspec-apply-change my-change"']);
    });

    it('should send raw slash command directly when reusing active session', () => {
      (vscode.workspace as any)._config.set('openspec.terminal.agentCommand', 'agy -i "{command}"');

      // First execution (fresh terminal)
      manager.executeCommand('/openspec-propose');
      // Second execution (reused session)
      manager.executeCommand('/openspec-apply-change my-change');

      const term = manager.terminal as any;
      assert.deepStrictEqual(term.textsSent, [
        'agy -i "/openspec-propose"',
        '/openspec-apply-change my-change',
      ]);
    });

    it('should reset session tracking via resetSession() so next command uses template', () => {
      (vscode.workspace as any)._config.set('openspec.terminal.agentCommand', 'claude "{command}"');

      manager.executeCommand('/openspec-propose');
      assert.strictEqual(manager.hasSessionLaunched, true);

      manager.resetSession();
      assert.strictEqual(manager.hasSessionLaunched, false);

      manager.executeCommand('/openspec-apply-change my-change');
      const term = manager.terminal as any;
      assert.deepStrictEqual(term.textsSent, [
        'claude "/openspec-propose"',
        'claude "/openspec-apply-change my-change"',
      ]);
    });

    it('should reset session when terminal is closed', () => {
      (vscode.workspace as any)._config.set('openspec.terminal.agentCommand', 'claude');

      manager.executeCommand('/openspec-propose');
      assert.strictEqual(manager.hasSessionLaunched, true);

      manager.terminal?.dispose();
      assert.strictEqual(manager.hasSessionLaunched, false);
      assert.strictEqual(manager.terminal, undefined);
    });

    it('should execute non-slash commands directly in shell without template wrapping', () => {
      const success = manager.executeCommand('openspec validate');
      assert.strictEqual(success, true);
      const term = manager.terminal as any;
      assert.deepStrictEqual(term.textsSent, ['openspec validate']);
      // Should not count as agent session launched
      assert.strictEqual(manager.hasSessionLaunched, false);
    });
  });
});
