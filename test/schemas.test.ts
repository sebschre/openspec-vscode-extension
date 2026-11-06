import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import {
  addArtifact,
  findDependencyCycle,
  forkSchema,
  getUserSchemasDir,
  listSchemaDirs,
  loadSchema,
  mergeSchemaLocations,
  readDefaultSchema,
  removeArtifact,
  setArtifactRequires,
  writeDefaultSchema,
} from '../src/core/schemas';
import { OpenSpecStateStore } from '../src/core/store';
import { OpenSpecCliBridge } from '../src/core/cli';
import {
  SchemaArtifactItem,
  SchemaItem,
  SchemasTreeProvider,
  SchemaIssueItem,
} from '../src/views/tree/schemasTreeProvider';
import { SpecViewerPanel } from '../src/views/webview/specViewerPanel';

const SCHEMA_YAML = `name: base
version: 1
description: Base flow
artifacts:
  - id: proposal
    generates: proposal.md
    description: Why
    template: proposal.md
    instruction: |
      Write the proposal.
      Keep it short.
    requires: []
  - id: tasks
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

function readYaml(dir: string): any {
  return yaml.load(fs.readFileSync(path.join(dir, 'schema.yaml'), 'utf8'));
}

describe('Schema discovery helpers', () => {
  it('resolves the user schema directory like the OpenSpec CLI', () => {
    assert.strictEqual(
      getUserSchemasDir({ XDG_DATA_HOME: '/xdg' }, 'linux', '/home/me'),
      '/xdg/openspec/schemas'
    );
    assert.strictEqual(getUserSchemasDir({}, 'darwin', '/Users/me'), '/Users/me/.local/share/openspec/schemas');
    assert.strictEqual(
      getUserSchemasDir({ LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' }, 'win32', 'C:\\Users\\me'),
      'C:\\Users\\me\\AppData\\Local\\openspec\\schemas'
    );
  });

  it('lets project schemas shadow user and built-in schemas of the same name', () => {
    const merged = mergeSchemaLocations([
      { name: 'spec-driven', source: 'package', path: '/pkg/spec-driven' },
      { name: 'spec-driven', source: 'project', path: '/proj/spec-driven' },
      { name: 'lean', source: 'user', path: '/user/lean' },
    ]);
    assert.deepStrictEqual(
      merged.map((m) => [m.name, m.source, m.shadows]),
      [
        ['spec-driven', 'project', ['package']],
        ['lean', 'user', []],
      ]
    );
  });

  it('detects dependency cycles', () => {
    assert.strictEqual(findDependencyCycle([{ id: 'a', requires: [] }, { id: 'b', requires: ['a'] }]), undefined);
    assert.deepStrictEqual(
      findDependencyCycle([
        { id: 'a', requires: ['c'] },
        { id: 'b', requires: ['a'] },
        { id: 'c', requires: ['b'] },
      ]),
      ['a', 'c', 'b', 'a']
    );
  });
});

describe('Schema loading and editing', () => {
  let tmp: string;
  let workspace: string;
  let schemaDir: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schemas-'));
    workspace = path.join(tmp, 'ws');
    schemaDir = path.join(workspace, 'openspec', 'schemas', 'base');
    writeSchema(schemaDir);
    fs.writeFileSync(path.join(workspace, 'openspec', 'config.yaml'), '# comment\nschema: spec-driven\n\n# other\n');
  });

  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('loads artifacts, templates, and the apply phase', () => {
    const [loc] = listSchemaDirs(path.join(workspace, 'openspec', 'schemas'), 'project');
    const schema = loadSchema(loc);
    assert.strictEqual(schema.version, 1);
    assert.deepStrictEqual(schema.artifacts.map((a) => a.id), ['proposal', 'tasks']);
    assert.deepStrictEqual(schema.artifacts[1].requires, ['proposal']);
    assert.ok(schema.artifacts.every((a) => a.templateExists));
    assert.deepStrictEqual(schema.apply?.requires, ['tasks']);
    assert.deepStrictEqual(schema.issues, []);
  });

  it('reports structural problems instead of throwing', () => {
    fs.rmSync(path.join(schemaDir, 'templates', 'tasks.md'));
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      SCHEMA_YAML.replace('requires: []', 'requires: [tasks]').replace('requires: [tasks]\n  tracks', 'requires: [ghost]\n  tracks')
    );
    const schema = loadSchema({ name: 'base', source: 'project', path: schemaDir });
    const messages = schema.issues.map((i) => i.message).join('\n');
    assert.match(messages, /Cyclic dependency/);
    assert.match(messages, /templates\/tasks\.md/);
    assert.match(messages, /apply requires unknown artifact "ghost"/);

    fs.writeFileSync(path.join(schemaDir, 'schema.yaml'), 'artifacts: [');
    const broken = loadSchema({ name: 'base', source: 'project', path: schemaDir });
    assert.match(broken.issues[0].message, /Cannot parse/);
  });

  it('reads and writes the project default schema without losing comments', () => {
    assert.strictEqual(readDefaultSchema(workspace), 'spec-driven');
    writeDefaultSchema(workspace, 'base');
    const content = fs.readFileSync(path.join(workspace, 'openspec', 'config.yaml'), 'utf8');
    assert.strictEqual(content, '# comment\nschema: base\n\n# other\n');
    assert.strictEqual(readDefaultSchema(workspace), 'base');
  });

  it('forks a schema into the project with a new name', () => {
    const userDir = path.join(tmp, 'user', 'shared');
    writeSchema(userDir, SCHEMA_YAML.replace('name: base', 'name: shared'));
    const dest = forkSchema(userDir, workspace, 'team-flow');
    assert.strictEqual(dest, path.join(workspace, 'openspec', 'schemas', 'team-flow'));
    assert.strictEqual(readYaml(dest).name, 'team-flow');
    assert.ok(fs.existsSync(path.join(dest, 'templates', 'tasks.md')));
    assert.throws(() => forkSchema(userDir, workspace, 'team-flow'), /already exists/);
    assert.throws(() => forkSchema(userDir, workspace, 'Bad Name'), /kebab-case/);
  });

  it('adds an artifact with a template and keeps multi-line instructions', () => {
    addArtifact(schemaDir, { id: 'research', generates: 'research.md', description: 'Prior art', requires: ['proposal'] });
    const raw = readYaml(schemaDir);
    assert.deepStrictEqual(raw.artifacts.map((a: any) => a.id), ['proposal', 'tasks', 'research']);
    assert.strictEqual(raw.artifacts[0].instruction, 'Write the proposal.\nKeep it short.\n');
    assert.ok(fs.readFileSync(path.join(schemaDir, 'templates', 'research.md'), 'utf8').startsWith('## Research'));
    assert.deepStrictEqual(loadSchema({ name: 'base', source: 'project', path: schemaDir }).issues, []);
    assert.throws(
      () => addArtifact(schemaDir, { id: 'research', generates: 'x.md', description: '', requires: [] }),
      /already exists/
    );
  });

  it('rewires dependencies and rejects cycles', () => {
    assert.throws(() => setArtifactRequires(schemaDir, 'proposal', ['tasks']), /cycle/);
    assert.throws(() => setArtifactRequires(schemaDir, 'tasks', ['nope']), /Unknown artifact/);
    setArtifactRequires(schemaDir, 'tasks', []);
    assert.deepStrictEqual(readYaml(schemaDir).artifacts[1].requires, []);
  });

  it('removes an artifact and every reference to it', () => {
    const note = removeArtifact(schemaDir, 'proposal');
    assert.strictEqual(note, undefined);
    const raw = readYaml(schemaDir);
    assert.deepStrictEqual(raw.artifacts.map((a: any) => a.id), ['tasks']);
    assert.deepStrictEqual(raw.artifacts[0].requires, []);

    addArtifact(schemaDir, { id: 'notes', generates: 'notes.md', description: '', requires: [] });
    assert.match(removeArtifact(schemaDir, 'tasks') || '', /apply phase/);
    assert.strictEqual(readYaml(schemaDir).apply, undefined);
    assert.throws(() => removeArtifact(schemaDir, 'notes'), /at least one artifact/);
  });
});

describe('Schemas in the workspace store and tree', () => {
  let tmp: string;
  let workspace: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-store-'));
    workspace = path.join(tmp, 'ws');
    writeSchema(path.join(workspace, 'openspec', 'schemas', 'base'));
    writeSchema(path.join(tmp, 'user', 'shared'), SCHEMA_YAML.replace('name: base', 'name: shared'));
    writeSchema(path.join(tmp, 'pkg', 'spec-driven'), SCHEMA_YAML.replace('name: base', 'name: spec-driven'));
    fs.writeFileSync(path.join(workspace, 'openspec', 'config.yaml'), 'schema: base\n');
    const change = path.join(workspace, 'openspec', 'changes', 'add-thing');
    fs.mkdirSync(change, { recursive: true });
    fs.writeFileSync(path.join(change, '.openspec.yaml'), 'schema: shared\n');
    fs.mkdirSync(path.join(workspace, 'openspec', 'changes', 'no-meta'));
  });

  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  function makeStore(discovery = true) {
    return new OpenSpecStateStore(workspace, {
      userSchemasDir: path.join(tmp, 'user'),
      schemaDiscovery: discovery
        ? async () => [{ name: 'spec-driven', source: 'package', path: path.join(tmp, 'pkg', 'spec-driven') }]
        : undefined,
    });
  }

  it('merges project, user, and CLI-discovered schemas with usage and default flags', async () => {
    const state = await makeStore().refresh();
    assert.strictEqual(state.defaultSchema, 'base');
    assert.deepStrictEqual(
      state.schemas.map((s) => [s.name, s.source, s.isDefault]),
      [
        ['base', 'project', true],
        ['shared', 'user', false],
        ['spec-driven', 'package', false],
      ]
    );
    assert.deepStrictEqual(state.schemas[1].usedByChanges, ['add-thing']);
    // Changes without metadata fall back to the project default schema.
    assert.strictEqual(state.changes.find((c) => c.name === 'no-meta')?.schema, 'base');
    assert.deepStrictEqual(state.schemas[0].usedByChanges, ['no-meta']);
  });

  it('always lists the built-in schema, even without the CLI', async () => {
    const state = await makeStore(false).refresh();
    const builtin = state.schemas.find((s) => s.name === 'spec-driven');
    assert.ok(builtin);
    assert.strictEqual(builtin.source, 'package');
    assert.strictEqual(builtin.dirPath, '');
  });

  it('offers the default schema first in the New Change form', async () => {
    const store = makeStore();
    await store.refresh();
    assert.deepStrictEqual(SpecViewerPanel.schemaChoices(store), ['base', 'shared', 'spec-driven']);
  });

  it('renders schemas, artifacts, and issues in the tree', async () => {
    const store = makeStore();
    await store.refresh();
    const provider = new SchemasTreeProvider(store);
    const roots = (await provider.getChildren()) as SchemaItem[];
    assert.deepStrictEqual(roots.map((r) => r.contextValue), ['schema.project.default', 'schema.user', 'schema.package']);
    assert.match(String(roots[0].description), /project · default · 2 artifacts/);
    assert.strictEqual(roots[0].command?.command, 'openspec.schema.openFile');

    const children = (await provider.getChildren(roots[0])) as any[];
    assert.deepStrictEqual(children.map((c) => c.label), ['proposal', 'tasks', 'apply']);
    const tasks = children[1] as SchemaArtifactItem;
    assert.strictEqual(tasks.description, 'tasks.md ← proposal');
    assert.strictEqual(tasks.contextValue, 'schemaArtifact.editable');
    assert.strictEqual(tasks.command?.arguments?.[0], path.join(workspace, 'openspec', 'schemas', 'base', 'templates', 'tasks.md'));

    const builtinChildren = (await provider.getChildren(roots[2])) as SchemaArtifactItem[];
    assert.strictEqual(builtinChildren[0].contextValue, 'schemaArtifact');

    fs.rmSync(path.join(workspace, 'openspec', 'schemas', 'base', 'templates', 'tasks.md'));
    await store.refresh();
    const [broken] = (await provider.getChildren()) as SchemaItem[];
    assert.match(String(broken.description), /1 error/);
    const first = (await provider.getChildren(broken)) as any[];
    assert.ok(first[0] instanceof SchemaIssueItem);
  });
});

describe('CLI schema discovery parsing', () => {
  it('parses `openspec schema which --all --json` output', () => {
    const stdout = 'Note: Schema commands are experimental\n' + JSON.stringify([
      { name: 'spec-driven', source: 'package', path: '/pkg/spec-driven', shadows: [] },
      { name: 'bogus', source: 'elsewhere', path: '/x' },
    ]);
    assert.deepStrictEqual(OpenSpecCliBridge.parseSchemaList(stdout), [
      { name: 'spec-driven', source: 'package', path: '/pkg/spec-driven' },
    ]);
    assert.deepStrictEqual(OpenSpecCliBridge.parseSchemaList('not json'), []);
  });

  it('builds non-interactive schema init arguments', async () => {
    class Capture extends OpenSpecCliBridge {
      public args: string[] = [];
      public override async execute(args: string[]): Promise<any> {
        this.args = args;
        return { stdout: '', stderr: '', code: 0, success: true };
      }
    }
    const cli = new Capture('/tmp');
    await cli.initSchema('lean', ' Lean flow ', ['proposal', 'tasks']);
    assert.deepStrictEqual(cli.args, [
      'schema', 'init', 'lean', '--json', '--no-default', '--description', 'Lean flow', '--artifacts', 'proposal,tasks',
    ]);
  });
});
