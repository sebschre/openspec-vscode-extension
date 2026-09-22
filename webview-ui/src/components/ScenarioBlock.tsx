import { ScenarioItem } from '../../../src/core/types';

export function ScenarioBlock({ scenario }: { scenario: ScenarioItem }) {
  return (
    <div
      style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '6px',
        border: '1px solid var(--card-border)',
      }}
    >
      <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px', color: 'var(--fg)' }}>
        <span style={{ opacity: 0.7 }}>Scenario:</span> {scenario.name}
      </div>

      {scenario.given && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(110, 118, 129, 0.4)',
              color: '#d1d5db',
            }}
          >
            GIVEN
          </span>
          <span style={{ fontSize: '13px' }}>{scenario.given}</span>
        </div>
      )}

      {scenario.when && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(56, 139, 253, 0.25)',
              color: '#58a6ff',
            }}
          >
            WHEN
          </span>
          <span style={{ fontSize: '13px' }}>{scenario.when}</span>
        </div>
      )}

      {scenario.then && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(46, 160, 67, 0.25)',
              color: '#3fb950',
            }}
          >
            THEN
          </span>
          <span style={{ fontSize: '13px' }}>{scenario.then}</span>
        </div>
      )}
    </div>
  );
}
