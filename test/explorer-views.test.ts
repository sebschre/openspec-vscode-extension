import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../src/core/store';
import { OpenSpecParser } from '../src/core/parser';
import { OpenSpecCliBridge } from '../src/core/cli';
import { registerCommands } from '../src/commands';
import { artifactLabel, isArtifactPresent, resolveChangeArtifacts } from '../src/core/artifacts';
import {
  ArtifactItemElement,
  ChangeItemElement,
  ChangesTreeProvider,
  DeltaSpecItemElement,
  TaskGroupItemElement,
  TaskItemElement,
  deltaCounts,
} from '../src/views/tree/changesTreeProvider';
import {
  PendingChangeItemElement,
  PendingChangesItemElement,
  RequirementItemElement,
  ScenarioItemElement,
  SpecItemElement,
  SpecsTreeProvider,
} from '../src/views/tree/specsTreeProvider';
import { changesBadge, plural } from '../src/views/tree/treeUtils';

const LIVING_SPEC = `# Spec: spec-explorer

## Purpose

Explorer views.

## Requirements

### Requirement: Active Changes View
The extension SHALL list changes.

#### Scenario: One
- **WHEN** a
- **THEN** b

#### Scenario: Two
- **WHEN** c
- **THEN** d
`;

const DELTA_SPEC = `## ADDED Requirements

### Requirement: A
The extension SHALL a.

#### Scenario: a
- **WHEN** x
- **THEN** y

### Requirement: B
The extension SHALL b.

#### Scenario: b
- **WHEN** x
- **THEN** y

## MODIFIED Requirements

### Requirement: Active Changes View
The extension SHALL list changes.

#### Scenario: One
- **WHEN** a
- **THEN** b
`;

const TASKS = `# Tasks

## 1. Model

- [x] 1.1 Parse lines
- [ ] 1.2 Pending changes

## 2. Views

- [ ] 2.1 Render
`;

function write(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

describe('Explorer views UX', () => {
  let root: string;
  let userSchemas: string;
  let store: OpenSpecStateStore;

  before(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-explorer-'));
    userSchemas = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-user-schemas-'));
    const os_ = path.join(root, 'openspec');
    write(path.join(os_, 'config.yaml'), 'schema: spec-driven\n');
    write(path.join(os_, 'specs', 'spec-explorer', 'spec.md'), LIVING_SPEC);
    write(path.join(os_, 'specs', 'untouched', 'spec.md'), '# Spec\n\n## Purpose\n\nNothing.\n');

    // A spec-driven change with delta specs and tasks, but no design.
    const change = path.join(os_, 'changes', 'add-filters');
    write(path.join(change, '.openspec.yaml'), 'schema: spec-driven\n');
    write(path.join(change, 'proposal.md'), '# Proposal\n\n## Why\n\nBecause.\n');
    write(path.join(change, 'specs', 'spec-explorer', 'spec.md'), DELTA_SPEC);
    write(path.join(change, 'tasks.md'), TASKS);

    // A change on a custom project schema with two artifacts.
    write(
      path.join(os_, 'schemas', 'lean', 'schema.yaml'),
      [
        'name: lean',
        'version: 1',
        'artifacts:',
        '  - id: brief',
        '    generates: brief.md',
        '    description: Short brief',
        '    template: brief.md',
        '    requires: []',
        '  - id: tasks',
        '    generates: tasks.md',
        '    description: Tasks',
        '    template: tasks.md',
        '    requires: [brief]',
        '',
      ].join('\n')
    );
    write(path.join(os_, 'schemas', 'lean', 'templates', 'brief.md'), '# Brief\n');
    write(path.join(os_, 'schemas', 'lean', 'templates', 'tasks.md'), '# Tasks\n');
    const lean = path.join(os_, 'changes', 'lean-change');
    write(path.join(lean, '.openspec.yaml'), 'schema: lean\n');
    write(path.join(lean, 'brief.md'), '# Brief\n');

    store = new OpenSpecStateStore(root, { userSchemasDir: userSchemas });
    await store.refresh();
  });

  after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(userSchemas, { recursive: true, force: true });
  });

  describe('model', () => {
    it('records heading lines of requirements and scenarios', () => {
      const spec = OpenSpecParser.parseSpec(LIVING_SPEC, 'spec-explorer', '/x/spec.md');
      const lines = LIVING_SPEC.split('\n');
      const req = spec.requirements[0];
      assert.strictEqual(lines[req.lineIndex!], '### Requirement: Active Changes View');
      assert.deepStrictEqual(
        req.scenarios.map((s) => lines[s.lineIndex!]),
        ['#### Scenario: One', '#### Scenario: Two']
      );
    });

    it('lists the active changes that touch each living spec', () => {
      const specs = store.getState().specs;
      assert.deepStrictEqual(specs.find((s) => s.capability === 'spec-explorer')?.pendingChanges, ['add-filters']);
      assert.deepStrictEqual(specs.find((s) => s.capability === 'untouched')?.pendingChanges, []);
    });

    it('resolves artifacts from the schema, with glob-aware presence', () => {
      const change = store.getChange('add-filters')!;
      const artifacts = resolveChangeArtifacts(change, store.getSchema('spec-driven'));
      assert.deepStrictEqual(
        artifacts.map((a) => [a.id, a.present]),
        [
          ['proposal', true],
          ['specs', true],
          ['design', false],
          ['tasks', true],
        ]
      );
      assert.strictEqual(isArtifactPresent(change.changeDir, 'specs/**/*.txt'), false);
      assert.strictEqual(isArtifactPresent(change.changeDir, 'nothing/**/*.md'), false);

      const lean = store.getChange('lean-change')!;
      assert.deepStrictEqual(
        resolveChangeArtifacts(lean, store.getSchema('lean')).map((a) => [a.id, a.present]),
        [
          ['brief', true],
          ['tasks', false],
        ]
      );
      assert.strictEqual(lean.isComplete, false, 'tasks.md is still missing');
      assert.strictEqual(artifactLabel('user-stories'), 'User Stories');
      assert.strictEqual(artifactLabel('specs'), 'Specs (Delta)');
    });
  });

  it('judges completion by the artifacts of a custom schema', async () => {
    const lean = path.join(root, 'openspec', 'changes', 'lean-change');
    write(path.join(lean, 'tasks.md'), '# Tasks\n\n## 1. Do\n\n- [x] 1.1 Done\n');
    try {
      await store.refresh();
      assert.strictEqual(store.getChange('lean-change')!.isComplete, true);
      assert.strictEqual(store.getChange('add-filters')!.isComplete, false);
    } finally {
      fs.rmSync(path.join(lean, 'tasks.md'));
      await store.refresh();
    }
  });

  describe('Active Changes view', () => {
    let cached: ChangesTreeProvider | undefined;
    const provider = () => (cached ??= new ChangesTreeProvider(store));

    async function changeItem(name: string): Promise<ChangeItemElement> {
      const items = (await provider().getChildren()) as ChangeItemElement[];
      return items.find((i) => i.change.name === name)!;
    }

    async function artifacts(name: string): Promise<ArtifactItemElement[]> {
      return (await provider().getChildren(await changeItem(name))) as ArtifactItemElement[];
    }

    it('shows the next open task and an incomplete context value', async () => {
      const item = await changeItem('add-filters');
      assert.strictEqual(item.description, '1/3 (33%) · next: 1.2 Pending changes');
      assert.strictEqual(item.contextValue, 'change');
      assert.match((item.tooltip as vscode.MarkdownString).value, /Next: 1\.2 Pending changes/);
    });

    it('marks a complete change for inline archive', () => {
      const change = { ...store.getChange('add-filters')!, isComplete: true, tasks: [] };
      assert.strictEqual(new ChangeItemElement(change).contextValue, 'change.complete');
    });

    it('lists custom schema artifacts and leaves missing ones inert', async () => {
      const items = await artifacts('lean-change');
      assert.deepStrictEqual(items.map((i) => i.label), ['Brief', 'Tasks']);
      const [brief, tasks] = items;
      assert.strictEqual(brief.command?.command, 'vscode.open');
      assert.strictEqual(tasks.description, 'missing');
      assert.strictEqual(tasks.command, undefined);
      assert.strictEqual(tasks.contextValue, 'changeArtifact.missing');
      assert.match(String(tasks.tooltip), /Expected: tasks\.md/);
    });

    it('expands delta specs with operation counts', async () => {
      const specs = (await artifacts('add-filters')).find((a) => a.artifact.id === 'specs')!;
      assert.strictEqual(specs.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
      assert.strictEqual(specs.command, undefined, 'the specs folder is expanded, not opened');
      assert.strictEqual(specs.description, '1 capability');
      const [delta] = (await provider().getChildren(specs)) as DeltaSpecItemElement[];
      assert.strictEqual(delta.label, 'spec-explorer');
      assert.strictEqual(delta.description, '+2 ~1');
      assert.strictEqual(delta.command?.arguments?.[0].fsPath, delta.spec.filePath);
      assert.strictEqual(deltaCounts({ ...delta.spec, requirements: [] }), '');
    });

    it('expands tasks into groups and tasks that open at their line', async () => {
      const tasksItem = (await artifacts('add-filters')).find((a) => a.artifact.id === 'tasks')!;
      const groups = (await provider().getChildren(tasksItem)) as TaskGroupItemElement[];
      assert.deepStrictEqual(
        groups.map((g) => [g.label, g.description]),
        [
          ['Model', '1/2'],
          ['Views', '0/1'],
        ]
      );
      const tasks = (await provider().getChildren(groups[0])) as TaskItemElement[];
      assert.deepStrictEqual(tasks.map((t) => t.contextValue), ['task.completed', 'task']);
      const [uri, options] = tasks[1].command!.arguments!;
      assert.ok(uri.fsPath.endsWith('tasks.md'));
      assert.strictEqual(options.selection.start.line, TASKS.split('\n').indexOf('- [ ] 1.2 Pending changes'));
    });

    it('returns no root items for empty states so welcome views show', async () => {
      const empty = new OpenSpecStateStore(path.join(root, 'missing'));
      await empty.refresh();
      assert.deepStrictEqual(await new ChangesTreeProvider(empty).getChildren(), []);
      assert.deepStrictEqual(await new SpecsTreeProvider(empty).getChildren(), []);
    });

    it('builds a badge only when there are changes', () => {
      assert.strictEqual(changesBadge(0), undefined);
      assert.deepStrictEqual(changesBadge(1), { value: 1, tooltip: '1 active change' });
      assert.strictEqual(changesBadge(3)?.tooltip, '3 active changes');
    });
  });

  describe('Living Specs view', () => {
    let cached: SpecsTreeProvider | undefined;
    const provider = () => (cached ??= new SpecsTreeProvider(store));

    async function specItem(capability: string): Promise<SpecItemElement> {
      const items = (await provider().getChildren()) as SpecItemElement[];
      return items.find((i) => i.spec.capability === capability)!;
    }

    it('marks specs with pending changes and lists them', async () => {
      const item = await specItem('spec-explorer');
      assert.strictEqual(item.description, '1 req · 1 pending');
      const children = await provider().getChildren(item);
      assert.ok(children![0] instanceof PendingChangesItemElement);
      const [pending] = (await provider().getChildren(children![0])) as PendingChangeItemElement[];
      assert.strictEqual(pending.label, 'add-filters');
      assert.deepStrictEqual(pending.command, {
        command: 'openspec.openViewer',
        title: 'Open Change',
        arguments: ['add-filters'],
      });

      const untouched = await specItem('untouched');
      assert.strictEqual(untouched.description, '0 reqs');
      assert.deepStrictEqual(await provider().getChildren(untouched), []);
    });

    it('opens requirements and scenarios at their heading', async () => {
      const item = await specItem('spec-explorer');
      const req = ((await provider().getChildren(item)) as any[]).find(
        (c) => c instanceof RequirementItemElement
      ) as RequirementItemElement;
      assert.strictEqual(req.description, '2 scenarios');
      const lines = LIVING_SPEC.split('\n');
      assert.strictEqual(req.command?.arguments?.[1].selection.start.line, lines.indexOf('### Requirement: Active Changes View'));

      const scenarios = (await provider().getChildren(req)) as ScenarioItemElement[];
      assert.strictEqual(scenarios[1].command?.arguments?.[0].fsPath, item.spec.filePath);
      assert.strictEqual(scenarios[1].command?.arguments?.[1].selection.start.line, lines.indexOf('#### Scenario: Two'));
      assert.match((scenarios[0].tooltip as vscode.MarkdownString).value, /\*\*WHEN\*\* a/);
    });

    it('uses singular and plural labels', () => {
      assert.strictEqual(plural(1, 'scenario'), '1 scenario');
      assert.strictEqual(plural(0, 'scenario'), '0 scenarios');
      assert.strictEqual(plural(2, 'capability', 'capabilities'), '2 capabilities');
    });

    it('opens the spec file through openspec.openSpecFile', async () => {
      const registry = (vscode.commands as any)._registered as Map<string, Function>;
      registry.clear();
      const context = { subscriptions: [] as any[], extensionUri: vscode.Uri.file(root) } as any;
      registerCommands(context, store, new OpenSpecCliBridge(root), vscode.window.createOutputChannel('t') as any);
      const executed = (vscode.commands as any).commandsExecuted as { id: string; args: any[] }[];
      executed.length = 0;

      const item = await specItem('spec-explorer');
      await vscode.commands.executeCommand('openspec.openSpecFile', item);
      const open = executed.find((e) => e.id === 'vscode.open');
      assert.strictEqual(open?.args[0].fsPath, item.spec.filePath);
    });
  });
});
