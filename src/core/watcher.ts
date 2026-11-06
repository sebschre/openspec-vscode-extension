import * as vscode from 'vscode';
import { OpenSpecStateStore } from './store';

export class WorkspaceWatcher implements vscode.Disposable {
  private fileWatcher?: vscode.FileSystemWatcher;
  private debounceTimer?: NodeJS.Timeout;
  private debounceMs: number;
  private store: OpenSpecStateStore;

  private extraWatchers: vscode.FileSystemWatcher[] = [];

  /**
   * @param extraDirs Directories outside the workspace to watch as well
   *   (e.g. the user-level schema overrides directory).
   */
  constructor(store: OpenSpecStateStore, private extraDirs: string[] = [], debounceMs = 75) {
    this.store = store;
    this.debounceMs = debounceMs;
    this.init();
  }

  private init() {
    this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/openspec/**');
    for (const dir of this.extraDirs) {
      this.extraWatchers.push(
        vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(dir), '**'))
      );
    }

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

    for (const watcher of [this.fileWatcher, ...this.extraWatchers]) {
      watcher.onDidCreate(triggerUpdate);
      watcher.onDidChange(triggerUpdate);
      watcher.onDidDelete(triggerUpdate);
    }
  }

  public dispose() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.fileWatcher?.dispose();
    this.extraWatchers.forEach((w) => w.dispose());
  }
}
