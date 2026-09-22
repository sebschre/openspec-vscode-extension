import { useState } from 'preact/hooks';
import { ChangeDetail, TaskItem } from '../../../src/core/types';
import { getVsCodeApi } from '../vscode';

interface LiveTaskListProps {
  change: ChangeDetail;
}

export function LiveTaskList({ change }: LiveTaskListProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const vscode = getVsCodeApi();

  const handleToggle = (task: TaskItem) => {
    vscode.postMessage({
      type: 'TOGGLE_TASK',
      changeName: change.name,
      lineIndex: task.lineIndex,
      completed: !task.completed,
    });
  };

  const copyNextTaskPrompt = () => {
    const nextTask = change.tasks.find((t: TaskItem) => !t.completed);
    if (!nextTask) {
      vscode.postMessage({
        type: 'COPY_AI_PROMPT',
        changeName: change.name,
        promptText: `All tasks for change '${change.name}' are complete! Run openspec validate and openspec archive.`,
      });
      return;
    }

    const prompt = `Please implement the next task for OpenSpec change '${change.name}':
Task ${nextTask.id}: ${nextTask.description} (Group: ${nextTask.group})

Refer to the change proposal at openspec/changes/${change.name}/proposal.md and design at openspec/changes/${change.name}/design.md. When completed, check off the task in openspec/changes/${change.name}/tasks.md.`;

    vscode.postMessage({
      type: 'COPY_AI_PROMPT',
      changeName: change.name,
      promptText: prompt,
    });
  };

  const runApplyInTerminal = () => {
    vscode.postMessage({
      type: 'EXECUTE_TERMINAL_COMMAND',
      command: `/opsx-apply ${change.name}`,
    });
  };

  // Group tasks by group
  const groupedTasks: Record<string, TaskItem[]> = {};
  for (const task of change.tasks) {
    if (filter === 'pending' && task.completed) continue;
    if (filter === 'completed' && !task.completed) continue;

    if (!groupedTasks[task.group]) {
      groupedTasks[task.group] = [];
    }
    groupedTasks[task.group].push(task);
  }

  const { total, completed, percentage } = change.taskProgress;

  return (
    <div>
      {/* Header and Progress */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Tasks Checklist</h3>
          <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>
            {completed} of {total} completed ({percentage}%)
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Filter buttons */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            {(['all', 'pending', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  backgroundColor: filter === f ? 'var(--accent)' : 'transparent',
                  color: filter === f ? 'var(--accent-fg)' : 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Copy Prompt button */}
          <button
            onClick={copyNextTaskPrompt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--fg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            <span className="codicon codicon-copy" />
            <span>Copy AI Prompt</span>
          </button>

          {/* One-Click Implement in Terminal button */}
          <button
            onClick={runApplyInTerminal}
            title="One-click execution of implementation command in dedicated terminal"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            <span className="codicon codicon-terminal" />
            <span>Implement in Terminal</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: '6px',
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: percentage === 100 ? 'var(--badge-added)' : 'var(--accent)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Grouped Task List */}
      {Object.keys(groupedTasks).length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', opacity: 0.6, fontSize: '14px' }}>
          No tasks match the '{filter}' filter.
        </div>
      ) : (
        Object.entries(groupedTasks).map(([groupName, tasks]) => (
          <div key={groupName} style={{ marginBottom: '20px' }}>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.7,
                marginBottom: '10px',
                borderBottom: '1px solid var(--card-border)',
                paddingBottom: '4px',
              }}
            >
              {groupName}
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasks.map((task: TaskItem) => (
                <label
                  key={task.lineIndex}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: task.completed ? 'rgba(255, 255, 255, 0.02)' : 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task)}
                    style={{
                      marginTop: '3px',
                      cursor: 'pointer',
                      accentColor: 'var(--accent)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '13px',
                      lineHeight: '1.4',
                      color: 'var(--fg)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.6 : 1,
                    }}
                  >
                    <strong style={{ marginRight: '6px' }}>{task.id}</strong>
                    {task.description}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
