import { ChangeDetail, DesignDecision } from '../../../src/core/types';
import { getVsCodeApi } from '../vscode';

interface ChangeOverviewProps {
  change: ChangeDetail;
}

export function ChangeOverview({ change }: ChangeOverviewProps) {
  const vscode = getVsCodeApi();

  const handleValidate = () => {
    vscode.postMessage({ type: 'RUN_VALIDATE', changeName: change.name });
  };

  const handleArchive = () => {
    vscode.postMessage({ type: 'RUN_ARCHIVE', changeName: change.name });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <span className="codicon codicon-check" />
              <span>Validate</span>
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
