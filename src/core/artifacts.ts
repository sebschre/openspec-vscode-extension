import * as fs from 'fs';
import * as path from 'path';
import { ChangeDetail, SchemaDetail } from './types';

/** One artifact of a change, resolved against the change's workflow schema. */
export interface ChangeArtifactStatus {
  id: string;
  label: string;
  /** The `generates` pattern from the schema. */
  generates: string;
  /** File to open, or the directory holding the generated files for glob patterns. */
  path: string;
  present: boolean;
  description?: string;
}

/** Artifacts of the built-in `spec-driven` schema, used when the change's schema is unknown. */
export const DEFAULT_ARTIFACTS: Array<{ id: string; generates: string }> = [
  { id: 'proposal', generates: 'proposal.md' },
  { id: 'specs', generates: 'specs/**/*.md' },
  { id: 'design', generates: 'design.md' },
  { id: 'tasks', generates: 'tasks.md' },
];

/** Turns an artifact id such as `user-stories` into a label such as `User Stories`. */
export function artifactLabel(id: string): string {
  if (id === 'specs') return 'Specs (Delta)';
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function isGlob(pattern: string): boolean {
  return /[*?[{]/.test(pattern);
}

/** The path a `generates` pattern points at: the file itself, or the directory before the first glob segment. */
export function artifactPath(changeDir: string, generates: string): string {
  const segments = generates.split('/').filter(Boolean);
  const firstGlob = segments.findIndex(isGlob);
  const fixed = firstGlob === -1 ? segments : segments.slice(0, firstGlob);
  return path.join(changeDir, ...fixed);
}

function segmentRegex(segment: string): RegExp {
  const source = segment
    .replace(/[.+^$()|\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${source}$`);
}

function containsMatch(dir: string, name: RegExp): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (containsMatch(path.join(dir, entry.name), name)) return true;
    } else if (name.test(entry.name)) {
      return true;
    }
  }
  return false;
}

/** Whether the files an artifact generates exist in the change directory. */
export function isArtifactPresent(changeDir: string, generates: string): boolean {
  const target = artifactPath(changeDir, generates);
  if (!isGlob(generates)) {
    return fs.existsSync(target) && fs.statSync(target).isFile();
  }
  const last = generates.split('/').filter(Boolean).pop() ?? '*';
  return containsMatch(target, segmentRegex(last));
}

/** Lists a change's artifacts in schema order, falling back to the built-in artifacts. */
export function resolveChangeArtifacts(change: ChangeDetail, schema?: SchemaDetail): ChangeArtifactStatus[] {
  const defs = schema && schema.artifacts.length > 0 ? schema.artifacts : DEFAULT_ARTIFACTS;
  return defs.map((def) => ({
    id: def.id,
    label: artifactLabel(def.id),
    generates: def.generates,
    path: artifactPath(change.changeDir, def.generates),
    present: isArtifactPresent(change.changeDir, def.generates),
    description: 'description' in def ? (def as { description?: string }).description : undefined,
  }));
}

/**
 * A change is complete when every artifact of its schema exists and, if the
 * schema has a tasks artifact, at least one task exists and all are done.
 */
export function isChangeComplete(change: ChangeDetail, schema: SchemaDetail): boolean {
  const artifacts = resolveChangeArtifacts(change, schema);
  if (!artifacts.every((a) => a.present)) return false;
  if (!artifacts.some((a) => a.id === 'tasks')) return change.tasks.every((t) => t.completed);
  return change.taskProgress.total > 0 && change.taskProgress.completed === change.taskProgress.total;
}
