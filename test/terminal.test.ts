import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { TerminalManager, resolveAgentCommand } from '../src/core/terminal';

describe('TerminalManager & Agent Command Resolution', () => {
  let manager: TerminalManager;

  beforeEach(() => {
    (vscode.window as any).terminalsCreated = [];
    (vscode.window as any).lastInformationMessage = undefined;
    (vscode.window as any).lastInformationActions = [];
    (vscode.window as any).showInformationMessageResponse = undefined;
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
    it('should abort execution and show guidance notification when agentCommand is unset', async () => {
      // Configuration is unset by default
      const success = manager.executeCommand('/openspec-apply-change test-change');
      assert.strictEqual(success, false);
      assert.strictEqual((vscode.window as any).terminalsCreated.length, 0);
      assert.ok(
        (vscode.window as any).lastInformationMessage.includes('openspec.terminal.agentCommand')
      );
      assert.deepStrictEqual((vscode.window as any).lastInformationActions, [
        'Configure Setting',
        'Copy Command',
      ]);
    });

    it('should execute openSettings command when Configure Setting is clicked', async () => {
      (vscode.window as any).showInformationMessageResponse = 'Configure Setting';
      await manager.handleUnsetAgentCommand('/openspec-propose');

      const executed = (vscode.commands as any).commandsExecuted.find(
        (c: any) => c.id === 'workbench.action.openSettings'
      );
      assert.ok(executed);
      assert.deepStrictEqual(executed.args, ['openspec.terminal.agentCommand']);
    });

    it('should write command to clipboard when Copy Command is clicked', async () => {
      (vscode.window as any).showInformationMessageResponse = 'Copy Command';
      await manager.handleUnsetAgentCommand('/openspec-apply-change my-change');

      assert.strictEqual(
        (vscode.env.clipboard as any).lastWrittenText,
        '/openspec-apply-change my-change'
      );
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
