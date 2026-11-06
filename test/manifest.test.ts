import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { registerCommands } from '../src/commands';
import { OpenSpecStateStore } from '../src/core/store';
import { OpenSpecCliBridge } from '../src/core/cli';

const rootDir = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

describe('Extension manifest consistency', () => {
  const declared = new Set<string>(pkg.contributes.commands.map((c: { command: string }) => c.command));

  it('registers exactly the commands declared in package.json', () => {
    const registry = (vscode.commands as any)._registered as Map<string, Function>;
    registry.clear();
    const context = { subscriptions: [] as any[], extensionUri: vscode.Uri.file(rootDir) } as any;
    const outputChannel = vscode.window.createOutputChannel('test');
    registerCommands(context, new OpenSpecStateStore(rootDir), new OpenSpecCliBridge(rootDir), outputChannel as any);

    assert.deepStrictEqual([...registry.keys()].sort(), [...declared].sort());
  });

  it('only references declared commands and views in menus', () => {
    const viewIds = new Set<string>(pkg.contributes.views.openspec.map((v: { id: string }) => v.id));
    assert.ok(viewIds.has('openspec.views.schemas'));

    for (const [menu, entries] of Object.entries(pkg.contributes.menus) as [string, any[]][]) {
      for (const entry of entries) {
        assert.ok(declared.has(entry.command), `${menu} references undeclared command ${entry.command}`);
        for (const match of String(entry.when || '').matchAll(/view == ([\w.]+)/g)) {
          assert.ok(viewIds.has(match[1]), `${menu} references unknown view ${match[1]}`);
        }
      }
    }
  });
});
