import { ChangeDetail, SpecDetail } from '../core/types';

export type GenerationStep = 'scaffolding' | 'proposal' | 'specs' | 'design' | 'tasks' | 'validating';
export type GenerationStepStatus = 'pending' | 'active' | 'completed' | 'error';

export interface GenerationProgressPayload {
  step: GenerationStep;
  status: GenerationStepStatus;
  message?: string;
}

export type ExtensionToWebviewMessage =
  | { type: 'SET_CHANGE'; change: ChangeDetail }
  | { type: 'SET_LIVING_SPEC'; spec: SpecDetail }
  | { type: 'UPDATE_STATE'; change: ChangeDetail }
  | { type: 'NOTICE'; message: string; level: 'info' | 'warning' | 'error' }
  | { type: 'SET_NEW_CHANGE_MODE'; availableSchemas?: string[] }
  | { type: 'INFERRED_CHANGE_NAME'; name: string; isAi: boolean }
  | { type: 'REFINED_MOTIVATION'; motivation: string; isAi: boolean }
  | { type: 'VALIDATION_RESULT'; changeName: string; success: boolean; stdout: string; stderr?: string }
  | { type: 'GENERATION_PROGRESS'; progress: GenerationProgressPayload }
  | { type: 'CHANGE_CREATION_ERROR'; error: string };

export type WebviewToExtensionMessage =
  | { type: 'READY' }
  | { type: 'TOGGLE_TASK'; changeName: string; lineIndex: number; completed: boolean }
  | { type: 'RUN_VALIDATE'; changeName: string }
  | { type: 'RUN_ARCHIVE'; changeName: string }
  | { type: 'OPEN_FILE'; filePath: string }
  | { type: 'COPY_AI_PROMPT'; changeName: string; promptText: string }
  | { type: 'INFER_CHANGE_NAME'; description: string }
  | { type: 'REFINE_MOTIVATION'; description: string }
  | { type: 'SUBMIT_NEW_CHANGE'; name: string; description: string; schema?: string; motivation?: string }
  | { type: 'CANCEL_NEW_CHANGE' }
  | { type: 'OPEN_TERMINAL'; viewColumn?: number }
  | { type: 'EXECUTE_TERMINAL_COMMAND'; command: string; viewColumn?: number };

