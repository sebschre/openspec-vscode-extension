import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import {
  LINEAGE_FILE,
  compareSchemaDirs,
  defaultAfterDelete,
  findApplyLine,
  findArtifactLine,
  findChangesNamingSchema,
  findIssueLine,
  forkSchema,
  loadSchema,
  readDefaultSchema,
  readLineage,
  renameSchema,
} from '../src/core/schemas';
import { OpenSpecStateStore } from '../src/core/store';
import { OpenSpecCliBridge } from '../src/core/cli';
import * as vscode from 'vscode';
import { forkDefaultChoices, registerSchemaCommands } from '../src/commands/schemaCommands';
import { SchemaItem, SchemasTreeProvider } from '../src/views/tree/schemasTreeProvider';
import { SchemaDiagnostics } from '../src/views/diagnostics/schemaDiagnostics';

const SCHEMA_YAML = `name: base
version: 1
description: Base flow
artifacts:
  - id: proposal
    generates: proposal.md
    description: Why
    template: proposal.md
    requires: []
  - id: "tasks"
    generates: tasks.md
    description: Checklist
    template: tasks.md
    requires:
      - proposal
apply:
  requires: [tasks]
  tracks: tasks.md
`;

function writeSchema(dir: string, content = SCHEMA_YAML) {
  fs.mkdirSync(path.join(dir, 'templates'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'schema.yaml'), content);
  fs.writeFileSync(path.join(dir, 'templates', 'proposal.md'), '## Why\n');
  fs.writeFileSync(path.join(dir, 'templates', 'tasks.md'), '## 1. Tasks\n');
}

function writeChange(workspace: string, name: string, metadata?: string, archived = false) {
  const dir = archived
    ? path.join(workspace, 'openspec', 'changes', 'archive', name)
    : path.join(workspace, 'openspec', 'changes', name);
  fs.mkdirSync(dir, { recursive: true });
  if (metadata !== undefined) fs.writeFileSync(path.join(dir, '.openspec.yaml'), metadata);
  return dir;
}

let tmp: string;
let workspace: string;
let pkgDir: string;
let projectSchemas: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-forks-'));
  workspace = path.join(tmp, 'ws');
  projectSchemas = path.join(workspace, 'openspec', 'schemas');
  pkgDir = path.join(tmp, 'pkg', 'spec-driven');
  writeSchema(pkgDir, SCHEMA_YAML.replace('name: base', 'name: spec-driven'));
  fs.mkdirSync(path.join(workspace, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'openspec', 'config.yaml'), '# keep me\nschema: spec-driven\n');
});

afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('Fork lineage', () => {
  it('records the source next to the fork and reads it back', () => {
    const dest = forkSchema(pkgDir, workspace, 'team-flow', { schema: 'spec-driven', source: 'package', version: 1 }, new Date('2026-11-07T10:00:00Z'));
    const text = fs.readFileSync(path.join(dest, LINEAGE_FILE), 'utf8');
    assert.match(text, /^# Written by OpenSpec for VS Code/);
    assert.deepStrictEqual(readLineage(dest), { schema: 'spec-driven', source: 'package', version: 1, forkedAt: '2026-11-07' });
    // Lineage never leaks into schema.yaml.
    assert.strictEqual((yaml.load(fs.readFileSync(path.join(dest, 'schema.yaml'), 'utf8')) as any).forkedFrom, undefined);
    assert.deepStrictEqual(loadSchema({ name: 'team-flow', source: 'project', path: dest }).forkedFrom?.schema, 'spec-driven');
  });

  it('replaces a lineage file copied from the source', () => {
    const first = forkSchema(pkgDir, workspace, 'first', { schema: 'spec-driven', source: 'package', version: 1 });
    const second = forkSchema(first, workspace, 'second', { schema: 'first', source: 'project', version: 1 });
    assert.strictEqual(readLineage(second)?.schema, 'first');
    const third = forkSchema(first, workspace, 'third');
    assert.strictEqual(readLineage(third), undefined);
  });

  it('ignores malformed lineage files', () => {
    const dest = forkSchema(pkgDir, workspace, 'team-flow');
    fs.writeFileSync(path.join(dest, LINEAGE_FILE), 'schema: x\nsource: somewhere\n');
    assert.strictEqual(readLineage(dest), undefined);
  });
});

describe('Comparing a fork with its source', () => {
  it('reports changed, added and removed files but not the renamed name line', () => {
    const dest = forkSchema(pkgDir, workspace, 'team-flow', { schema: 'spec-driven', source: 'package' });
    assert.deepStrictEqual(compareSchemaDirs(dest, pkgDir), []);

    fs.appendFileSync(path.join(dest, 'templates', 'tasks.md'), '- [ ] more\n');
    fs.writeFileSync(path.join(dest, 'templates', 'research.md'), '## Research\n');
    fs.rmSync(path.join(dest, 'templates', 'proposal.md'));
    fs.writeFileSync(path.join(dest, 'schema.yaml'), fs.readFileSync(path.join(dest, 'schema.yaml'), 'utf8').replace('Why', 'Motivation'));
    assert.deepStrictEqual(compareSchemaDirs(dest, pkgDir), [
      { path: 'schema.yaml', status: 'changed' },
      { path: 'templates/proposal.md', status: 'removed' },
      { path: 'templates/research.md', status: 'added' },
      { path: 'templates/tasks.md', status: 'changed' },
    ]);
  });
});

describe('Locating entries in schema.yaml', () => {
  it('finds artifacts with and without quotes, and the apply phase', () => {
    assert.strictEqual(findArtifactLine(SCHEMA_YAML, 'proposal'), 4);
    assert.strictEqual(findArtifactLine(SCHEMA_YAML, 'tasks'), 9);
    assert.strictEqual(findArtifactLine(SCHEMA_YAML, 'task'), -1);
    assert.strictEqual(findApplyLine(SCHEMA_YAML), 15);
    assert.strictEqual(findApplyLine('name: x\n'), -1);
  });

  it('tags artifact and apply issues so they can be placed', () => {
    const dir = path.join(projectSchemas, 'broken');
    writeSchema(dir, SCHEMA_YAML.replace('requires: []', 'requires: [ghost]').replace('requires: [tasks]', 'requires: [nope]'));
    const schema = loadSchema({ name: 'broken', source: 'project', path: dir });
    const unknown = schema.issues.find((i) => /unknown artifact "ghost"/.test(i.message))!;
    const apply = schema.issues.find((i) => /apply requires/.test(i.message))!;
    assert.strictEqual(unknown.artifactId, 'proposal');
    assert.strictEqual(apply.apply, true);
    const text = fs.readFileSync(path.join(dir, 'schema.yaml'), 'utf8');
    assert.strictEqual(findIssueLine(text, unknown), 4);
    assert.strictEqual(findIssueLine(text, apply), 15);
    assert.strictEqual(findIssueLine(text, { level: 'error', message: 'x' }), 0);
  });
});

describe('Renaming and deleting project schemas', () => {
  it('renames the schema and every reference to it, leaving archives and default-following changes alone', () => {
    const dest = forkSchema(pkgDir, workspace, 'team-flow', { schema: 'spec-driven', source: 'package' });
    forkSchema(dest, workspace, 'child', { schema: 'team-flow', source: 'project' });
    fs.writeFileSync(path.join(workspace, 'openspec', 'config.yaml'), '# keep me\nschema: team-flow\n');
    writeChange(workspace, 'named', 'schema: team-flow\ncreated: 2026-11-07\n');
    writeChange(workspace, 'other', 'schema: spec-driven\n');
    writeChange(workspace, 'no-meta');
    const archived = writeChange(workspace, 'old', 'schema: team-flow\n', true);

    assert.deepStrictEqual(findChangesNamingSchema(workspace, 'team-flow').map((c) => c.name), ['named']);
    const result = renameSchema(workspace, 'team-flow', 'lean-flow');

    assert.deepStrictEqual(result, {
      dest: path.join(projectSchemas, 'lean-flow'),
      defaultUpdated: true,
      updatedChanges: ['named'],
    });
    assert.ok(!fs.existsSync(path.join(projectSchemas, 'team-flow')));
    assert.match(fs.readFileSync(path.join(result.dest, 'schema.yaml'), 'utf8'), /^name: lean-flow$/m);
    assert.strictEqual(fs.readFileSync(path.join(workspace, 'openspec', 'config.yaml'), 'utf8'), '# keep me\nschema: lean-flow\n');
    assert.strictEqual(
      fs.readFileSync(path.join(workspace, 'openspec', 'changes', 'named', '.openspec.yaml'), 'utf8'),
      'schema: lean-flow\ncreated: 2026-11-07\n'
    );
    assert.strictEqual(fs.readFileSync(path.join(archived, '.openspec.yaml'), 'utf8'), 'schema: team-flow\n');
    assert.ok(!fs.existsSync(path.join(workspace, 'openspec', 'changes', 'no-meta', '.openspec.yaml')));
    assert.strictEqual(readLineage(path.join(projectSchemas, 'child'))?.schema, 'lean-flow');
    // The renamed fork keeps its own lineage.
    assert.strictEqual(readLineage(result.dest)?.schema, 'spec-driven');
  });

  it('refuses to rename onto an existing schema or to an invalid name', () => {
    forkSchema(pkgDir, workspace, 'a');
    forkSchema(pkgDir, workspace, 'b');
    assert.throws(() => renameSchema(workspace, 'a', 'b'), /already exists/);
    assert.throws(() => renameSchema(workspace, 'a', 'Not Kebab'), /kebab-case/);
    assert.throws(() => renameSchema(workspace, 'missing', 'c'), /No project schema/);
    assert.strictEqual(readDefaultSchema(workspace), 'spec-driven');
  });

  it('picks a working default after deleting the default schema', () => {
    const base = { name: 'team-flow', shadows: [] as any[] };
    assert.strictEqual(defaultAfterDelete({ ...base, forkedFrom: { schema: 'shared', source: 'user', available: true } }), 'shared');
    assert.strictEqual(defaultAfterDelete({ ...base, forkedFrom: { schema: 'gone', source: 'user', available: false } }), 'spec-driven');
    assert.strictEqual(defaultAfterDelete(base), 'spec-driven');
    assert.strictEqual(defaultAfterDelete({ ...base, shadows: ['user'] }), 'team-flow');
  });
});

describe('Resolving fork sources in the store', () => {
  function makeStore(locations = [{ name: 'spec-driven', source: 'package' as const, path: pkgDir }]) {
    return new OpenSpecStateStore(workspace, {
      userSchemasDir: path.join(tmp, 'user'),
      schemaDiscovery: async () => locations,
    });
  }

  it('marks the source as available and flags newer source versions', async () => {
    forkSchema(pkgDir, workspace, 'team-flow', { schema: 'spec-driven', source: 'package', version: 1 });
    const store = makeStore();
    let fork = (await store.refresh()).schemas.find((s) => s.name === 'team-flow')!;
    assert.strictEqual(fork.forkedFrom?.available, true);
    assert.strictEqual(fork.forkedFrom?.sourcePath, pkgDir);
    assert.strictEqual(fork.forkedFrom?.updated, false);

    fs.writeFileSync(path.join(pkgDir, 'schema.yaml'), fs.readFileSync(path.join(pkgDir, 'schema.yaml'), 'utf8').replace('version: 1', 'version: 2'));
    fork = (await store.refresh()).schemas.find((s) => s.name === 'team-flow')!;
    assert.strictEqual(fork.forkedFrom?.updated, true);
    assert.strictEqual(fork.forkedFrom?.sourceVersion, 2);
  });

  it('finds a shadowed source for a fork named like it', async () => {
    forkSchema(pkgDir, workspace, 'spec-driven', { schema: 'spec-driven', source: 'package', version: 1 });
    const fork = (await makeStore().refresh()).schemas.find((s) => s.name === 'spec-driven')!;
    assert.strictEqual(fork.source, 'project');
    assert.strictEqual(fork.forkedFrom?.sourcePath, pkgDir);
  });

  it('reports a source that no longer resolves', async () => {
    forkSchema(pkgDir, workspace, 'team-flow', { schema: 'spec-driven', source: 'package', version: 1 });
    const fork = (await makeStore([]).refresh()).schemas.find((s) => s.name === 'team-flow')!;
    assert.strictEqual(fork.forkedFrom?.available, false);
    assert.strictEqual(fork.forkedFrom?.sourcePath, undefined);
  });

  it('does not resurrect deleted project schemas from the cached CLI result', async () => {
    const dest = forkSchema(pkgDir, workspace, 'team-flow');
    const store = makeStore([
      { name: 'spec-driven', source: 'package', path: pkgDir },
      { name: 'team-flow', source: 'project', path: dest } as any,
    ]);
    await store.refresh();
    fs.rmSync(dest, { recursive: true });
    assert.ok(!(await store.refresh()).schemas.some((s) => s.name === 'team-flow'));
  });

  it('keeps shadowed locations from `schema which --all --json`', () => {
    const stdout = JSON.stringify([
      { name: 'spec-driven', source: 'project', path: '/p', shadows: [{ source: 'package', path: '/pkg' }, { source: 'x', path: '/y' }] },
    ]);
    assert.deepStrictEqual(OpenSpecCliBridge.parseSchemaList(stdout), [
      { name: 'spec-driven', source: 'project', path: '/p' },
      { name: 'spec-driven', source: 'package', path: '/pkg' },
    ]);
  });
});

describe('Schema fork commands, tree and diagnostics', () => {
  const win = vscode.window as any;
  const ws = vscode.workspace as any;
  const cmds = vscode.commands as any;
  let saved: Record<string, any>;
  let revealed: string[];
  let store: OpenSpecStateStore;

  beforeEach(async () => {
    saved = {
      showInputBox: win.showInputBox,
      showQuickPick: win.showQuickPick,
      showWarningMessage: win.showWarningMessage,
      showInformationMessage: win.showInformationMessage,
      showTextDocument: win.showTextDocument,
      openTextDocument: ws.openTextDocument,
      fsDelete: ws.fs.delete,
    };
    revealed = [];
    cmds._registered.clear();
    cmds.commandsExecuted.length = 0;
    store = new OpenSpecStateStore(workspace, {
      userSchemasDir: path.join(tmp, 'user'),
      schemaDiscovery: async () => [{ name: 'spec-driven', source: 'package', path: pkgDir }],
    });
    await store.refresh();
    const context = { subscriptions: [] as any[] } as any;
    registerSchemaCommands(context, store, new OpenSpecCliBridge(workspace), vscode.window.createOutputChannel('t') as any, {
      revealSchema: (name) => {
        revealed.push(name);
      },
    });
  });

  afterEach(() => {
    win.showInputBox = saved.showInputBox;
    win.showQuickPick = saved.showQuickPick;
    win.showWarningMessage = saved.showWarningMessage;
    win.showInformationMessage = saved.showInformationMessage;
    win.showTextDocument = saved.showTextDocument;
    ws.openTextDocument = saved.openTextDocument;
    ws.fs.delete = saved.fsDelete;
  });

  const run = (id: string, ...args: any[]) => cmds._registered.get(id)(...args);
  const config = () => fs.readFileSync(path.join(workspace, 'openspec', 'config.yaml'), 'utf8');

  it('orders the default choice by whether the source is the current default', () => {
    assert.deepStrictEqual(forkDefaultChoices(true, 'team-flow', 'spec-driven').map((c) => c.makeDefault), [true, false]);
    assert.deepStrictEqual(forkDefaultChoices(false, 'team-flow', 'spec-driven').map((c) => c.makeDefault), [false, true]);
    assert.match(forkDefaultChoices(true, 'team-flow', 'spec-driven')[0].label, /Use "team-flow" for new changes/);
  });

  it('forks, sets the default within the flow, and reveals the new schema', async () => {
    const asked: string[] = [];
    win.showInputBox = async (opt: any) => {
      asked.push(opt.validateInput('spec-driven'), opt.validateInput('Bad'));
      return 'team-flow';
    };
    let infoActions: string[] = [];
    win.showInformationMessage = async (_m: string, ...actions: string[]) => {
      infoActions = actions;
      return undefined;
    };
    await run('openspec.schema.fork', 'spec-driven');

    assert.match(asked[0], /built-in schema is already named "spec-driven"/);
    assert.match(asked[1], /kebab-case/);
    assert.deepStrictEqual(readLineage(path.join(projectSchemas, 'team-flow'))?.schema, 'spec-driven');
    assert.strictEqual(config(), '# keep me\nschema: team-flow\n');
    assert.deepStrictEqual(revealed, ['team-flow']);
    assert.deepStrictEqual(infoActions, ['Open schema.yaml']);
  });

  it('writes nothing when the default question is dismissed', async () => {
    win.showInputBox = async () => 'team-flow';
    win.showQuickPick = async () => undefined;
    await run('openspec.schema.fork', 'spec-driven');
    assert.ok(!fs.existsSync(path.join(projectSchemas, 'team-flow')));
    assert.strictEqual(config(), '# keep me\nschema: spec-driven\n');
  });

  it('shows lineage in the tree with stable ids and parents', async () => {
    forkSchema(pkgDir, workspace, 'team-flow', { schema: 'spec-driven', source: 'package', version: 1 }, new Date('2026-11-07'));
    fs.writeFileSync(path.join(pkgDir, 'schema.yaml'), SCHEMA_YAML.replace('name: base', 'name: spec-driven').replace('version: 1', 'version: 2'));
    await store.refresh();
    const provider = new SchemasTreeProvider(store);
    const roots = (await provider.getChildren()) as SchemaItem[];
    const fork = roots.find((r) => r.schema.name === 'team-flow')!;
    assert.strictEqual(fork.id, 'schema:team-flow');
    assert.strictEqual(fork.contextValue, 'schema.project.fork');
    assert.match(String(fork.description), /fork of spec-driven \(source updated\)/);
    assert.match((fork.tooltip as any).value, /Forked from \*\*spec-driven\*\* \(built-in, v1\) on 2026-11-07\. The source is now at v2\./);
    assert.strictEqual(roots.find((r) => r.schema.name === 'spec-driven')!.contextValue, 'schema.package.default');

    const [child] = (await provider.getChildren(fork)) as any[];
    assert.strictEqual(provider.getParent(child)?.id, 'schema:team-flow');
    assert.strictEqual(provider.getParent(fork), undefined);
    assert.strictEqual(provider.itemFor('team-flow')?.id, 'schema:team-flow');
  });

  it('compares a fork with its source', async () => {
    const dest = forkSchema(pkgDir, workspace, 'team-flow', { schema: 'spec-driven', source: 'package', version: 1 });
    await store.refresh();
    let info = '';
    win.showInformationMessage = async (m: string) => {
      info = m;
      return undefined;
    };
    await run('openspec.schema.compareWithOriginal', 'team-flow');
    assert.match(info, /no changes compared with "spec-driven" \(built-in\)/);

    fs.writeFileSync(path.join(dest, 'templates', 'research.md'), '## Research\n');
    let offered: any[] = [];
    win.showQuickPick = async (items: any[]) => {
      offered = items;
      return items[0];
    };
    await run('openspec.schema.compareWithOriginal', 'team-flow');
    assert.deepStrictEqual(offered.map((i) => [i.label, i.description]), [['templates/research.md', 'added']]);
    const diff = cmds.commandsExecuted.find((c: any) => c.id === 'vscode.diff');
    assert.strictEqual(diff.args[0].scheme, 'openspec-empty');
    assert.strictEqual(diff.args[1].fsPath, path.join(dest, 'templates', 'research.md'));
  });

  it('tells the user when the source is gone', async () => {
    forkSchema(pkgDir, workspace, 'team-flow', { schema: 'shared', source: 'user' });
    await store.refresh();
    let warning = '';
    win.showWarningMessage = async (m: string) => {
      warning = m;
      return undefined;
    };
    await run('openspec.schema.compareWithOriginal', 'team-flow');
    assert.match(warning, /source "shared" \(user\) of "team-flow" can no longer be found/);
  });

  it('deletes to the trash and points the default back at the source', async () => {
    forkSchema(pkgDir, workspace, 'team-flow', { schema: 'spec-driven', source: 'package' });
    fs.writeFileSync(path.join(workspace, 'openspec', 'config.yaml'), 'schema: team-flow\n');
    writeChange(workspace, 'named', 'schema: team-flow\n');
    await store.refresh();

    let detail = '';
    win.showWarningMessage = async (_m: string, opts: any, action: string) => {
      detail = opts.detail;
      return action;
    };
    const calls: any[] = [];
    ws.fs.delete = async (uri: any, options: any) => {
      calls.push(options);
      fs.rmSync(uri.fsPath, { recursive: true });
    };
    await run('openspec.schema.delete', 'team-flow');

    assert.match(detail, /New changes will use "spec-driven" instead/);
    assert.match(detail, /will not find their schema until you change it: named/);
    assert.deepStrictEqual(calls, [{ recursive: true, useTrash: true }]);
    assert.strictEqual(config(), 'schema: spec-driven\n');
    assert.ok(!store.getSchema('team-flow'));
  });

  it('renames a schema and reveals it under its new name', async () => {
    forkSchema(pkgDir, workspace, 'team-flow');
    await store.refresh();
    win.showInputBox = async (opt: any) => {
      assert.strictEqual(opt.validateInput('team-flow'), undefined);
      return 'lean-flow';
    };
    await run('openspec.schema.rename', 'team-flow');
    assert.ok(store.getSchema('lean-flow'));
    assert.deepStrictEqual(revealed, ['lean-flow']);
  });

  it('opens an artifact definition at its line', async () => {
    const dest = forkSchema(pkgDir, workspace, 'team-flow');
    await store.refresh();
    const schema = store.getSchema('team-flow')!;
    ws.openTextDocument = async () => ({ getText: () => fs.readFileSync(path.join(dest, 'schema.yaml'), 'utf8') });
    const selections: any[] = [];
    win.showTextDocument = async (_doc: any, opts: any) => selections.push(opts.selection.start.line);
    await run('openspec.schema.openDefinition', { schema, artifact: schema.artifacts[1] });
    await run('openspec.schema.openDefinition', { schema });
    await run('openspec.schema.openDefinition', { schema, artifact: { id: 'missing' } });
    assert.deepStrictEqual(selections, [9, 15, 0]);
  });

  it('reports problems of project and user schemas in the Problems panel', async () => {
    const dest = forkSchema(pkgDir, workspace, 'team-flow');
    fs.writeFileSync(
      path.join(dest, 'schema.yaml'),
      fs.readFileSync(path.join(dest, 'schema.yaml'), 'utf8').replace('requires: []', 'requires: [ghost]')
    );
    // A broken built-in is not the user's to fix.
    fs.rmSync(path.join(pkgDir, 'templates', 'tasks.md'));
    await store.refresh();

    const collection = new (vscode as any).MockDiagnosticCollection('t');
    const diagnostics = new SchemaDiagnostics(store, collection);
    const entries = collection.entries.get(path.join(dest, 'schema.yaml'));
    assert.strictEqual(collection.entries.size, 1);
    assert.strictEqual(entries.length, 1);
    assert.match(entries[0].message, /requires unknown artifact "ghost"/);
    assert.strictEqual(entries[0].range.start.line, 4);
    assert.strictEqual(entries[0].range.end.character, '  - id: proposal'.length);
    assert.strictEqual(entries[0].severity, (vscode as any).DiagnosticSeverity.Error);

    fs.rmSync(dest, { recursive: true });
    await store.refresh();
    assert.strictEqual(collection.entries.size, 0);
    diagnostics.dispose();
    assert.ok(collection.disposed);
  });
});
