import * as path from 'path';
import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../core/store';
import { OpenSpecCliBridge } from '../core/cli';
import {
  SCHEMA_NAME_PATTERN,
  addArtifact,
  claimSchemaDir,
  compareSchemaDirs,
  defaultAfterDelete,
  findApplyLine,
  findArtifactLine,
  findChangesNamingSchema,
  findIssueLine,
  forkSchema,
  getProjectSchemasDir,
  removeArtifact,
  renameSchema,
  setArtifactRequires,
  writeDefaultSchema,
} from '../core/schemas';
import { SchemaDetail } from '../core/types';
import { SOURCE_LABEL, isEditableSchema } from '../views/tree/schemasTreeProvider';

const BUILTIN_ARTIFACTS = ['proposal', 'specs', 'design', 'tasks'];
/** Read-only scheme serving empty documents, for diffing added or removed files. */
const EMPTY_SCHEME = 'openspec-empty';

export interface SchemaCommandOptions {
  /** Selects and expands a schema in the Schemas view. */
  revealSchema?: (name: string) => Thenable<void> | void;
}

function validateKebab(value: string): string | undefined {
  return SCHEMA_NAME_PATTERN.test(value.trim()) ? undefined : 'Use kebab-case, e.g. my-workflow';
}

/**
 * Validates the name for a new or renamed project schema. Names already used
 * anywhere are refused, so a copy never silently overrides another schema.
 */
function validateNewSchemaName(store: OpenSpecStateStore, value: string, current?: string): string | undefined {
  const name = value.trim();
  const invalid = validateKebab(name);
  if (invalid || name === current) return invalid;
  const existing = store.getState().schemas.find((s) => s.name === name);
  if (!existing) return undefined;
  return existing.source === 'project'
    ? 'A project schema with this name already exists'
    : `A ${SOURCE_LABEL[existing.source]} schema is already named "${name}". Pick another name so both stay available.`;
}

export interface DefaultChoice extends vscode.QuickPickItem {
  makeDefault: boolean;
}

/**
 * Options for "should new changes use the fork?". Forking the current default
 * usually means replacing it, so that option comes first in that case.
 */
export function forkDefaultChoices(sourceIsDefault: boolean, newName: string, currentDefault: string): DefaultChoice[] {
  const use: DefaultChoice = {
    label: `Use "${newName}" for new changes`,
    description: `replaces "${currentDefault}" as the project default`,
    makeDefault: true,
  };
  const keep: DefaultChoice = {
    label: `Keep "${currentDefault}" as the project default`,
    description: 'you can switch later from the Schemas view',
    makeDefault: false,
  };
  return sourceIsDefault ? [use, keep] : [keep, use];
}

function originLabel(schema: SchemaDetail): string {
  const lineage = schema.forkedFrom!;
  return `"${lineage.schema}" (${SOURCE_LABEL[lineage.source]})`;
}

/** Resolves the schema a command targets: a tree item, a name, or a quick pick. */
async function resolveSchema(
  store: OpenSpecStateStore,
  arg: any,
  filter: (s: SchemaDetail) => boolean,
  placeHolder: string
): Promise<SchemaDetail | undefined> {
  if (arg?.schema?.name) return store.getSchema(arg.schema.name) ?? arg.schema;
  if (typeof arg === 'string') return store.getSchema(arg);

  const candidates = store.getState().schemas.filter(filter);
  if (candidates.length === 0) {
    vscode.window.showInformationMessage('No matching OpenSpec schemas found.');
    return undefined;
  }
  const picked = await vscode.window.showQuickPick(
    candidates.map((s) => ({
      label: s.name,
      description: `${s.source}${s.isDefault ? ' · default' : ''}`,
      detail: s.description,
      schema: s,
    })),
    { placeHolder }
  );
  return picked?.schema;
}

function reportError(err: unknown) {
  vscode.window.showErrorMessage(`OpenSpec: ${err instanceof Error ? err.message : String(err)}`);
}

export function registerSchemaCommands(
  context: vscode.ExtensionContext,
  store: OpenSpecStateStore,
  cli: OpenSpecCliBridge,
  outputChannel: vscode.OutputChannel,
  options: SchemaCommandOptions = {}
) {
  const root = store.getWorkspaceRoot();
  const register = (id: string, handler: (...args: any[]) => any) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  const reveal = async (name: string) => {
    try {
      await options.revealSchema?.(name);
    } catch {
      // the view may be hidden; revealing is best effort
    }
  };

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(EMPTY_SCHEME, { provideTextDocumentContent: () => '' })
  );

  register('openspec.schema.openFile', async (filePath?: string) => {
    if (!filePath) return;
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(doc);
  });

  register('openspec.schema.fork', async (arg?: any) => {
    const source = await resolveSchema(store, arg, (s) => !!s.dirPath, 'Select a schema to customize');
    if (!source) return;
    if (!source.dirPath) {
      vscode.window.showWarningMessage(
        `Cannot locate the files for "${source.name}". Install the OpenSpec CLI (npm i -g @fission-ai/openspec) and refresh.`
      );
      return;
    }

    const title = `Customize "${source.name}"`;
    const input = await vscode.window.showInputBox({
      title: `${title} (1/2)`,
      prompt: 'Name for the project-local copy (stored in openspec/schemas/)',
      value: source.source === 'project' ? `${source.name}-copy` : `${source.name}-custom`,
      validateInput: (v) => validateNewSchemaName(store, v),
    });
    if (!input) return;
    const name = input.trim();

    const currentDefault = store.getState().defaultSchema;
    const choice = await vscode.window.showQuickPick(forkDefaultChoices(source.isDefault, name, currentDefault), {
      title: `${title} (2/2)`,
      placeHolder: 'Which schema should new changes use?',
    });
    if (!choice) return;

    try {
      const dest = forkSchema(source.dirPath, root, name, {
        schema: source.name,
        source: source.source,
        version: source.version,
      });
      if (choice.makeDefault) writeDefaultSchema(root, name);
      await store.refresh();
      await reveal(name);
      const action = await vscode.window.showInformationMessage(
        `Schema "${name}" created from "${source.name}"${choice.makeDefault ? ' and set as the project default' : ''}.`,
        'Open schema.yaml'
      );
      if (action === 'Open schema.yaml') {
        await vscode.commands.executeCommand('openspec.schema.openFile', path.join(dest, 'schema.yaml'));
      }
    } catch (err) {
      reportError(err);
    }
  });

  register('openspec.schema.compareWithOriginal', async (arg?: any) => {
    const schema = await resolveSchema(store, arg, (s) => !!s.forkedFrom && !!s.dirPath, 'Select a fork to compare');
    if (!schema) return;
    const lineage = schema.forkedFrom;
    if (!lineage) {
      vscode.window.showInformationMessage(`"${schema.name}" was not forked by OpenSpec for VS Code, so its source is unknown.`);
      return;
    }
    if (!lineage.available || !lineage.sourcePath) {
      const hint = lineage.source === 'package' ? ' Install the OpenSpec CLI and refresh if it is missing.' : '';
      vscode.window.showWarningMessage(`The source ${originLabel(schema)} of "${schema.name}" can no longer be found.${hint}`);
      return;
    }

    const diffs = compareSchemaDirs(schema.dirPath, lineage.sourcePath);
    if (diffs.length === 0) {
      vscode.window.showInformationMessage(`"${schema.name}" has no changes compared with ${originLabel(schema)}.`);
      return;
    }
    const upstream = lineage.updated
      ? ` · the source moved from v${lineage.version} to v${lineage.sourceVersion}, so upstream changes show too`
      : '';
    const picked = await vscode.window.showQuickPick(
      diffs.map((d) => ({ label: d.path, description: d.status, diff: d })),
      {
        title: `Compare "${schema.name}" with ${originLabel(schema)}`,
        placeHolder: `${diffs.length} file${diffs.length === 1 ? ' differs' : 's differ'}${upstream}`,
      }
    );
    if (!picked) return;

    const { diff } = picked;
    const empty = vscode.Uri.from({ scheme: EMPTY_SCHEME, path: `/${diff.path}` });
    const left = diff.status === 'added' ? empty : vscode.Uri.file(path.join(lineage.sourcePath, diff.path));
    const right = diff.status === 'removed' ? empty : vscode.Uri.file(path.join(schema.dirPath, diff.path));
    await vscode.commands.executeCommand(
      'vscode.diff',
      left,
      right,
      `${diff.path}: ${lineage.schema} ↔ ${schema.name}`
    );
  });

  register('openspec.schema.rename', async (arg?: any) => {
    const schema = await resolveSchema(store, arg, (s) => s.source === 'project', 'Select a project schema to rename');
    if (!schema) return;
    if (schema.source !== 'project') {
      vscode.window.showWarningMessage('Only project schemas can be renamed.');
      return;
    }
    const input = await vscode.window.showInputBox({
      title: `Rename "${schema.name}"`,
      prompt: 'New name. The project default and active changes that use this schema are updated too.',
      value: schema.name,
      validateInput: (v) => validateNewSchemaName(store, v, schema.name),
    });
    const name = input?.trim();
    if (!name || name === schema.name) return;

    try {
      const result = renameSchema(root, schema.name, name);
      await store.refresh();
      await reveal(name);
      const updates: string[] = [];
      if (result.defaultUpdated) updates.push('the project default');
      if (result.updatedChanges.length) {
        const n = result.updatedChanges.length;
        updates.push(`${n} change${n === 1 ? '' : 's'} (${result.updatedChanges.join(', ')})`);
      }
      vscode.window.showInformationMessage(
        `Renamed "${schema.name}" to "${name}".${updates.length ? ` Updated ${updates.join(' and ')}.` : ''}`
      );
    } catch (err) {
      reportError(err);
    }
  });

  register('openspec.schema.delete', async (arg?: any) => {
    const schema = await resolveSchema(store, arg, (s) => s.source === 'project', 'Select a project schema to delete');
    if (!schema) return;
    if (schema.source !== 'project' || !schema.dirPath) {
      vscode.window.showWarningMessage('Only project schemas can be deleted.');
      return;
    }

    const nextDefault = schema.isDefault ? defaultAfterDelete(schema) : undefined;
    const named = findChangesNamingSchema(root, schema.name).map((c) => c.name);
    const detail = ['Its folder is moved to the trash.'];
    if (nextDefault && nextDefault !== schema.name) {
      detail.push(`It is the project default. New changes will use "${nextDefault}" instead.`);
    }
    if (named.length) {
      const fallback = schema.shadows.length
        ? `will use the ${SOURCE_LABEL[schema.shadows[0]]} schema of the same name`
        : 'will not find their schema until you change it';
      detail.push(`Active changes that use it ${fallback}: ${named.join(', ')}.`);
    }
    const confirm = await vscode.window.showWarningMessage(
      `Delete schema "${schema.name}"?`,
      { modal: true, detail: detail.join('\n\n') },
      'Move to Trash'
    );
    if (confirm !== 'Move to Trash') return;

    const uri = vscode.Uri.file(schema.dirPath);
    try {
      try {
        await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: true });
      } catch {
        const permanent = await vscode.window.showWarningMessage(
          `"${schema.name}" could not be moved to the trash. Delete it permanently?`,
          { modal: true },
          'Delete Permanently'
        );
        if (permanent !== 'Delete Permanently') return;
        await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false });
      }
      if (nextDefault && nextDefault !== schema.name) writeDefaultSchema(root, nextDefault);
      await store.refresh();
      vscode.window.showInformationMessage(
        `Deleted schema "${schema.name}".${nextDefault && nextDefault !== schema.name ? ` The project default is now "${nextDefault}".` : ''}`
      );
    } catch (err) {
      reportError(err);
    }
  });

  register('openspec.schema.openDefinition', async (item?: any) => {
    const schema: SchemaDetail | undefined = item?.schema;
    if (!schema?.schemaPath) return;
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(schema.schemaPath));
    const text = doc.getText();
    const line = item.artifact
      ? findArtifactLine(text, item.artifact.id)
      : item.issue
        ? findIssueLine(text, item.issue)
        : findApplyLine(text);
    const position = new vscode.Position(Math.max(line, 0), 0);
    await vscode.window.showTextDocument(doc, { selection: new vscode.Range(position, position) });
  });

  register('openspec.schema.new', async () => {
    if (!(await cli.isCliAvailable())) {
      const action = await vscode.window.showWarningMessage(
        'Creating a schema from scratch needs the OpenSpec CLI. You can fork an existing schema instead.',
        'Fork Existing Schema'
      );
      if (action) await vscode.commands.executeCommand('openspec.schema.fork');
      return;
    }

    const name = await vscode.window.showInputBox({
      title: 'New OpenSpec Schema',
      prompt: 'Schema name (kebab-case)',
      placeHolder: 'my-workflow',
      validateInput: validateKebab,
    });
    if (!name) return;
    const description = await vscode.window.showInputBox({
      title: 'New OpenSpec Schema',
      prompt: 'Short description (optional)',
      placeHolder: 'e.g. Lightweight proposal → tasks flow',
    });
    if (description === undefined) return;
    const artifacts = await vscode.window.showQuickPick(
      BUILTIN_ARTIFACTS.map((id) => ({ label: id, picked: true })),
      { canPickMany: true, title: 'New OpenSpec Schema', placeHolder: 'Artifacts to include' }
    );
    if (!artifacts || artifacts.length === 0) return;

    // Clear an empty folder left behind by a reverted schema so the CLI can reuse the name.
    if (!claimSchemaDir(path.join(getProjectSchemasDir(root), name.trim()))) {
      vscode.window.showErrorMessage(`OpenSpec: A project schema named "${name.trim()}" already exists`);
      return;
    }
    const res = await cli.initSchema(
      name.trim(),
      description,
      artifacts.map((a) => a.label)
    );
    if (!res.success) {
      outputChannel.appendLine(res.stdout);
      outputChannel.appendLine(res.stderr);
      outputChannel.show(true);
      vscode.window.showErrorMessage('Creating the schema failed. See the OpenSpec output for details.');
      return;
    }
    await store.refresh();
    const created = store.getSchema(name.trim());
    if (created?.schemaPath) {
      await vscode.commands.executeCommand('openspec.schema.openFile', created.schemaPath);
    }
  });

  register('openspec.schema.validate', async (arg?: any) => {
    const schema = await resolveSchema(store, arg, (s) => !!s.dirPath, 'Select a schema to validate');
    if (!schema) return;

    outputChannel.appendLine(`\n[OpenSpec] Validating schema '${schema.name}'...`);
    const local = schema.issues;
    let issues = local.map((i) => `${i.level}: ${i.message}`);
    let valid = !local.some((i) => i.level === 'error');

    if (await cli.isCliAvailable()) {
      const res = await cli.validateSchema(schema.name);
      try {
        const parsed = JSON.parse(OpenSpecCliBridge.extractJson(res.stdout));
        valid = !!parsed.valid;
        issues = (parsed.issues || []).map((i: any) => `${i.level}: ${i.path ? `${i.path}: ` : ''}${i.message}`);
      } catch {
        valid = res.success;
        if (res.stdout) issues.push(res.stdout.trim());
        if (res.stderr) issues.push(res.stderr.trim());
      }
    } else {
      outputChannel.appendLine('[OpenSpec] CLI not found; showing built-in structural checks only.');
    }

    issues.forEach((i) => outputChannel.appendLine(`  ${i}`));
    if (valid) {
      vscode.window.showInformationMessage(`Schema "${schema.name}" is valid.`);
    } else {
      outputChannel.show(true);
      vscode.window.showErrorMessage(
        `Schema "${schema.name}" has ${issues.length} issue${issues.length === 1 ? '' : 's'}. See the OpenSpec output.`
      );
    }
  });

  register('openspec.schema.setDefault', async (arg?: any) => {
    const schema = await resolveSchema(store, arg, (s) => !s.isDefault, 'Select the project default schema');
    if (!schema) return;
    try {
      writeDefaultSchema(root, schema.name);
      await store.refresh();
      vscode.window.showInformationMessage(`New changes will now use the "${schema.name}" schema.`);
    } catch (err) {
      reportError(err);
    }
  });

  register('openspec.schema.addArtifact', async (arg?: any) => {
    const schema = await resolveSchema(store, arg, isEditableSchema, 'Select a schema to add an artifact to');
    if (!schema) return;
    if (!isEditableSchema(schema)) {
      vscode.window.showWarningMessage(`Built-in schemas are read-only. Customize "${schema.name}" first.`);
      return;
    }
    const existing = schema.artifacts.map((a) => a.id);

    const id = await vscode.window.showInputBox({
      title: `Add artifact to "${schema.name}"`,
      prompt: 'Artifact id (kebab-case)',
      placeHolder: 'e.g. research',
      validateInput: (v) => validateKebab(v) ?? (existing.includes(v.trim()) ? 'Artifact already exists' : undefined),
    });
    if (!id) return;
    const generates = await vscode.window.showInputBox({
      title: `Add artifact "${id}"`,
      prompt: 'File the artifact generates, relative to the change directory',
      value: `${id.trim()}.md`,
      validateInput: (v) => (v.trim() && !v.includes('..') && !v.startsWith('/') ? undefined : 'Enter a relative path'),
    });
    if (!generates) return;
    const description = await vscode.window.showInputBox({
      title: `Add artifact "${id}"`,
      prompt: 'Short description shown to agents',
      value: '',
    });
    if (description === undefined) return;

    let requires: string[] = [];
    if (existing.length) {
      const picks = await vscode.window.showQuickPick(
        existing.map((e) => ({ label: e })),
        { canPickMany: true, title: `Add artifact "${id}"`, placeHolder: 'Artifacts that must exist first (optional)' }
      );
      if (!picks) return;
      requires = picks.map((p) => p.label);
    }

    try {
      addArtifact(schema.dirPath, { id: id.trim(), generates: generates.trim(), description, requires });
      await store.refresh();
      const updated = store.getSchema(schema.name)?.artifacts.find((a) => a.id === id.trim());
      if (updated?.templatePath) {
        await vscode.commands.executeCommand('openspec.schema.openFile', updated.templatePath);
      }
    } catch (err) {
      reportError(err);
    }
  });

  register('openspec.schema.removeArtifact', async (item?: any) => {
    const schema: SchemaDetail | undefined = item?.schema;
    const artifactId: string | undefined = item?.artifact?.id;
    if (!schema || !artifactId || !isEditableSchema(schema)) return;

    const dependents = schema.artifacts.filter((a) => a.requires.includes(artifactId)).map((a) => a.id);
    const detail = dependents.length ? ` ${dependents.join(', ')} will no longer depend on it.` : '';
    const confirm = await vscode.window.showWarningMessage(
      `Remove artifact "${artifactId}" from "${schema.name}"?${detail} Its template file is kept.`,
      { modal: true },
      'Remove'
    );
    if (confirm !== 'Remove') return;

    try {
      const note = removeArtifact(schema.dirPath, artifactId);
      await store.refresh();
      if (note) vscode.window.showWarningMessage(note);
    } catch (err) {
      reportError(err);
    }
  });

  register('openspec.schema.editRequires', async (item?: any) => {
    const schema: SchemaDetail | undefined = item?.schema;
    const artifactId: string | undefined = item?.artifact?.id;
    if (!schema || !artifactId || !isEditableSchema(schema)) return;
    const artifact = schema.artifacts.find((a) => a.id === artifactId);
    if (!artifact) return;

    const picks = await vscode.window.showQuickPick(
      schema.artifacts
        .filter((a) => a.id !== artifactId)
        .map((a) => ({ label: a.id, description: a.generates, picked: artifact.requires.includes(a.id) })),
      { canPickMany: true, title: `Dependencies of "${artifactId}"`, placeHolder: 'Artifacts that must exist first' }
    );
    if (!picks) return;

    try {
      setArtifactRequires(schema.dirPath, artifactId, picks.map((p) => p.label));
      await store.refresh();
    } catch (err) {
      reportError(err);
    }
  });
}
