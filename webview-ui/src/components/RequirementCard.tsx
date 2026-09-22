import { RequirementItem, ScenarioItem } from '../../../src/core/types';
import { ScenarioBlock } from './ScenarioBlock';
import { renderHighlightedText } from './LivingSpecViewer';

interface RequirementCardProps {
  req: RequirementItem;
}

export function RequirementCard({ req }: RequirementCardProps) {
  const getBadgeStyle = (op: string) => {
    switch (op) {
      case 'ADDED':
        return { bg: 'rgba(46, 160, 67, 0.2)', text: '#3fb950', border: 'rgba(46, 160, 67, 0.4)' };
      case 'MODIFIED':
        return { bg: 'rgba(210, 153, 34, 0.2)', text: '#d29922', border: 'rgba(210, 153, 34, 0.4)' };
      case 'REMOVED':
        return { bg: 'rgba(248, 81, 73, 0.2)', text: '#f85149', border: 'rgba(248, 81, 73, 0.4)' };
      default:
        return { bg: 'rgba(110, 118, 129, 0.2)', text: '#8b949e', border: 'rgba(110, 118, 129, 0.4)' };
    }
  };

  const badge = getBadgeStyle(req.operation);

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>
          {req.title}
        </h4>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '700',
            padding: '3px 8px',
            borderRadius: '12px',
            backgroundColor: badge.bg,
            color: badge.text,
            border: `1px solid ${badge.border}`,
          }}
        >
          {req.operation}
        </span>
      </div>

      {req.description && (
        <div style={{ fontSize: '13px', color: 'var(--fg)', opacity: 0.9, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
          {renderHighlightedText(req.description)}
        </div>
      )}

      {req.scenarios.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Acceptance Scenarios ({req.scenarios.length})
          </div>
          {req.scenarios.map((sc: ScenarioItem, idx: number) => (
            <ScenarioBlock key={idx} scenario={sc} />
          ))}
        </div>
      )}
    </div>
  );
}
