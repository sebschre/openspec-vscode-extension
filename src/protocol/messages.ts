import { ChangeDetail } from '../core/types';

export type ExtensionToWebviewMessage =
  | { type: 'SET_CHANGE'; change: ChangeDetail }
  | { type: 'UPDATE_STATE'; change: ChangeDetail }
  | { type: 'NOTICE'; message: string; level: 'info' | 'warning' | 'error' };

export type WebviewToExtensionMessage =
  | { type: 'READY' }
  | { type: 'TOGGLE_TASK'; changeName: string; lineIndex: number; completed: boolean }
  | { type: 'RUN_VALIDATE'; changeName: string }
  | { type: 'RUN_ARCHIVE'; changeName: string }
  | { type: 'OPEN_FILE'; filePath: string }
  | { type: 'COPY_AI_PROMPT'; changeName: string; promptText: string };
