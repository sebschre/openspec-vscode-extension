import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../../core/store';
import { SchemaArtifact, SchemaDetail, SchemaIssue, SchemaLineage } from '../../core/types';

type SchemaTreeElement = SchemaItem | SchemaArtifactItem | SchemaApplyItem | SchemaIssueItem;

export const SOURCE_LABEL: Record<SchemaDetail['source'], string> = {
  project: 'project',
  user: 'user',
  package: 'built-in',
};

/** Project and user schemas are editable in place; built-ins must be forked first. */
export function isEditableSchema(schema: SchemaDetail): boolean {
  return schema.source !== 'package' && !!schema.dirPath;
}

/** "Forked from spec-driven (built-in, v1) on 2026-11-07. …" */
export function describeLineage(lineage: SchemaLineage): string {
  const version = lineage.version !== undefined ? `, v${lineage.version}` : '';
  const date = lineage.forkedAt ? ` on ${lineage.forkedAt}` : '';
  let text = `Forked from **${lineage.schema}** (${SOURCE_LABEL[lineage.source]}${version})${date}.`;
  if (lineage.available === false) text += ' The source can no longer be found.';
  else if (lineage.updated) text += ` The source is now at v${lineage.sourceVersion}.`;
  return text;
}

export class SchemaItem extends vscode.TreeItem {
  constructor(public readonly schema: SchemaDetail) {
    super(
      schema.name,
      schema.artifacts.length > 0 || schema.issues.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    // Stable across refreshes, so a freshly built item can be revealed.
    this.id = `schema:${schema.name}`;
    const lineage = schema.forkedFrom;

    const errors = schema.issues.filter((i) => i.level === 'error').length;
    const parts = [SOURCE_LABEL[schema.source]];
    if (schema.isDefault) parts.push('default');
    if (lineage) parts.push(`fork of ${lineage.schema}${lineage.updated ? ' (source updated)' : ''}`);
    if (schema.artifacts.length) parts.push(`${schema.artifacts.length} artifacts`);
    if (errors) parts.push(`${errors} error${errors === 1 ? '' : 's'}`);
    this.description = parts.join(' · ');

    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${schema.name}**${schema.version ? ` (v${schema.version})` : ''}\n\n`);
    if (schema.description) tooltip.appendMarkdown(`${schema.description}\n\n`);
    tooltip.appendMarkdown(`Source: ${SOURCE_LABEL[schema.source]}${schema.isDefault ? ' · project default' : ''}\n\n`);
    if (lineage) tooltip.appendMarkdown(`${describeLineage(lineage)}\n\n`);
    if (schema.artifacts.length) {
      tooltip.appendMarkdown(`Pipeline: ${schema.artifacts.map((a) => a.id).join(' → ')}\n\n`);
    }
    if (schema.shadows.length) {
      tooltip.appendMarkdown(`Overrides the ${schema.shadows.map((s) => SOURCE_LABEL[s]).join(', ')} schema of the same name\n\n`);
    }
    if (schema.usedByChanges.length) {
      tooltip.appendMarkdown(`Used by: ${schema.usedByChanges.join(', ')}\n\n`);
    }
    if (schema.dirPath) tooltip.appendMarkdown(`\`${schema.dirPath}\``);
    this.tooltip = tooltip;

    if (errors) {
      this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'));
    } else if (schema.isDefault) {
      this.iconPath = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));
    } else {
      this.iconPath = new vscode.ThemeIcon(schema.source === 'package' ? 'package' : 'symbol-structure');
    }

    // e.g. "schema.project", "schema.user.default", "schema.project.default.fork", "schema.package.unresolved"
    this.contextValue =
      `schema.${schema.source}${schema.isDefault ? '.default' : ''}` +
      `${lineage && schema.dirPath ? '.fork' : ''}${schema.dirPath ? '' : '.unresolved'}`;

    if (schema.schemaPath) {
      this.command = {
        command: 'openspec.schema.openFile',
        title: 'Open schema.yaml',
        arguments: [schema.schemaPath],
      };
    }
  }
}

export class SchemaArtifactItem extends vscode.TreeItem {
  constructor(
    public readonly artifact: SchemaArtifact,
    public readonly schema: SchemaDetail
  ) {
    super(artifact.id, vscode.TreeItemCollapsibleState.None);

    const needs = artifact.requires.length ? ` ← ${artifact.requires.join(', ')}` : '';
    this.description = `${artifact.generates}${needs}`;

    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${artifact.id}** → \`${artifact.generates}\`\n\n`);
    if (artifact.description) tooltip.appendMarkdown(`${artifact.description}\n\n`);
    tooltip.appendMarkdown(`Requires: ${artifact.requires.length ? artifact.requires.join(', ') : 'nothing'}\n\n`);
    tooltip.appendMarkdown(
      `Template: \`templates/${artifact.template}\`${artifact.templateExists ? '' : ' (missing)'}`
    );
    this.tooltip = tooltip;

    this.iconPath = new vscode.ThemeIcon(
      artifact.templateExists ? 'file-text' : 'warning',
      artifact.templateExists ? undefined : new vscode.ThemeColor('problemsWarningIcon.foreground')
    );
    this.contextValue = isEditableSchema(schema) ? 'schemaArtifact.editable' : 'schemaArtifact';

    if (artifact.templatePath && artifact.templateExists) {
      this.command = {
        command: 'openspec.schema.openFile',
        title: 'Open Template',
        arguments: [artifact.templatePath],
      };
    }
  }
}

export class SchemaApplyItem extends vscode.TreeItem {
  constructor(public readonly schema: SchemaDetail) {
    super('apply', vscode.TreeItemCollapsibleState.None);
    const apply = schema.apply!;
    const tracks = apply.tracks ? ` · tracks ${apply.tracks}` : '';
    this.description = `← ${apply.requires.join(', ') || 'nothing'}${tracks}`;
    this.tooltip = apply.instruction || 'Implementation phase';
    this.iconPath = new vscode.ThemeIcon('play');
    this.contextValue = 'schemaApply';
  }
}

export class SchemaIssueItem extends vscode.TreeItem {
  constructor(
    public readonly issue: SchemaIssue,
    public readonly schema: SchemaDetail
  ) {
    super(issue.message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(
      issue.level === 'error' ? 'error' : 'warning',
      new vscode.ThemeColor(issue.level === 'error' ? 'problemsErrorIcon.foreground' : 'problemsWarningIcon.foreground')
    );
    this.contextValue = 'schemaIssue';
    if (schema.schemaPath) {
      this.command = { command: 'openspec.schema.openDefinition', title: 'Show in schema.yaml', arguments: [this] };
    }
  }
}

export class SchemasTreeProvider implements vscode.TreeDataProvider<SchemaTreeElement> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SchemaTreeElement | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<SchemaTreeElement | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private store: OpenSpecStateStore) {
    this.store.on('change', () => this.refresh());
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: SchemaTreeElement): vscode.TreeItem {
    return element;
  }

  /** Builds the root item for a schema, for revealing it in the view. */
  public itemFor(name: string): SchemaItem | undefined {
    const schema = this.store.getSchema(name);
    return schema ? new SchemaItem(schema) : undefined;
  }

  public getParent(element: SchemaTreeElement): SchemaItem | undefined {
    if (element instanceof SchemaItem) return undefined;
    const schema = this.store.getSchema(element.schema.name) ?? element.schema;
    return new SchemaItem(schema);
  }

  public getChildren(element?: SchemaTreeElement): vscode.ProviderResult<SchemaTreeElement[]> {
    if (!element) {
      const state = this.store.getState();
      if (!state.hasOpenSpecRoot) {
        const item = new vscode.TreeItem('No openspec/ folder detected');
        item.iconPath = new vscode.ThemeIcon('info');
        return [item as any];
      }
      return state.schemas.map((s) => new SchemaItem(s));
    }

    if (element instanceof SchemaItem) {
      const { schema } = element;
      const children: SchemaTreeElement[] = schema.issues.map((i) => new SchemaIssueItem(i, schema));
      children.push(...schema.artifacts.map((a) => new SchemaArtifactItem(a, schema)));
      if (schema.apply) children.push(new SchemaApplyItem(schema));
      return children;
    }

    return [];
  }
}
