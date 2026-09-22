import { ChangeDetail } from '../../../src/core/types';

interface PipelineRailProps {
  change: ChangeDetail;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export function PipelineRail({ change, activeTab, onSelectTab }: PipelineRailProps) {
  const steps = [
    {
      id: 'overview',
      label: '1. Proposal',
      isComplete: change.artifactsPresent.proposal,
      isActive: activeTab === 'overview',
    },
    {
      id: 'specs',
      label: '2. Delta Specs',
      isComplete: change.artifactsPresent.specs,
      isActive: activeTab === 'specs',
    },
    {
      id: 'design',
      label: '3. Design',
      isComplete: change.artifactsPresent.design,
      isActive: activeTab === 'design',
    },
    {
      id: 'tasks',
      label: `4. Tasks (${change.taskProgress.completed}/${change.taskProgress.total})`,
      isComplete: change.isComplete,
      isInProgress: change.taskProgress.total > 0 && !change.isComplete,
      isActive: activeTab === 'tasks',
    },
  ];

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
          overflowX: 'auto',
        }}
      >
        {steps.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onSelectTab(step.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                border: step.isActive ? '1px solid var(--accent)' : '1px solid transparent',
                borderRadius: '6px',
                backgroundColor: step.isActive ? 'rgba(0, 120, 212, 0.15)' : 'transparent',
                color: 'var(--fg)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: step.isActive ? '600' : '400',
              }}
            >
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  backgroundColor: step.isComplete
                    ? 'var(--badge-added)'
                    : step.isInProgress
                    ? 'var(--accent)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                }}
              >
                {step.isComplete ? '✓' : idx + 1}
              </span>
              <span>{step.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <span style={{ color: 'var(--card-border)', fontSize: '12px' }}>→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
