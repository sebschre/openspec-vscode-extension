import { useState, useEffect, useRef } from 'preact/hooks';
import { ExtensionToWebviewMessage, GenerationStep } from '../../../src/protocol/messages';
import { getVsCodeApi } from '../vscode';

interface NewChangeFormProps {
  availableSchemas?: string[];
}

interface StepItem {
  key: GenerationStep;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  message?: string;
}

const INITIAL_STEPS: StepItem[] = [
  { key: 'scaffolding', label: '1. Scaffold Change Directory', status: 'pending' },
  { key: 'proposal', label: '2. Generate Proposal (proposal.md)', status: 'pending' },
  { key: 'specs', label: '3. Define Delta Specs (specs/)', status: 'pending' },
  { key: 'design', label: '4. Synthesize Technical Design (design.md)', status: 'pending' },
  { key: 'tasks', label: '5. Formulate Implementation Tasks (tasks.md)', status: 'pending' },
  { key: 'validating', label: '6. Validate OpenSpec Schemas', status: 'pending' },
];

export function NewChangeForm({ availableSchemas = ['spec-driven'] }: NewChangeFormProps) {
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [schema, setSchema] = useState(availableSchemas[0] || 'spec-driven');
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [isInferring, setIsInferring] = useState(false);
  const [isAiInferred, setIsAiInferred] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<StepItem[]>(INITIAL_STEPS);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<any>(null);
  const vscode = getVsCodeApi();

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const msg = event.data;
      if (msg.type === 'INFERRED_CHANGE_NAME') {
        setIsInferring(false);
        if (!isManuallyEdited || !name.trim()) {
          setName(msg.name);
          setIsAiInferred(msg.isAi);
        }
      } else if (msg.type === 'GENERATION_PROGRESS') {
        const { step, status, message } = msg.progress;
        setGenerationSteps((prev) =>
          prev.map((s) => (s.key === step ? { ...s, status, message: message || s.message } : s))
        );
      } else if (msg.type === 'CHANGE_CREATION_ERROR') {
        setIsSubmitting(false);
        setError(msg.error);
        setGenerationSteps((prev) =>
          prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s))
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isManuallyEdited, name]);

  const handleDescriptionChange = (e: any) => {
    const val = e.target.value;
    setDescription(val);
    setError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setIsInferring(false);
      if (!isManuallyEdited) {
        setName('');
      }
      return;
    }

    setIsInferring(true);
    debounceTimerRef.current = setTimeout(() => {
      vscode.postMessage({
        type: 'INFER_CHANGE_NAME',
        description: val,
      });
    }, 400);
  };

  const handleNameChange = (e: any) => {
    const val = e.target.value.toLowerCase().replace(/\s+/g, '-');
    setName(val);
    setIsManuallyEdited(true);
    setError(null);
  };

  const handleResetName = () => {
    setIsManuallyEdited(false);
    if (description.trim()) {
      setIsInferring(true);
      vscode.postMessage({
        type: 'INFER_CHANGE_NAME',
        description,
      });
    }
  };

  const isNameValid = name.trim().length > 0 && /^[a-z0-9-]+$/.test(name.trim());

  const handleSubmit = (e?: any) => {
    if (e) e.preventDefault();
    if (!isNameValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setGenerationSteps(INITIAL_STEPS.map((s, idx) => (idx === 0 ? { ...s, status: 'active' } : s)));

    vscode.postMessage({
      type: 'SUBMIT_NEW_CHANGE',
      name: name.trim(),
      description: description.trim(),
      schema,
    });
  };

  const handleCancel = () => {
    vscode.postMessage({ type: 'CANCEL_NEW_CHANGE' });
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '16px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="codicon codicon-diff-added" style={{ fontSize: '20px', color: 'var(--accent)' }} />
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>Direct Proposal</h2>
        </div>
        <div style={{ fontSize: '13px', opacity: 0.8, lineHeight: '1.5' }}>
          Create an active change and generate all required OpenSpec specification documents (Proposal, Delta Specs, Design, and Tasks) in one cohesive step.
        </div>
      </div>

      {/* Explore Guidance Hint Callout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'rgba(0, 120, 212, 0.08)',
          border: '1px solid rgba(0, 120, 212, 0.25)',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--fg)',
          marginBottom: '20px',
          lineHeight: '1.5',
        }}
      >
        <span className="codicon codicon-lightbulb" style={{ color: 'var(--accent)', fontSize: '18px', flexShrink: 0 }} />
        <div>
          <strong>Looking to brainstorm first?</strong> Open-ended exploration lives in your AI agent chat interface. Run{' '}
          <code
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '600',
              fontFamily: 'monospace',
            }}
          >
            /opsx-explore
          </code>{' '}
          in your assistant (Antigravity, Cursor, Copilot Chat) to discover and clarify requirements before proposing.
        </div>
      </div>

      {/* Error Callout */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: 'rgba(248, 81, 73, 0.15)',
            border: '1px solid var(--badge-removed, #f85149)',
            borderRadius: '6px',
            color: 'var(--fg)',
            fontSize: '13px',
            marginBottom: '20px',
          }}
        >
          <span className="codicon codicon-error" style={{ color: 'var(--badge-removed, #f85149)', marginTop: '2px' }} />
          <div style={{ flex: 1 }}>{error}</div>
        </div>
      )}

      {/* Main Form Container */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '24px',
        }}
      >
        {/* Description Field */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            Change Description & Intent
          </label>
          <textarea
            value={description}
            onInput={handleDescriptionChange}
            disabled={isSubmitting}
            placeholder="e.g. Add GitHub OAuth authentication with secure token storage and login callback handling..."
            rows={5}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'var(--vscode-input-background, rgba(0,0,0,0.2))',
              border: '1px solid var(--vscode-input-border, var(--card-border))',
              color: 'var(--vscode-input-foreground, var(--fg))',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', opacity: 0.7 }}>
            <span>Write in natural language. Will seed the proposal, delta specs, design, and tasks.</span>
            {isInferring && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)' }}>
                <span className="codicon codicon-loading codicon-modifier-spin" />
                <span>Inferring name...</span>
              </span>
            )}
          </div>
        </div>

        {/* Change Name Field */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600' }}>Change Name (kebab-case)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {name && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: isManuallyEdited
                      ? 'rgba(255, 255, 255, 0.1)'
                      : isAiInferred
                      ? 'rgba(0, 120, 212, 0.2)'
                      : 'rgba(210, 153, 34, 0.2)',
                    color: isManuallyEdited
                      ? 'var(--fg)'
                      : isAiInferred
                      ? 'var(--accent)'
                      : 'var(--badge-modified, #d29922)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    className={
                      isManuallyEdited
                        ? 'codicon codicon-edit'
                        : isAiInferred
                        ? 'codicon codicon-sparkle'
                        : 'codicon codicon-symbol-keyword'
                    }
                  />
                  <span>{isManuallyEdited ? 'Custom' : isAiInferred ? 'AI Inferred' : 'Heuristic'}</span>
                </span>
              )}
              {isManuallyEdited && !isSubmitting && (
                <button
                  type="button"
                  onClick={handleResetName}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Re-infer
                </button>
              )}
            </div>
          </div>
          <input
            type="text"
            value={name}
            onInput={handleNameChange}
            disabled={isSubmitting}
            placeholder="e.g. add-github-oauth"
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'var(--vscode-input-background, rgba(0,0,0,0.2))',
              border: `1px solid ${
                name && !isNameValid ? 'var(--badge-removed, #f85149)' : 'var(--vscode-input-border, var(--card-border))'
              }`,
              color: 'var(--vscode-input-foreground, var(--fg))',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
              outline: 'none',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          />
          {name && !isNameValid && (
            <div style={{ color: 'var(--badge-removed, #f85149)', fontSize: '12px', marginTop: '4px' }}>
              Change name must contain only lowercase letters, numbers, and hyphens (e.g. add-feature).
            </div>
          )}
        </div>

        {/* Schema Selector */}
        {availableSchemas.length > 1 && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '8px',
              }}
            >
              Workflow Schema
            </label>
            <select
              value={schema}
              onChange={(e: any) => setSchema(e.target.value)}
              disabled={isSubmitting}
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--vscode-input-background, rgba(0,0,0,0.2))',
                border: '1px solid var(--vscode-input-border, var(--card-border))',
                color: 'var(--vscode-input-foreground, var(--fg))',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {availableSchemas.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live Generation Progress Stepper */}
        {isSubmitting && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="codicon codicon-sparkle" style={{ color: 'var(--accent)', fontSize: '16px' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Generating Complete Specification Suite
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {generationSteps.map((s) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  {s.status === 'completed' && (
                    <span className="codicon codicon-pass" style={{ color: 'var(--badge-added, #2ea043)', fontSize: '16px' }} />
                  )}
                  {s.status === 'active' && (
                    <span
                      className="codicon codicon-loading codicon-modifier-spin"
                      style={{ color: 'var(--accent)', fontSize: '16px' }}
                    />
                  )}
                  {s.status === 'pending' && (
                    <span
                      className="codicon codicon-circle-outline"
                      style={{ opacity: 0.35, fontSize: '16px' }}
                    />
                  )}
                  {s.status === 'error' && (
                    <span className="codicon codicon-error" style={{ color: 'var(--badge-removed, #f85149)', fontSize: '16px' }} />
                  )}
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontWeight: s.status === 'active' ? '600' : '400',
                        color: s.status === 'active' ? 'var(--fg)' : s.status === 'completed' ? 'var(--fg)' : 'rgba(255, 255, 255, 0.6)',
                      }}
                    >
                      {s.label}
                    </span>
                    {s.message && s.status === 'active' && (
                      <span style={{ fontSize: '12px', opacity: 0.7, fontStyle: 'italic' }}>{s.message}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--card-border)',
          }}
        >
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              color: 'var(--fg)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isNameValid || isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              backgroundColor: !isNameValid || isSubmitting ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--accent-fg)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: !isNameValid || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: !isNameValid || isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <span className="codicon codicon-loading codicon-modifier-spin" />
                <span>Generating Specification Suite...</span>
              </>
            ) : (
              <>
                <span className="codicon codicon-sparkle" />
                <span>Create Change & Generate Specs</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
