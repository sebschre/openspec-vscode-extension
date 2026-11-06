import * as path from 'path';
import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../core/store';
import { OpenSpecCliBridge } from '../core/cli';
import {
  SCHEMA_NAME_PATTERN,
  addArtifact,
  forkSchema,
  removeArtifact,
  setArtifactRequires,
  writeDefaultSchema,
} from '../core/schemas';
import { SchemaDetail } from '../core/types';
import { isEditableSchema } from '../views/tree/schemasTreeProvider';

const BUILTIN_ARTIFACTS = ['proposal', 'specs', 'design', 'tasks'];

function validateKebab(value: string): string | undefined {
  return SCHEMA_NAME_PATTERN.test(value.trim()) ? undefined : 'Use kebab-case, e.g. my-workflow';
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
  outputChannel: vscode.OutputChannel
) {
  const root = store.getWorkspaceRoot();
  const register = (id: string, handler: (...args: any[]) => any) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));

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

    const name = await vscode.window.showInputBox({
      title: `Customize "${source.name}"`,
      prompt: 'Name for the project-local copy (stored in openspec/schemas/)',
      value: source.source === 'project' ? `${source.name}-copy` : `${source.name}-custom`,
      validateInput: (v) =>
        validateKebab(v) ?? (store.getState().schemas.some((s) => s.name === v.trim() && s.source === 'project')
          ? 'A project schema with this name already exists'
          : undefined),
    });
    if (!name) return;

    try {
      const dest = forkSchema(source.dirPath, root, name.trim());
      await store.refresh();
      const action = await vscode.window.showInformationMessage(
        `Schema "${name.trim()}" created from "${source.name}".`,
        'Set as Default',
        'Open schema.yaml'
      );
      if (action === 'Set as Default') {
        await vscode.commands.executeCommand('openspec.schema.setDefault', name.trim());
      } else if (action === 'Open schema.yaml') {
        await vscode.commands.executeCommand('openspec.schema.openFile', path.join(dest, 'schema.yaml'));
      }
    } catch (err) {
      reportError(err);
    }
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
