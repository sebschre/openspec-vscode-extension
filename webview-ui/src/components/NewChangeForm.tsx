import { useState, useEffect, useRef } from 'preact/hooks';
import { ExtensionToWebviewMessage } from '../../../src/protocol/messages';
import { getVsCodeApi } from '../vscode';

interface NewChangeFormProps {
  availableSchemas?: string[];
}

export function NewChangeForm({ availableSchemas = ['spec-driven'] }: NewChangeFormProps) {
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [motivation, setMotivation] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isMotivationAi, setIsMotivationAi] = useState(false);
  const [schema, setSchema] = useState(availableSchemas[0] || 'spec-driven');
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [isInferring, setIsInferring] = useState(false);
  const [isAiInferred, setIsAiInferred] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      } else if (msg.type === 'REFINED_MOTIVATION') {
        setIsRefining(false);
        setMotivation(msg.motivation);
        setIsMotivationAi(msg.isAi);
      } else if (msg.type === 'CHANGE_CREATION_ERROR') {
        setIsSubmitting(false);
        setError(msg.error);
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

  const handleRefineMotivation = () => {
    if (!description.trim() || isRefining) return;
    setIsRefining(true);
    vscode.postMessage({
      type: 'REFINE_MOTIVATION',
      description: description.trim(),
    });
  };

  const handleSubmit = (e?: any) => {
    if (e) e.preventDefault();
    if (!isNameValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    vscode.postMessage({
      type: 'SUBMIT_NEW_CHANGE',
      name: name.trim(),
      description: description.trim(),
      motivation: motivation.trim() || description.trim(),
      schema,
    });
  };


  const handleCancel = () => {
    vscode.postMessage({ type: 'CANCEL_NEW_CHANGE' });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="codicon codicon-diff-added" style={{ fontSize: '20px', color: 'var(--accent)' }} />
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>Create New Change</h2>
        </div>
        <div style={{ fontSize: '13px', opacity: 0.8, lineHeight: '1.5' }}>
          Describe what you want to build or change in natural language. An appropriate kebab-case change slug will be automatically inferred.
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

      {/* Form Container */}
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
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', opacity: 0.7 }}>
            <span>Write in natural language. Will seed proposal.md upon creation.</span>
            {isInferring && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)' }}>
                <span className="codicon codicon-loading codicon-modifier-spin" />
                <span>Inferring name...</span>
              </span>
            )}
          </div>
        </div>

        {/* Proposal Motivation (Why) Refinement Field */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600' }}>
              Proposal Motivation (Why)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {motivation && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: isMotivationAi ? 'rgba(0, 120, 212, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: isMotivationAi ? 'var(--accent)' : 'var(--fg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span className={isMotivationAi ? 'codicon codicon-sparkle' : 'codicon codicon-edit'} />
                  <span>{isMotivationAi ? 'AI Synthesized' : 'Custom'}</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleRefineMotivation}
                disabled={!description.trim() || isRefining}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: '1px solid var(--card-border)',
                  borderRadius: '4px',
                  color: !description.trim() || isRefining ? 'var(--fg-muted, #888)' : 'var(--accent)',
                  cursor: !description.trim() || isRefining ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  padding: '3px 8px',
                  fontWeight: '500',
                }}
              >
                <span className={isRefining ? 'codicon codicon-loading codicon-modifier-spin' : 'codicon codicon-sparkle'} />
                <span>{isRefining ? 'Refining...' : motivation ? 'Re-refine with AI' : 'Refine with AI'}</span>
              </button>
            </div>
          </div>
          <textarea
            value={motivation}
            onInput={(e: any) => setMotivation(e.target.value)}
            placeholder="Synthesized problem and motivation statement for proposal.md (click 'Refine with AI' to generate from your notes above)..."
            rows={4}
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
            }}
          />
          <div style={{ marginTop: '4px', fontSize: '12px', opacity: 0.7 }}>
            This synthesized statement directly seeds the <code>## Why</code> section in <code>proposal.md</code>.
          </div>
        </div>

        {/* Inferred / Editable Name Field */}
        <div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600' }}>
              Change Name (kebab-case)
            </label>
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
                  <span>
                    {isManuallyEdited ? 'Custom' : isAiInferred ? 'AI Inferred' : 'Heuristic'}
                  </span>
                </span>
              )}
              {isManuallyEdited && (
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
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--vscode-input-background, rgba(0,0,0,0.2))',
                border: '1px solid var(--vscode-input-border, var(--card-border))',
                color: 'var(--vscode-input-foreground, var(--fg))',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
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
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              color: 'var(--fg)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
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
              gap: '6px',
              padding: '8px 18px',
              backgroundColor: !isNameValid || isSubmitting ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--accent-fg)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: !isNameValid || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: !isNameValid || isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <span className="codicon codicon-loading codicon-modifier-spin" />
                <span>Creating Change...</span>
              </>
            ) : (
              <>
                <span className="codicon codicon-check" />
                <span>Create Change</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
