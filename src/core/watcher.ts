import * as vscode from 'vscode';
import { OpenSpecStateStore } from './store';

export class WorkspaceWatcher implements vscode.Disposable {
  private fileWatcher?: vscode.FileSystemWatcher;
  private debounceTimer?: NodeJS.Timeout;
  private debounceMs: number;
  private store: OpenSpecStateStore;

  constructor(store: OpenSpecStateStore, debounceMs = 75) {
    this.store = store;
    this.debounceMs = debounceMs;
    this.init();
  }

  private init() {
    this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/openspec/**');

    const triggerUpdate = () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(async () => {
        try {
          await this.store.refresh();
        } catch (err) {
          console.error('[OpenSpec] Error during debounced state refresh:', err);
        }
      }, this.debounceMs);
    };

    this.fileWatcher.onDidCreate(triggerUpdate);
    this.fileWatcher.onDidChange(triggerUpdate);
    this.fileWatcher.onDidDelete(triggerUpdate);
  }

  public dispose() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.fileWatcher?.dispose();
  }
}
