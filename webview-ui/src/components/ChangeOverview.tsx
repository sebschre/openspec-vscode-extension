import { useState, useEffect } from 'preact/hooks';
import { ChangeDetail, DesignDecision } from '../../../src/core/types';
import { ExtensionToWebviewMessage } from '../../../src/protocol/messages';
import { getVsCodeApi } from '../vscode';

interface ChangeOverviewProps {
  change: ChangeDetail;
}

interface ValidationState {
  success: boolean;
  stdout: string;
  stderr?: string;
  timestamp: number;
}

export function ChangeOverview({ change }: ChangeOverviewProps) {
  const [copied, setCopied] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationState | null>(null);
  const [isDiagnosticsExpanded, setIsDiagnosticsExpanded] = useState(false);
  const vscode = getVsCodeApi();

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const msg = event.data;
      if (msg.type === 'VALIDATION_RESULT' && msg.changeName === change.name) {
        setIsValidating(false);
        setValidationResult({
          success: msg.success,
          stdout: msg.stdout,
          stderr: msg.stderr,
          timestamp: Date.now(),
        });
        if (!msg.success) {
          setIsDiagnosticsExpanded(true);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [change.name]);

  const handleValidate = () => {
    if (isValidating) return;
    setIsValidating(true);
    vscode.postMessage({ type: 'RUN_VALIDATE', changeName: change.name });
  };

  const handleArchive = () => {
    vscode.postMessage({ type: 'RUN_ARCHIVE', changeName: change.name });
  };

  const handleCopyPropose = () => {
    const promptText = '/opsx-propose';
    vscode.postMessage({
      type: 'COPY_AI_PROMPT',
      changeName: change.name,
      promptText,
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Validation Top Banner */}
      {validationResult && (
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: validationResult.success
              ? 'rgba(46, 160, 67, 0.15)'
              : 'rgba(248, 81, 73, 0.15)',
            border: `1px solid ${
              validationResult.success ? 'var(--badge-added, #2ea043)' : 'var(--badge-removed, #f85149)'
            }`,
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className={validationResult.success ? 'codicon codicon-pass' : 'codicon codicon-error'}
                style={{
                  fontSize: '16px',
                  color: validationResult.success ? 'var(--badge-added, #2ea043)' : 'var(--badge-removed, #f85149)',
                }}
              />
              <span style={{ fontWeight: '600', fontSize: '13px' }}>
                {validationResult.success
                  ? 'Spec Validation Passed: All artifacts and delta specifications are valid.'
                  : 'Spec Validation Reported Issues'}
              </span>
            </div>
            <button
              onClick={() => setValidationResult(null)}
              title="Dismiss validation banner"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--fg)',
                cursor: 'pointer',
                opacity: 0.7,
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span className="codicon codicon-close" />
            </button>
          </div>

          {/* Diagnostics toggle / content */}
          {(validationResult.stdout || validationResult.stderr) && (
            <div>
              <button
                type="button"
                onClick={() => setIsDiagnosticsExpanded(!isDiagnosticsExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className={`codicon ${isDiagnosticsExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right'}`} />
                <span>{isDiagnosticsExpanded ? 'Hide diagnostic output' : 'Show diagnostic output'}</span>
              </button>
              {isDiagnosticsExpanded && (
                <pre
                  style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    color: 'var(--fg)',
                  }}
                >
                  {validationResult.stdout || validationResult.stderr}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hero Card */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.5px' }}>
              OpenSpec Change Proposal
            </div>
            <h2 style={{ margin: '4px 0 8px 0', fontSize: '22px', fontWeight: '700' }}>
              {change.name}
            </h2>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>
              Schema: <code>{change.schema}</code> · Location: <code>openspec/changes/{change.name}</code>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleValidate}
              disabled={isValidating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: isValidating ? 'rgba(255, 255, 255, 0.2)' : 'var(--accent)',
                color: 'var(--accent-fg)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: isValidating ? 'not-allowed' : 'pointer',
                opacity: isValidating ? 0.7 : 1,
              }}
            >
              <span className={isValidating ? 'codicon codicon-loading codicon-modifier-spin' : 'codicon codicon-check'} />
              <span>{isValidating ? 'Validating...' : 'Validate'}</span>
            </button>

            <button
              onClick={handleArchive}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--fg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              <span className="codicon codicon-archive" />
              <span>Archive</span>
            </button>
          </div>
        </div>

        {/* Motivation / Why */}
        {change.proposal?.why && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.7, marginBottom: '6px' }}>
              Problem / Motivation
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              {change.proposal.why}
            </div>
          </div>
        )}
      </div>

      {/* AI Agent Follow-up Action Card */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(0, 120, 212, 0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(0, 120, 212, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ flex: '1 1 300px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <span className="codicon codicon-sparkle" />
            <span>AI Agent Follow-Up</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>
            Generate Specs & Implementation Plan with AI
          </div>
          <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '2px', lineHeight: '1.4' }}>
            Run the propose slash command in your AI coding assistant (Cursor, Antigravity, Copilot) to generate delta specs and tasks for this change.
          </div>
        </div>

        <button
          onClick={handleCopyPropose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: copied ? 'var(--badge-added, #2ea043)' : 'var(--accent)',
            color: 'var(--accent-fg)',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background-color 0.2s ease',
          }}
        >
          <span className={`codicon ${copied ? 'codicon-check' : 'codicon-copy'}`} />
          <span>{copied ? 'Copied Command!' : 'Copy /opsx-propose'}</span>
        </button>
      </div>

      {/* Scope Fence & What Changes */}
      {change.proposal?.whatChanges && change.proposal.whatChanges.length > 0 && (
        <div
          style={{
            padding: '20px',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '8px',
            border: '1px solid var(--card-border)',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
            What Changes (Scope Fence)
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {change.proposal.whatChanges.map((changeItem: string, idx: number) => (
              <li key={idx} style={{ fontSize: '13px', lineHeight: '1.5' }}>
                {changeItem}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Architectural Decisions */}
      {change.design?.decisions && change.design.decisions.length > 0 && (
        <div
          style={{
            padding: '20px',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '8px',
            border: '1px solid var(--card-border)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
            Architectural Decisions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {change.design.decisions.map((dec: DesignDecision, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.15)',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>
                  {dec.title}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {dec.rationale}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks & Mitigations */}
      {change.design?.risks && change.design.risks.length > 0 && (
        <div
          style={{
            padding: '20px',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '8px',
            border: '1px solid var(--card-border)',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
            Risks & Mitigations
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {change.design.risks.map((risk: string, idx: number) => (
              <li key={idx} style={{ fontSize: '13px', lineHeight: '1.5' }}>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
