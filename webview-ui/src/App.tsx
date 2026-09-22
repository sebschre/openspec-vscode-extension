import { useState, useEffect } from 'preact/hooks';
import { ChangeDetail, SpecDetail, RequirementItem } from '../../src/core/types';
import { ExtensionToWebviewMessage } from '../../src/protocol/messages';
import { getVsCodeApi } from './vscode';
import { PipelineRail } from './components/PipelineRail';
import { ChangeOverview } from './components/ChangeOverview';
import { RequirementCard } from './components/RequirementCard';
import { LiveTaskList } from './components/LiveTaskList';

export function App() {
  const [change, setChange] = useState<ChangeDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'tasks'>('overview');
  const vscode = getVsCodeApi();

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const msg = event.data;
      if (msg.type === 'SET_CHANGE' || msg.type === 'UPDATE_STATE') {
        setChange(msg.change);
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ type: 'READY' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!change) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', opacity: 0.7 }}>
        <div className="codicon codicon-loading codicon-modifier-spin" style={{ fontSize: '32px', marginBottom: '12px' }} />
        <div>Loading OpenSpec change details...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Top Lifecycle Pipeline Rail */}
      <PipelineRail change={change} activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab as any)} />

      {/* Tab Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '1px solid var(--card-border)',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'overview' ? 'var(--fg)' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'overview' ? '600' : '400',
          }}
        >
          Overview & Decisions
        </button>

        <button
          onClick={() => setActiveTab('specs')}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'specs' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'specs' ? 'var(--fg)' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'specs' ? '600' : '400',
          }}
        >
          Delta Specs ({change.specs.reduce((acc: number, s: SpecDetail) => acc + s.requirements.length, 0)} reqs)
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'tasks' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'tasks' ? 'var(--fg)' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'tasks' ? '600' : '400',
          }}
        >
          Tasks Checklist ({change.taskProgress.completed}/{change.taskProgress.total})
        </button>
      </div>

      {/* Main Content Pane */}
      {activeTab === 'overview' && <ChangeOverview change={change} />}

      {activeTab === 'specs' && (
        <div>
          {change.specs.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6, backgroundColor: 'var(--card-bg)', borderRadius: '8px' }}>
              No delta specs defined for this change yet.
            </div>
          ) : (
            change.specs.map((spec: SpecDetail, sIdx: number) => (
              <div key={sIdx} style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="codicon codicon-book" style={{ color: 'var(--accent)' }} />
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '600' }}>
                    Capability: {spec.capability}
                  </h3>
                </div>
                {spec.purpose && (
                  <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px', fontStyle: 'italic' }}>
                    {spec.purpose}
                  </div>
                )}
                {spec.requirements.map((req: RequirementItem, rIdx: number) => (
                  <RequirementCard key={rIdx} req={req} />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'tasks' && <LiveTaskList change={change} />}
    </div>
  );
}
