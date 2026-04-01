import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store';
import { StatusBadge, ProgressBar, Spinner, TermBlock, FolderTree, QAPanel, CodeBlock } from '../components/UI';
import { Paperclip, X, ShieldAlert, Zap } from 'lucide-react';
import MentorDashboard from '../components/mentor/MentorDashboard';

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ project, milestones, onNew }) {
  return (
    <div className="sidebar">
      <div className="sec-title">Milestones</div>
      {(Array.isArray(milestones) ? milestones : []).map(m => (
        <div key={m.id} className={`ms-item ${m.status === 'in_progress' ? 'ms-active' : m.status === 'completed' ? 'ms-done' : ''}`}>
          <div className="ms-title" style={{ color: m.status === 'locked' ? 'var(--tx-d)' : 'var(--tx)' }}>
            {m.ord || m.order}. {m.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusBadge status={m.status} />
            <span style={{ fontSize: 9, color: 'var(--tx-d)' }}>{m.duration_days}d</span>
          </div>
        </div>
      ))}

      {project && (
        <div style={{ marginTop: 20 }}>
          <div className="sec-title">Stack</div>
          <div style={{ marginBottom: 10 }}>{(project.tech_stack || []).map(t => <span key={t} className="stag">{t}</span>)}</div>
          <div style={{ fontSize: 10, color: 'var(--tx-d)', lineHeight: 2 }}>
            <div>⏱ {project.deadline_days || 0} days</div>
            <div>⚡ {project.skill_level || 'Unknown'}</div>
            <div>✓ {project.completed_tasks || 0}/{project.total_tasks || 0} tasks</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button className="btn btn-g btn-sm" style={{ width: '100%' }} onClick={onNew}>+ New Project</button>
      </div>
    </div>
  );
}

// ─── TASK PANEL ───────────────────────────────────────────────────────────────
function TaskPanel({ task, onSubmit, submitting }) {
  const [sub, setSub] = useState('');
  const [askQ, setAskQ] = useState('');
  const [askImage, setAskImage] = useState(null);
  const [asking, setAsking] = useState(false);
  const [started, setStarted] = useState(task?.status === 'in_progress');
  const { setCurrentTask, chatLog, addChatMessage } = useStore();
  const navigate = useNavigate();

  const handleAskImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAskImage(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const handleStart = async () => {
    try { const r = await api.startTask(task.id); setCurrentTask(r.task); setStarted(true); }
    catch (e) { console.error(e); }
  };

  const handleAsk = async () => {
    if (!askQ.trim() && !askImage) return;
    const msg = askQ; const img = askImage;
    setAskQ(''); setAskImage(null);
    addChatMessage({ role: 'user', content: msg, imageUri: img });
    setAsking(true);
    try { const r = await api.askQuestion(task.id, msg, null, null, img); addChatMessage({ role: 'mentor', content: r.message }); }
    catch (e) { addChatMessage({ role: 'system', content: 'Error: ' + e.message }); }
    setAsking(false);
  };

  const handleHint = async () => {
    setAsking(true);
    try { const r = await api.getHint(task.id); addChatMessage({ role: 'mentor', content: r.message }); }
    catch (e) { addChatMessage({ role: 'system', content: 'Error: ' + e.message }); }
    setAsking(false);
  };

  const handleSub = async () => {
    if (!sub.trim()) return;
    await onSubmit(sub);
    setSub('');
  };

  if (!task) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--tx-d)' }}>
      No active task.
    </div>
  );

  const canInteract = started || task.status === 'in_progress';

  return (
    <div>
      {/* Task card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div className="task-meta">Day {task.day} · {task.estimated_hours}h est · attempt {task.attempts || 0}</div>
            <h2 className="task-ttl">{task.title}</h2>
          </div>
          <StatusBadge status={task.status} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.7, marginBottom: 14 }}>{task.description}</p>

        {(Array.isArray(task.concepts_taught) ? task.concepts_taught : []).length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label className="lbl">Concepts</label>
            {(Array.isArray(task.concepts_taught) ? task.concepts_taught : []).map(c => <span key={c} className="chip">{c}</span>)}
          </div>
        )}
        {(Array.isArray(task.commands) ? task.commands : []).length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label className="lbl">Commands</label>
            <TermBlock lines={(Array.isArray(task.commands) ? task.commands : []).map(c => `$ ${c}`)} />
          </div>
        )}
        {task.folder_structure && Object.keys(task.folder_structure).length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label className="lbl">Folder Structure</label>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
              <FolderTree tree={task.folder_structure} />
            </div>
          </div>
        )}
        {task.starter_template && (
          <div>
            <label className="lbl">Starter Template — complete the TODOs</label>
            <CodeBlock code={task.starter_template} />
          </div>
        )}
        {!canInteract ? (
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-p" onClick={handleStart}>Start Task →</button>
          </div>
        ) : (
          <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-p" onClick={() => navigate('/ide')}>Open IDE Mode</button>
            <button 
                className="btn btn-g" 
                onClick={async () => {
                    await api.requestHelp(project.id);
                    alert("SOS sent! A mentor has been pinged and will review your session.");
                }} 
                style={{ background: '#f85149', color: '#fff', border: 'none' }}
            >
                <ShieldAlert size={14} style={{ marginRight: 6 }}/> Request Live Mentor
            </button>
          </div>
        )}
      </div>

      {/* Ask guidance */}
      {canInteract && (
        <div className="card">
          <label className="lbl">Ask for Guidance</label>
          <div style={{ color: 'var(--tx-d)', fontSize: 10, marginBottom: 8 }}>Be specific. Vague questions get vague hints.</div>
          {askImage && (
            <div style={{ position: 'relative', width: '60px', marginBottom: 8 }}>
              <img src={askImage} alt="Attachment" style={{ width: '100%', borderRadius: '4px' }} />
              <button type="button" onClick={() => setAskImage(null)}
                style={{ position: 'absolute', top: -5, right: -5, background: '#f87171', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              ><X size={12} /></button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ cursor: 'pointer', color: 'var(--tx-2)', display: 'flex', alignItems: 'center', padding: '0 4px' }} title="Attach Screenshot">
              <Paperclip size={16} />
              <input type="file" accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} onChange={handleAskImageUpload} />
            </label>
            <input className="input" style={{ flex: 1, padding: '8px 12px' }}
              placeholder="e.g. How do I add middleware? / Why is my route 404?"
              value={askQ} onChange={e => setAskQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
            />
            <button className="btn btn-g" onClick={handleAsk} disabled={asking}>
              {asking ? <Spinner /> : 'Ask'}
            </button>
          </div>
          {chatLog.length > 0 && (
            <div className="guidance fade-in" style={{ maxHeight: 350, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 8 }}>
              {(Array.isArray(chatLog) ? chatLog : []).map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: m.role === 'user' ? 'var(--blue)' : 'var(--green)', marginBottom: 4 }}>
                    {m.role === 'mentor' ? 'AI Mentor' : m.role === 'user' ? 'You' : 'System'}
                  </div>
                  {m.imageUri && (
                    <img src={m.imageUri} alt="Uploaded" style={{ maxWidth: '120px', borderRadius: '4px', marginBottom: '4px' }} />
                  )}
                  <div style={{ 
                    background: m.role === 'user' ? 'rgba(91, 138, 245, 0.15)' : 'var(--bg)', 
                    border: '1px solid',
                    borderColor: m.role === 'user' ? 'rgba(91, 138, 245, 0.3)' : 'var(--border)',
                    borderRadius: 8, padding: '10px 14px', fontSize: 13, lineHeight: 1.5, color: 'var(--tx-2)', 
                    whiteSpace: 'pre-wrap', maxWidth: '90%' 
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Submission */}
      {canInteract && (
        <div className="card">
          <label className="lbl">Submit Your Work</label>
          <div style={{ color: 'var(--tx-d)', fontSize: 10, marginBottom: 8 }}>Paste your code + terminal output. No code = auto-fail.</div>
          <textarea className="input" rows={7}
            placeholder={"Paste your code here...\n\nAnd terminal output:\n> Server running on http://localhost:3001\n> GET /health 200 OK"}
            value={sub} onChange={e => setSub(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="btn btn-p" onClick={handleSub} disabled={submitting || !sub.trim()}>
              {submitting ? <><Spinner />Reviewing...</> : 'Submit for Review →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MILESTONES TAB ───────────────────────────────────────────────────────────
function MilestonesTab({ milestones }) {
  return (
    <div>
      {(Array.isArray(milestones) ? milestones : []).map(m => (
        <div key={m.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 800, color: 'var(--tx)', marginBottom: 3 }}>
                {m.ord || m.order}. {m.title}
              </div>
              <div style={{ fontSize: 10, color: 'var(--tx-d)' }}>{m.duration_days} days</div>
            </div>
            <StatusBadge status={m.status} />
          </div>
          {m.description && <p style={{ fontSize: 12, color: 'var(--tx-2)', marginBottom: 10, lineHeight: 1.6 }}>{m.description}</p>}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--tx-d)', marginBottom: 4 }}>Measurable Output</div>
            <div style={{ fontSize: 11, color: 'var(--tx-2)', fontFamily: 'var(--mono)' }}>{m.measurable_output}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AUTOMATIONS TAB ──────────────────────────────────────────────────────────
function AutomationsTab({ automations = [] }) {
  if (!automations || !automations.length) return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--tx-d)', fontSize: 12 }}>
      Automation suggestions appear after completing each milestone.
    </div>
  );
  return (
    <div>
      {(Array.isArray(automations) ? automations : []).map((a, i) => (
        <div key={i} className="card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ background: 'var(--b-dim)', color: 'var(--blue)', border: '1px solid rgba(91,138,245,.2)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
              {a.tool}
            </span>
            <span style={{ fontSize: 12, color: 'var(--tx-2)' }}>{a.description}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 10 }}>↳ {a.benefit}</div>
          <TermBlock lines={[a.script_snippet]} label="script" />
        </div>
      ))}
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { project, user, milestones, currentTask, chatLog, qaReview, automations, successMsg, applyResponse, clearQA, reset, setSuccessMsg } = useStore();
  const [tab, setTab] = useState('task');
  const [submitting, setSubm] = useState(false);
  const [error, setError] = useState('');

  if (user?.role === 'mentor') {
      return <MentorDashboard />;
  }

  const handleSubmit = async (text) => {
    setSubm(true); setError(''); clearQA();
    try {
      if (project.is_course) {
        const res = await api.submitCourseTask(currentTask.id, project.id);
        if (res.verdict === 'pass') {
          setSuccessMsg(`✓ Task Passed!`);
          // Optionally trigger local state refresh if necessary
        } else {
          setError(res.feedback || 'Validation failed.');
        }
      } else {
        const res = await api.submitTask(currentTask.id, text);
        applyResponse(res);
        if (res.action === 'project_complete') { navigate('/complete'); return; }
        if (res.action === 'milestone_complete' && res.next_task) setSuccessMsg(`Milestone complete → Next: ${res.next_task.title}`);
        else if (res.action === 'task_guidance' && res.next_task) setSuccessMsg(`✓ Task passed → ${res.next_task.title}`);
      }
    } catch (e) { setError(e.message); }
    setSubm(false);
  };

  if (!project) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: 'var(--tx-d)' }}>No active project.</div>
      <button className="btn btn-p" onClick={() => navigate('/')}>Start a Project</button>
    </div>
  );

  return (
    <div className="dash">
      <Sidebar project={project} milestones={milestones} onNew={() => { reset(); navigate('/'); }} />
      <div className="dash-main">

        {/* Progress strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          <ProgressBar pct={project.progress_pct || 0} />
          <span style={{ fontSize: 11, color: 'var(--tx-m)', whiteSpace: 'nowrap' }}>
            {Math.round(project.progress_pct || 0)}% · {project.completed_tasks}/{project.total_tasks} tasks
          </span>
        </div>

        {successMsg && <div className="succ slide-down" style={{ marginBottom: 14, borderRadius: 8 }}>✓ {successMsg}</div>}
        {error && <div className="err">⚠ {error}</div>}

        {/* Tabs */}
        <div className="tabs">
          {[['task', 'Current Task'], ['milestones', 'Milestones'], ['automations', `Automations (${(automations || []).length})`]].map(([id, label]) => (
            <button key={id} className={`tab ${tab === id ? 'tab-a' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === 'task' && (
          <>
            <TaskPanel task={currentTask} onSubmit={handleSubmit} submitting={submitting} />
            {qaReview && <QAPanel review={qaReview} onDismiss={clearQA} />}
          </>
        )}
        {tab === 'milestones' && <MilestonesTab milestones={milestones} />}
        {tab === 'automations' && <AutomationsTab automations={automations} />}
      </div>
    </div>
  );
}
