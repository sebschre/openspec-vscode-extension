import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  SchemaApplyPhase,
  SchemaArtifact,
  SchemaDetail,
  SchemaIssue,
  SchemaSource,
} from './types';

/**
 * Workflow schema discovery and editing.
 *
 * Mirrors the OpenSpec CLI's resolution order (project → user → package) so the
 * Schemas view shows the same schema the CLI would pick for a given name.
 */

export const DEFAULT_SCHEMA = 'spec-driven';
export const SCHEMA_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SOURCE_PRECEDENCE: SchemaSource[] = ['project', 'user', 'package'];

export interface SchemaLocation {
  name: string;
  source: SchemaSource;
  path: string;
}

export interface NewArtifactInput {
  id: string;
  generates: string;
  description: string;
  requires: string[];
}

export function getProjectSchemasDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, 'openspec', 'schemas');
}

/** Same location the OpenSpec CLI uses for user-level schema overrides. */
export function getUserSchemasDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  homedir: string = os.homedir()
): string {
  const join = platform === 'win32' ? path.win32.join : path.posix.join;
  if (env.XDG_DATA_HOME) {
    return join(env.XDG_DATA_HOME, 'openspec', 'schemas');
  }
  if (platform === 'win32') {
    const base = env.LOCALAPPDATA || join(homedir, 'AppData', 'Local');
    return join(base, 'openspec', 'schemas');
  }
  return join(homedir, '.local', 'share', 'openspec', 'schemas');
}

/** Lists schema directories (those containing `schema.yaml`) under `schemasDir`. */
export function listSchemaDirs(schemasDir: string, source: SchemaSource): SchemaLocation[] {
  if (!fs.existsSync(schemasDir)) return [];
  const result: SchemaLocation[] = [];
  for (const entry of fs.readdirSync(schemasDir, { withFileTypes: true })) {
    // Skip hidden entries and the CLI's transient fork/init staging/backup dirs.
    if (entry.name.startsWith('.') || entry.name.includes('.')) continue;
    const dir = path.join(schemasDir, entry.name);
    try {
      if (!fs.statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    if (fs.existsSync(path.join(dir, 'schema.yaml'))) {
      result.push({ name: entry.name, source, path: dir });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Merges schema locations by name. The highest-precedence location wins and the
 * others are recorded as shadowed.
 */
export function mergeSchemaLocations(
  locations: SchemaLocation[]
): Array<SchemaLocation & { shadows: SchemaSource[] }> {
  const byName = new Map<string, SchemaLocation[]>();
  for (const loc of locations) {
    const list = byName.get(loc.name) || [];
    if (!list.some((l) => l.source === loc.source)) list.push(loc);
    byName.set(loc.name, list);
  }
  const merged: Array<SchemaLocation & { shadows: SchemaSource[] }> = [];
  for (const list of byName.values()) {
    list.sort((a, b) => SOURCE_PRECEDENCE.indexOf(a.source) - SOURCE_PRECEDENCE.indexOf(b.source));
    const [winner, ...rest] = list;
    merged.push({ ...winner, shadows: rest.map((r) => r.source) });
  }
  return merged.sort(
    (a, b) =>
      SOURCE_PRECEDENCE.indexOf(a.source) - SOURCE_PRECEDENCE.indexOf(b.source) ||
      a.name.localeCompare(b.name)
  );
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/** Loads a schema directory into a `SchemaDetail`. Never throws; problems become issues. */
export function loadSchema(location: SchemaLocation, shadows: SchemaSource[] = []): SchemaDetail {
  const schemaPath = path.join(location.path, 'schema.yaml');
  const detail: SchemaDetail = {
    name: location.name,
    source: location.source,
    dirPath: location.path,
    schemaPath,
    artifacts: [],
    shadows,
    isDefault: false,
    usedByChanges: [],
    issues: [],
  };

  let raw: any;
  try {
    raw = yaml.load(fs.readFileSync(schemaPath, 'utf8'));
  } catch (err: any) {
    detail.issues.push({ level: 'error', message: `Cannot parse schema.yaml: ${err?.message || err}` });
    return detail;
  }
  if (!raw || typeof raw !== 'object') {
    detail.issues.push({ level: 'error', message: 'schema.yaml is empty or not a mapping' });
    return detail;
  }

  if (typeof raw.version === 'number') detail.version = raw.version;
  if (typeof raw.description === 'string') detail.description = raw.description;

  const templatesDir = path.join(location.path, 'templates');
  for (const a of Array.isArray(raw.artifacts) ? raw.artifacts : []) {
    if (!a || typeof a !== 'object') continue;
    const template = typeof a.template === 'string' ? a.template : '';
    const templatePath = template ? path.join(templatesDir, template) : undefined;
    detail.artifacts.push({
      id: String(a.id ?? ''),
      generates: typeof a.generates === 'string' ? a.generates : '',
      description: typeof a.description === 'string' ? a.description : '',
      template,
      instruction: typeof a.instruction === 'string' ? a.instruction : undefined,
      requires: asStringArray(a.requires),
      templatePath,
      templateExists: !!templatePath && fs.existsSync(templatePath),
    });
  }

  if (raw.apply && typeof raw.apply === 'object') {
    const apply: SchemaApplyPhase = { requires: asStringArray(raw.apply.requires) };
    if (raw.apply.tracks !== undefined) apply.tracks = raw.apply.tracks;
    if (typeof raw.apply.instruction === 'string') apply.instruction = raw.apply.instruction;
    detail.apply = apply;
  }

  detail.issues.push(...validateSchemaStructure(raw, detail));
  return detail;
}

/**
 * Lightweight structural validation mirroring the CLI's rules, so problems are
 * visible in the tree without running `openspec schema validate`.
 */
export function validateSchemaStructure(raw: any, detail: SchemaDetail): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  if (typeof raw.name !== 'string' || !raw.name) {
    issues.push({ level: 'error', message: 'Missing required field: name' });
  } else if (raw.name !== detail.name) {
    issues.push({
      level: 'warning',
      message: `Schema name "${raw.name}" does not match its directory "${detail.name}"`,
    });
  }
  if (!Number.isInteger(raw.version) || raw.version < 1) {
    issues.push({ level: 'error', message: 'version must be a positive integer' });
  }
  if (detail.artifacts.length === 0) {
    issues.push({ level: 'error', message: 'At least one artifact is required' });
  }

  const ids = new Set<string>();
  for (const a of detail.artifacts) {
    if (!a.id) issues.push({ level: 'error', message: 'An artifact is missing its id' });
    else if (ids.has(a.id)) issues.push({ level: 'error', message: `Duplicate artifact id "${a.id}"` });
    ids.add(a.id);
    if (!a.generates) issues.push({ level: 'error', message: `Artifact "${a.id}" is missing "generates"` });
    if (!a.template) issues.push({ level: 'error', message: `Artifact "${a.id}" is missing "template"` });
    else if (!a.templateExists) {
      issues.push({ level: 'error', message: `Template "templates/${a.template}" for "${a.id}" does not exist` });
    }
    for (const r of a.requires) {
      if (!ids.has(r) && !detail.artifacts.some((x) => x.id === r)) {
        issues.push({ level: 'error', message: `Artifact "${a.id}" requires unknown artifact "${r}"` });
      }
    }
  }

  const cycle = findDependencyCycle(detail.artifacts);
  if (cycle) issues.push({ level: 'error', message: `Cyclic dependency detected: ${cycle.join(' → ')}` });

  if (detail.apply) {
    if (detail.apply.requires.length === 0) {
      issues.push({ level: 'error', message: 'apply.requires needs at least one artifact' });
    }
    for (const r of detail.apply.requires) {
      if (!ids.has(r)) issues.push({ level: 'error', message: `apply requires unknown artifact "${r}"` });
    }
  }
  return issues;
}

/** Returns the first dependency cycle found (e.g. `[a, b, a]`), or undefined. */
export function findDependencyCycle(
  artifacts: Array<Pick<SchemaArtifact, 'id' | 'requires'>>
): string[] | undefined {
  const graph = new Map(artifacts.map((a) => [a.id, a.requires]));
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  const visit = (id: string): string[] | undefined => {
    if (state.get(id) === 'done') return undefined;
    if (state.get(id) === 'visiting') return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 'visiting');
    stack.push(id);
    for (const dep of graph.get(id) || []) {
      if (!graph.has(dep)) continue;
      const found = visit(dep);
      if (found) return found;
    }
    stack.pop();
    state.set(id, 'done');
    return undefined;
  };

  for (const a of artifacts) {
    const found = visit(a.id);
    if (found) return found;
  }
  return undefined;
}

/** Reads the project default schema from `openspec/config.yaml`. */
export function readDefaultSchema(workspaceRoot: string): string {
  const configPath = path.join(workspaceRoot, 'openspec', 'config.yaml');
  if (!fs.existsSync(configPath)) return DEFAULT_SCHEMA;
  try {
    const parsed: any = yaml.load(fs.readFileSync(configPath, 'utf8'));
    if (parsed && typeof parsed.schema === 'string' && parsed.schema.trim()) {
      return parsed.schema.trim();
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_SCHEMA;
}

/**
 * Sets the project default schema in `openspec/config.yaml`, editing only the
 * top-level `schema:` line so comments and other settings are preserved.
 */
export function writeDefaultSchema(workspaceRoot: string, name: string): void {
  const configPath = path.join(workspaceRoot, 'openspec', 'config.yaml');
  const content = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  const line = `schema: ${name}`;
  const updated = /^schema:.*$/m.test(content)
    ? content.replace(/^schema:.*$/m, line)
    : `${line}\n${content}`;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, updated, 'utf8');
}

/** Copies a schema into the project's `openspec/schemas/<name>` for customization. */
export function forkSchema(sourceDir: string, workspaceRoot: string, name: string): string {
  if (!SCHEMA_NAME_PATTERN.test(name)) {
    throw new Error(`Schema name "${name}" must be kebab-case (e.g. my-workflow)`);
  }
  const dest = path.join(getProjectSchemasDir(workspaceRoot), name);
  if (fs.existsSync(dest)) {
    throw new Error(`A project schema named "${name}" already exists`);
  }
  if (!fs.existsSync(path.join(sourceDir, 'schema.yaml'))) {
    throw new Error(`No schema.yaml found in ${sourceDir}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(sourceDir, dest, { recursive: true });

  const schemaPath = path.join(dest, 'schema.yaml');
  const content = fs.readFileSync(schemaPath, 'utf8');
  fs.writeFileSync(schemaPath, content.replace(/^name:.*$/m, `name: ${name}`), 'utf8');
  return dest;
}

function loadRaw(schemaPath: string): any {
  const raw: any = yaml.load(fs.readFileSync(schemaPath, 'utf8'));
  if (!raw || typeof raw !== 'object') throw new Error('schema.yaml is not a mapping');
  if (!Array.isArray(raw.artifacts)) raw.artifacts = [];
  return raw;
}

function saveRaw(schemaPath: string, raw: any): void {
  fs.writeFileSync(schemaPath, yaml.dump(raw, { lineWidth: -1, noRefs: true }), 'utf8');
}

function assertAcyclic(raw: any): void {
  const cycle = findDependencyCycle(
    raw.artifacts.map((a: any) => ({ id: a.id, requires: asStringArray(a.requires) }))
  );
  if (cycle) throw new Error(`This would create a dependency cycle: ${cycle.join(' → ')}`);
}

/** Appends an artifact to a schema and scaffolds its template file. */
export function addArtifact(schemaDir: string, input: NewArtifactInput): void {
  if (!SCHEMA_NAME_PATTERN.test(input.id)) {
    throw new Error(`Artifact id "${input.id}" must be kebab-case`);
  }
  const schemaPath = path.join(schemaDir, 'schema.yaml');
  const raw = loadRaw(schemaPath);
  if (raw.artifacts.some((a: any) => a.id === input.id)) {
    throw new Error(`Artifact "${input.id}" already exists`);
  }
  const template = `${input.id}.md`;
  raw.artifacts.push({
    id: input.id,
    generates: input.generates,
    description: input.description,
    template,
    requires: input.requires,
  });
  assertAcyclic(raw);
  saveRaw(schemaPath, raw);

  const templatePath = path.join(schemaDir, 'templates', template);
  if (!fs.existsSync(templatePath)) {
    fs.mkdirSync(path.dirname(templatePath), { recursive: true });
    const title = input.id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    fs.writeFileSync(templatePath, `## ${title}\n\n<!-- ${input.description} -->\n`, 'utf8');
  }
}

/**
 * Removes an artifact and every reference to it. Returns a note when the apply
 * phase had to be dropped because it no longer requires any artifact.
 */
export function removeArtifact(schemaDir: string, id: string): string | undefined {
  const schemaPath = path.join(schemaDir, 'schema.yaml');
  const raw = loadRaw(schemaPath);
  const before = raw.artifacts.length;
  raw.artifacts = raw.artifacts.filter((a: any) => a.id !== id);
  if (raw.artifacts.length === before) throw new Error(`Artifact "${id}" not found`);
  if (raw.artifacts.length === 0) throw new Error('A schema needs at least one artifact');

  for (const a of raw.artifacts) {
    a.requires = asStringArray(a.requires).filter((r) => r !== id);
  }
  let note: string | undefined;
  if (raw.apply) {
    raw.apply.requires = asStringArray(raw.apply.requires).filter((r) => r !== id);
    if (raw.apply.requires.length === 0) {
      delete raw.apply;
      note = `The apply phase only required "${id}" and was removed.`;
    }
  }
  saveRaw(schemaPath, raw);
  return note;
}

/** Replaces an artifact's `requires` list, rejecting unknown ids and cycles. */
export function setArtifactRequires(schemaDir: string, id: string, requires: string[]): void {
  const schemaPath = path.join(schemaDir, 'schema.yaml');
  const raw = loadRaw(schemaPath);
  const artifact = raw.artifacts.find((a: any) => a.id === id);
  if (!artifact) throw new Error(`Artifact "${id}" not found`);
  const known = new Set(raw.artifacts.map((a: any) => a.id));
  const unknown = requires.filter((r) => !known.has(r));
  if (unknown.length) throw new Error(`Unknown artifact(s): ${unknown.join(', ')}`);
  artifact.requires = requires;
  assertAcyclic(raw);
  saveRaw(schemaPath, raw);
}
