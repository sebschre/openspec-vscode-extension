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

  /** Evaluates the `viewItem` part of a Schemas view `when` clause for a context value. */
  function showsFor(when: string, viewItem: string): boolean {
    const expr = when
      .replace(/view == [\w.]+ && /, '')
      .replace(/viewItem =~ \/((?:\\\/|[^/])+)\//g, (_m, re) => `new RegExp(${JSON.stringify(re)}).test(v)`)
      .replace(/viewItem == ([\w.]+)/g, (_m, value) => `v === ${JSON.stringify(value)}`);
    return new Function('v', `return ${expr};`)(viewItem);
  }

  function itemsShowing(command: string, group: string, values: string[]): string[] {
    const entry = pkg.contributes.menus['view/item/context'].find(
      (e: any) => e.command === command && String(e.group).startsWith(group)
    );
    assert.ok(entry, `${command} has no ${group} menu entry`);
    return values.filter((v) => showsFor(entry.when, v));
  }

  it('shows schema actions on the right Schemas view items', () => {
    const schemaValues = [
      'schema.project',
      'schema.project.default',
      'schema.project.fork',
      'schema.project.default.fork',
      'schema.user',
      'schema.package',
      'schema.package.default',
      'schema.package.unresolved',
    ];
    assert.deepStrictEqual(itemsShowing('openspec.schema.compareWithOriginal', 'inline', schemaValues), [
      'schema.project.fork',
      'schema.project.default.fork',
    ]);
    for (const command of ['openspec.schema.rename', 'openspec.schema.delete']) {
      assert.deepStrictEqual(itemsShowing(command, '3_manage', schemaValues), [
        'schema.project',
        'schema.project.default',
        'schema.project.fork',
        'schema.project.default.fork',
      ]);
    }
    assert.deepStrictEqual(itemsShowing('openspec.schema.setDefault', '1_schema', schemaValues), [
      'schema.project',
      'schema.project.fork',
      'schema.user',
      'schema.package',
      'schema.package.unresolved',
    ]);
    assert.deepStrictEqual(itemsShowing('openspec.schema.validate', 'inline', schemaValues), [
      'schema.project',
      'schema.project.default',
      'schema.project.fork',
      'schema.project.default.fork',
      'schema.user',
      'schema.package',
      'schema.package.default',
    ]);
    assert.deepStrictEqual(
      itemsShowing('openspec.schema.openDefinition', 'inline', ['schemaArtifact', 'schemaArtifact.editable', 'schemaApply', 'schemaIssue']),
      ['schemaArtifact', 'schemaArtifact.editable', 'schemaApply']
    );
  });

  it('switches inline change actions on completion and keeps the context menu for both', () => {
    const values = ['change', 'change.complete', 'changeArtifact', 'spec'];
    assert.deepStrictEqual(itemsShowing('openspec.archive', 'inline', values), ['change.complete']);
    assert.deepStrictEqual(itemsShowing('openspec.validate', 'inline', values), ['change']);
    for (const command of ['openspec.validate', 'openspec.archive', 'openspec.syncSpecs']) {
      assert.deepStrictEqual(itemsShowing(command, '1_actions', values), ['change', 'change.complete']);
    }
    assert.deepStrictEqual(itemsShowing('openspec.openSpecFile', 'inline', values), ['spec']);
    assert.deepStrictEqual(itemsShowing('openspec.openViewer', 'inline', values), ['change', 'change.complete', 'spec']);
  });

  it('contributes welcome views for empty Active Changes and Living Specs views', () => {
    const welcome = pkg.contributes.viewsWelcome as { view: string; contents: string; when: string }[];
    for (const view of ['openspec.views.changes', 'openspec.views.specs']) {
      const entries = welcome.filter((w) => w.view === view);
      assert.deepStrictEqual(entries.map((w) => w.when).sort(), ['!openspec.hasRoot', 'openspec.hasRoot']);
    }
    for (const entry of welcome) {
      for (const match of entry.contents.matchAll(/\(command:([\w.]+)\)/g)) {
        assert.ok(declared.has(match[1]), `welcome view links undeclared command ${match[1]}`);
      }
    }
    const changesEmpty = welcome.find((w) => w.view === 'openspec.views.changes' && w.when === 'openspec.hasRoot')!;
    assert.match(changesEmpty.contents, /\(command:openspec\.newChange\)/);
  });
});
