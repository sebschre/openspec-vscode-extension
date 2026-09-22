import { useState, useMemo } from 'preact/hooks';
import { SpecDetail, RequirementItem } from '../../../src/core/types';
import { ScenarioBlock } from './ScenarioBlock';
import { getVsCodeApi } from '../vscode';

interface LivingSpecViewerProps {
  spec: SpecDetail;
}

export function renderHighlightedText(text: string) {
  if (!text) return null;
  const parts = text.split(/\b(SHALL NOT|MUST NOT|SHALL|MUST|SHOULD|MAY)\b/g);
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    const upper = part.toUpperCase();
    if (upper === 'SHALL' || upper === 'MUST' || upper === 'SHALL NOT' || upper === 'MUST NOT') {
      return (
        <span
          key={idx}
          style={{
            fontWeight: '700',
            padding: '1px 5px',
            borderRadius: '4px',
            backgroundColor: 'rgba(210, 153, 34, 0.25)',
            color: '#e3b341',
            border: '1px solid rgba(210, 153, 34, 0.4)',
            fontSize: '12px',
            margin: '0 2px',
            display: 'inline-block',
          }}
        >
          {part}
        </span>
      );
    }
    if (upper === 'SHOULD') {
      return (
        <span
          key={idx}
          style={{
            fontWeight: '700',
            padding: '1px 5px',
            borderRadius: '4px',
            backgroundColor: 'rgba(56, 139, 253, 0.25)',
            color: '#58a6ff',
            border: '1px solid rgba(56, 139, 253, 0.4)',
            fontSize: '12px',
            margin: '0 2px',
            display: 'inline-block',
          }}
        >
          {part}
        </span>
      );
    }
    if (upper === 'MAY') {
      return (
        <span
          key={idx}
          style={{
            fontWeight: '700',
            padding: '1px 5px',
            borderRadius: '4px',
            backgroundColor: 'rgba(110, 118, 129, 0.25)',
            color: '#8b949e',
            border: '1px solid rgba(110, 118, 129, 0.4)',
            fontSize: '12px',
            margin: '0 2px',
            display: 'inline-block',
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export function LivingSpecViewer({ spec }: LivingSpecViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [normativeFilter, setNormativeFilter] = useState<'ALL' | 'MUST' | 'SHOULD' | 'MAY'>('ALL');
  const [copied, setCopied] = useState(false);
  const vscode = getVsCodeApi();

  const handleOpenFile = () => {
    if (spec.filePath) {
      vscode.postMessage({ type: 'OPEN_FILE', filePath: spec.filePath });
    }
  };

  const handleCopySummary = () => {
    const summary = `# Spec: ${spec.capability}\n\n## Purpose\n${spec.purpose || 'N/A'}\n\n## Requirements\n` +
      spec.requirements.map(r => `### ${r.title}\n${r.description}\n`).join('\n');
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredRequirements = useMemo(() => {
    return spec.requirements.filter((req) => {
      // Normative filter
      if (normativeFilter !== 'ALL') {
        const fullText = (req.title + ' ' + req.description).toUpperCase();
        if (normativeFilter === 'MUST') {
          if (!fullText.includes('SHALL') && !fullText.includes('MUST')) return false;
        } else if (normativeFilter === 'SHOULD') {
          if (!fullText.includes('SHOULD')) return false;
        } else if (normativeFilter === 'MAY') {
          if (!fullText.includes('MAY')) return false;
        }
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = req.title.toLowerCase().includes(q);
      const inDesc = req.description.toLowerCase().includes(q);
      const inScenarios = req.scenarios.some(
        (sc) =>
          sc.name.toLowerCase().includes(q) ||
          (sc.given && sc.given.toLowerCase().includes(q)) ||
          sc.when.toLowerCase().includes(q) ||
          sc.then.toLowerCase().includes(q)
      );

      return inTitle || inDesc || inScenarios;
    });
  }, [spec.requirements, searchQuery, normativeFilter]);

  const totalScenarios = spec.requirements.reduce((acc, r) => acc + r.scenarios.length, 0);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hero Card */}
      <div
        style={{
          padding: '24px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  letterSpacing: '0.5px',
                  backgroundColor: 'rgba(0, 120, 212, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(0, 120, 212, 0.3)',
                }}
              >
                Living Capability Spec
              </span>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>
                {spec.requirements.length} requirement{spec.requirements.length === 1 ? '' : 's'} · {totalScenarios} scenario{totalScenarios === 1 ? '' : 's'}
              </span>
            </div>
            <h1 style={{ margin: '4px 0 8px 0', fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="codicon codicon-book" style={{ color: 'var(--accent)' }} />
              <span>{spec.capability}</span>
            </h1>
            {spec.filePath && (
              <div style={{ fontSize: '13px', opacity: 0.8 }}>
                Location: <code>{spec.filePath.split('/openspec/').slice(-1)[0] ? `openspec/${spec.filePath.split('/openspec/').slice(-1)[0]}` : spec.filePath}</code>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleOpenFile}
              title="Open raw markdown in editor"
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
              <span className="codicon codicon-go-to-file" />
              <span>Open Markdown</span>
            </button>
            <button
              onClick={handleCopySummary}
              title="Copy markdown summary to clipboard"
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
              <span className={`codicon ${copied ? 'codicon-check' : 'codicon-copy'}`} />
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>
          </div>
        </div>

        {/* Purpose Statement */}
        {spec.purpose && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
              borderLeft: '4px solid var(--accent)',
              fontSize: '13.5px',
              lineHeight: '1.6',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>
              Capability Purpose
            </div>
            <div>{spec.purpose}</div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <span
            className="codicon codicon-search"
            style={{ position: 'absolute', left: '10px', top: '9px', opacity: 0.6, fontSize: '14px' }}
          />
          <input
            type="text"
            value={searchQuery}
            onInput={(e: any) => setSearchQuery(e.target.value)}
            placeholder="Search requirements, scenarios, Given/When/Then..."
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              backgroundColor: 'var(--vscode-input-background, rgba(0,0,0,0.2))',
              border: '1px solid var(--vscode-input-border, var(--card-border))',
              color: 'var(--vscode-input-foreground, var(--fg))',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '7px',
                background: 'none',
                border: 'none',
                color: 'var(--fg)',
                cursor: 'pointer',
                opacity: 0.6,
              }}
            >
              <span className="codicon codicon-close" />
            </button>
          )}
        </div>

        {/* Normative Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', opacity: 0.7, marginRight: '4px' }}>Normative Filter:</span>
          {(['ALL', 'MUST', 'SHOULD', 'MAY'] as const).map((tag) => (
            <button
              key={tag}
              onClick={() => setNormativeFilter(tag)}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                border: normativeFilter === tag ? '1px solid var(--accent)' : '1px solid var(--card-border)',
                backgroundColor: normativeFilter === tag ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
                color: normativeFilter === tag ? 'var(--accent-fg)' : 'var(--fg)',
              }}
            >
              {tag === 'ALL' ? 'All' : tag === 'MUST' ? 'SHALL / MUST' : tag}
            </button>
          ))}
        </div>
      </div>

      {/* Requirements List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
            Normative Requirements ({filteredRequirements.length} of {spec.requirements.length})
          </h2>
        </div>

        {filteredRequirements.length === 0 ? (
          <div
            style={{
              padding: '36px',
              textAlign: 'center',
              backgroundColor: 'var(--card-bg)',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              opacity: 0.7,
            }}
          >
            <span className="codicon codicon-info" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }} />
            No requirements match the active search query or filter.
          </div>
        ) : (
          filteredRequirements.map((req: RequirementItem, rIdx: number) => (
            <div
              key={rIdx}
              style={{
                padding: '18px',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: '600' }}>
                  {req.title}
                </h3>
                {req.operation && req.operation !== 'STANDARD' && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(0, 120, 212, 0.15)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(0, 120, 212, 0.3)',
                    }}
                  >
                    {req.operation}
                  </span>
                )}
              </div>

              {/* Requirement Description with Normative Highlighting */}
              {req.description && (
                <div
                  style={{
                    fontSize: '13.5px',
                    lineHeight: '1.6',
                    color: 'var(--fg)',
                    opacity: 0.95,
                    marginBottom: req.scenarios.length > 0 ? '16px' : '0',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {renderHighlightedText(req.description)}
                </div>
              )}

              {/* Acceptance Scenarios */}
              {req.scenarios.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Acceptance Scenarios ({req.scenarios.length})
                  </div>
                  {req.scenarios.map((sc, sIdx) => (
                    <ScenarioBlock key={sIdx} scenario={sc} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
