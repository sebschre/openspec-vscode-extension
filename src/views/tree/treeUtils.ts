import * as vscode from 'vscode';

export function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Opens a file with the cursor on a zero-based line. */
export function openAtLine(filePath: string, line?: number): vscode.Command {
  const args: unknown[] = [vscode.Uri.file(filePath)];
  if (line !== undefined) args.push({ selection: new vscode.Range(line, 0, line, 0) });
  return { command: 'vscode.open', title: 'Open File', arguments: args };
}

/** Badge for the Active Changes view; none when there are no changes. */
export function changesBadge(count: number): vscode.ViewBadge | undefined {
  if (count === 0) return undefined;
  return { value: count, tooltip: `${count} active change${count === 1 ? '' : 's'}` };
}
