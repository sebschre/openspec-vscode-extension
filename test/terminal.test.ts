import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { TerminalManager } from '../src/core/terminal';

describe('TerminalManager', () => {
  let manager: TerminalManager;

  beforeEach(() => {
    (vscode.window as any).terminalsCreated = [];
    manager = new TerminalManager();
  });

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

  it('should execute command directly in the dedicated terminal', () => {
    const success = manager.executeCommand('/opsx-apply dedicated-terminal-integration');
    assert.strictEqual(success, true);
    const term = manager.terminal as any;
    assert.ok(term);
    assert.deepStrictEqual(term.textsSent, ['/opsx-apply dedicated-terminal-integration']);
  });

  it('should reject empty commands without dispatching', () => {
    const success = manager.executeCommand('   ');
    assert.strictEqual(success, false);
    assert.strictEqual((vscode.window as any).terminalsCreated.length, 0);
  });
});
