import { useState } from 'preact/hooks';
import { ChangeDetail, DesignDecision } from '../../../src/core/types';
import { getVsCodeApi } from '../vscode';

interface DesignViewerProps {
  change: ChangeDetail;
}

export function DesignViewer({ change }: DesignViewerProps) {
  const [copied, setCopied] = useState(false);
  const vscode = getVsCodeApi();

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

  const handleRunProposeInTerminal = () => {
    vscode.postMessage({
      type: 'EXECUTE_TERMINAL_COMMAND',
      command: `/opsx-propose`,
    });
  };

  const hasDesign =
    change.artifactsPresent.design &&
    change.design &&
    (change.design.context ||
      change.design.goals.length > 0 ||
      change.design.nonGoals.length > 0 ||
      change.design.decisions.length > 0 ||
      change.design.risks.length > 0);

  if (!hasDesign) {
    return (
      <div
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <span
          className="codicon codicon-lightbulb"
          style={{ fontSize: '36px', color: 'var(--accent)', opacity: 0.9 }}
        />
        <div style={{ maxWidth: '520px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
            No Technical Design Document Yet
          </h3>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.8, lineHeight: '1.6' }}>
            This change does not currently have a <code>design.md</code> document. OpenSpec uses
            technical design documents to clarify architectural decisions, goals, non-goals, and
            trade-offs before implementation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
          <button
            onClick={handleCopyPropose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: copied ? 'var(--badge-added, #2ea043)' : 'rgba(255, 255, 255, 0.08)',
              color: 'var(--fg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
          >
            <span className={`codicon ${copied ? 'codicon-check' : 'codicon-copy'}`} />
            <span>{copied ? 'Copied Command!' : 'Copy Prompt'}</span>
          </button>

          <button
            onClick={handleRunProposeInTerminal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <span className="codicon codicon-terminal" />
            <span>Run /opsx-propose in Terminal</span>
          </button>
        </div>
      </div>
    );
  }

  const design = change.design!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Design Header Card */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                letterSpacing: '0.5px',
              }}
            >
              Technical Design
            </div>
            <h2 style={{ margin: '4px 0 8px 0', fontSize: '22px', fontWeight: '700' }}>
              Architecture & Decisions: {change.name}
            </h2>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>
              Source: <code>openspec/changes/{change.name}/design.md</code>
            </div>
          </div>

          <div
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(0, 120, 212, 0.15)',
              borderRadius: '6px',
              border: '1px solid var(--accent)',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--fg)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="codicon codicon-circuit-board" />
            <span>{design.decisions.length} Architectural {design.decisions.length === 1 ? 'Decision' : 'Decisions'}</span>
          </div>
        </div>

        {/* Context */}
        {design.context && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                opacity: 0.7,
                marginBottom: '6px',
              }}
            >
              Context & Constraints
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {design.context}
            </div>
          </div>
        )}
      </div>

      {/* Goals & Non-Goals Grid */}
      {(design.goals.length > 0 || design.nonGoals.length > 0) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Goals */}
          {design.goals.length > 0 && (
            <div
              style={{
                padding: '18px',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                <span className="codicon codicon-check" style={{ color: 'var(--badge-added, #2ea043)' }} />
                <span>Goals</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {design.goals.map((g, idx) => (
                  <li key={idx} style={{ fontSize: '13px', lineHeight: '1.5' }}>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Non-Goals */}
          {design.nonGoals.length > 0 && (
            <div
              style={{
                padding: '18px',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                <span className="codicon codicon-circle-slash" style={{ opacity: 0.7 }} />
                <span>Non-Goals</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {design.nonGoals.map((ng, idx) => (
                  <li key={idx} style={{ fontSize: '13px', lineHeight: '1.5', opacity: 0.85 }}>
                    {ng}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Architectural Decisions */}
      {design.decisions.length > 0 && (
        <div
          style={{
            padding: '20px',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '8px',
            border: '1px solid var(--card-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span className="codicon codicon-git-commit" style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Architectural Decisions
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {design.decisions.map((dec: DesignDecision, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.15)',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="codicon codicon-symbol-misc" style={{ color: 'var(--accent)', fontSize: '13px' }} />
                  <span>{dec.title}</span>
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {dec.rationale}
                </div>
                {dec.alternative && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      opacity: 0.85,
                      fontStyle: 'italic',
                    }}
                  >
                    Alternatives considered: {dec.alternative}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks & Mitigations */}
      {design.risks.length > 0 && (
        <div
          style={{
            padding: '20px',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '8px',
            border: '1px solid var(--card-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span className="codicon codicon-warning" style={{ color: 'var(--badge-removed, #f85149)' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Risks & Mitigations
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {design.risks.map((risk: string, idx: number) => (
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
