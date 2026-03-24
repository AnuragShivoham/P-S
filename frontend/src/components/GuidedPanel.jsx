import { useState } from 'react';
import { Lightbulb, Info, AlertTriangle, ArrowRight, Lock } from 'lucide-react';

export default function GuidedPanel({ task, project }) {
  const [activeMessage, setActiveMessage] = useState(
    "Welcome to Course Mode! Free conversational AI is disabled in this environment. Click the buttons below to receive deterministic, pre-programmed guidance derived from the Sandbox validation engine."
  );

  let hints = ["No hints available for this task."];
  try {
    if (task?.hints) {
      hints = Array.isArray(task.hints) ? task.hints : JSON.parse(task.hints);
    }
  } catch(e) {
    if (typeof task?.hints === 'string') hints = [task.hints];
  }

  const handleAction = (type) => {
    switch (type) {
      case 'explain':
        setActiveMessage(task?.description || "This task doesn't have a detailed explanation. Refer to the task title.");
        break;
      case 'hint':
        setActiveMessage(`Hint: ${hints[0] || "Review the exact file name required by the task."}`);
        break;
      case 'failed':
        setActiveMessage("Ensure you created the exact file required (e.g. 'index.js') and check that your syntax stringentally matches the validation regex (avoiding commented-out code blocks).");
        break;
      case 'next':
        setActiveMessage("Proceed to write your code in the IDE. Once finalized, hit 'Submit Step' below the project tree to evaluate it against the strict backend Sandbox Engine.");
        break;
      default:
        setActiveMessage("Awaiting input.");
    }
  };

  return (
    <div className="chat" style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <div className="ide-hdr" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display:'flex', alignItems:'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lightbulb size={16} color="var(--blue)" />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Guided Course Support
          </div>
        </div>
        <div style={{ fontSize: 10, background: 'var(--bg-o)', padding: '4px 8px', borderRadius: 4, color: 'var(--tx-d)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Lock size={12} /> AI LOCKED
        </div>
      </div>

      <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
        <div style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: 'var(--tx)' }}>
           {activeMessage}
        </div>
      </div>

      <div style={{ padding: 20, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg-o)' }}>
        <button className="btn" onClick={() => handleAction('explain')} style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)' }}>
           <Info size={14} /> Explain
        </button>
        <button className="btn" onClick={() => handleAction('hint')} style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)' }}>
           <Lightbulb size={14} /> Get Hint
        </button>
        <button className="btn" onClick={() => handleAction('failed')} style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--red)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
           <AlertTriangle size={14} /> Why Failed?
        </button>
        <button className="btn" onClick={() => handleAction('next')} style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)' }}>
           <ArrowRight size={14} /> Next Step
        </button>
      </div>

    </div>
  );
}
