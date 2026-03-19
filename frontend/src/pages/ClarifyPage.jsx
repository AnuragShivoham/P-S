import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store';
import { Spinner } from '../components/UI';

export default function ClarifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { applyResponse, setSuccessMsg, project } = useStore();
  const { questions = [], projectId } = location.state || {};
  const pid = projectId || project?.id;

  const [answers, setAnswers] = useState({});
  const [loading, setLoad]    = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    const missing = questions.findIndex((_,i) => !answers[i]?.trim());
    if (missing !== -1) { setError(`Answer question ${missing+1} before continuing.`); return; }
    setLoad(true); setError('');
    try {
      const res = await api.clarifyGoal(pid, answers);
      if (res.action === 'rejected') { setError(res.message); setLoad(false); return; }
      applyResponse(res);
      if (res.action === 'clarify') {
        navigate('/clarify', { state: { questions: res.clarification_questions, projectId: res.project?.id }, replace: true });
      } else if (res.action === 'plan_ready') {
        setSuccessMsg(res.message);
        navigate('/dashboard', { replace: true });
      }
    } catch(e) { setError(e.message); }
    setLoad(false);
  };

  return (
    <div style={{flex:1,display:'flex',justifyContent:'center',alignItems:'flex-start',padding:'40px 24px',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:560}} className="fade-in">
        <div className="g-eye">// Goal Clarification</div>
        <h2 style={{fontFamily:'var(--display)',fontSize:22,fontWeight:800,color:'var(--tx)',marginBottom:8}}>
          Need more detail
        </h2>
        <p style={{fontSize:12,color:'var(--tx-2)',marginBottom:24,lineHeight:1.7}}>
          Answer all questions before your plan can be generated.
        </p>

        {questions.map((q,i) => (
          <div key={i} className="card" style={{marginBottom:10}}>
            <label className="lbl">{i+1}. {q}</label>
            <input className="input" placeholder="Your answer..."
              value={answers[i]||''} onChange={e=>setAnswers(p=>({...p,[i]:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&i===questions.length-1&&handleSubmit()}
              style={{padding:'8px 12px'}}
            />
          </div>
        ))}

        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button className="btn btn-g" onClick={()=>navigate('/')}>← Back</button>
          <button className="btn btn-p" onClick={handleSubmit} disabled={loading}>
            {loading ? <><Spinner/>Generating Plan...</> : 'Submit Answers →'}
          </button>
        </div>
        {error && <div className="err">⚠ {error}</div>}
      </div>
    </div>
  );
}
