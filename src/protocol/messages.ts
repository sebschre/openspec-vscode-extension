import { ChangeDetail } from '../core/types';

export type ExtensionToWebviewMessage =
  | { type: 'SET_CHANGE'; change: ChangeDetail }
  | { type: 'UPDATE_STATE'; change: ChangeDetail }
  | { type: 'NOTICE'; message: string; level: 'info' | 'warning' | 'error' }
  | { type: 'SET_NEW_CHANGE_MODE'; availableSchemas?: string[] }
  | { type: 'INFERRED_CHANGE_NAME'; name: string; isAi: boolean }
  | { type: 'CHANGE_CREATION_ERROR'; error: string };

export type WebviewToExtensionMessage =
  | { type: 'READY' }
  | { type: 'TOGGLE_TASK'; changeName: string; lineIndex: number; completed: boolean }
  | { type: 'RUN_VALIDATE'; changeName: string }
  | { type: 'RUN_ARCHIVE'; changeName: string }
  | { type: 'OPEN_FILE'; filePath: string }
  | { type: 'COPY_AI_PROMPT'; changeName: string; promptText: string }
  | { type: 'INFER_CHANGE_NAME'; description: string }
  | { type: 'SUBMIT_NEW_CHANGE'; name: string; description: string; schema?: string }
  | { type: 'CANCEL_NEW_CHANGE' };
