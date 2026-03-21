import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store';
import { Spinner } from '../components/UI';

export default function GoalPage() {
  const navigate = useNavigate();
  const { userId, project, setUser, applyResponse, setSuccessMsg } = useStore();

  const [goal, setGoal]   = useState('');
  const [loading, setLoad] = useState(false);
  const [error, setError]  = useState('');

  // (Removed legacy blocker that prevented creating a new project if one was active)

  // If no user at all, redirect to login (since we removed legacy register)
  useEffect(() => {
    if (!userId) navigate('/login');
  }, [userId, navigate]);

  const handleSubmit = async () => {
    if (!goal.trim()) { setError('Enter a goal.'); return; }
    setLoad(true); setError('');
    try {
      const res = await api.submitGoal(userId, goal.trim());
      if (res.action === 'rejected') { setError(res.message); setLoad(false); return; }
      applyResponse(res);
      if (res.action === 'clarify') {
        navigate('/clarify', { state: { questions: res.clarification_questions, projectId: res.project?.id } });
      } else if (res.action === 'plan_ready') {
        setSuccessMsg(res.message);
        navigate('/dashboard');
      }
    } catch(e) { setError(e.message); }
    setLoad(false);
  };

  return (
    <div className="goal-pg">
      <div className="goal-box fade-in">
        <div className="g-eye">// Initialize Project</div>
        <h1 className="g-h1">What are you<br />building?</h1>

        <p className="g-sub">
          State your project — what to build, what tech, what outcome, deadline.<br />
          <span style={{color:'var(--red)'}}>Vague goals are rejected with a reason.</span>
        </p>
        <div className="card">
          <label className="lbl">Project Goal</label>
          <textarea className="input" rows={5}
            placeholder={"e.g. Build a REST API for task management using Node.js + Express + SQLite,\nwith JWT authentication. I have 21 days. I'm a beginner."}
            value={goal} onChange={e=>setGoal(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey) handleSubmit(); }}
          />
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}>
            <span style={{fontSize:10,color:'var(--tx-d)'}}>Ctrl+Enter to submit</span>
            <button className="btn btn-p" onClick={handleSubmit} disabled={loading||!goal.trim()}>
              {loading ? <><Spinner/>Analyzing...</> : 'Submit Goal →'}
            </button>
          </div>
        </div>

        {error && <div className="err">⚠ {error}</div>}

        <div className="g-rules">
          {[['✗','No full solutions given'],['⊙','Strict QA every task'],['⟳','Resume anytime']].map(([icon,txt])=>(
            <div key={txt} className="g-rule">
              <div className="g-rule-icon">{icon}</div>
              <div className="g-rule-text">{txt}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
