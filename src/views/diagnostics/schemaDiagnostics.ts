import * as fs from 'fs';
import * as vscode from 'vscode';
import { OpenSpecStateStore } from '../../core/store';
import { findIssueLine } from '../../core/schemas';
import { SchemaDetail } from '../../core/types';

/** Schemas whose problems belong in the Problems panel; built-ins are not the user's to fix. */
function reportsDiagnostics(schema: SchemaDetail): boolean {
  return (schema.source === 'project' || schema.source === 'user') && !!schema.schemaPath;
}

/**
 * Mirrors the structural issues of project and user schemas into the Problems
 * panel, placed on the artifact or apply entry they concern.
 */
export class SchemaDiagnostics implements vscode.Disposable {
  private readonly listener = () => this.update();

  constructor(
    private readonly store: OpenSpecStateStore,
    private readonly collection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('openspec-schemas')
  ) {
    this.store.on('change', this.listener);
    this.update();
  }

  public update(): void {
    this.collection.clear();
    for (const schema of this.store.getState().schemas) {
      if (!reportsDiagnostics(schema) || schema.issues.length === 0) continue;
      let lines: string[] = [];
      try {
        lines = fs.readFileSync(schema.schemaPath, 'utf8').split(/\r?\n/);
      } catch {
        // the file vanished between scan and update; place everything on line 0
      }
      const text = lines.join('\n');
      const diagnostics = schema.issues.map((issue) => {
        const line = findIssueLine(text, issue);
        const range = new vscode.Range(line, 0, line, (lines[line] ?? '').length);
        const diagnostic = new vscode.Diagnostic(
          range,
          issue.message,
          issue.level === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = 'OpenSpec';
        return diagnostic;
      });
      this.collection.set(vscode.Uri.file(schema.schemaPath), diagnostics);
    }
  }

  public dispose(): void {
    this.store.off('change', this.listener);
    this.collection.dispose();
  }
}
