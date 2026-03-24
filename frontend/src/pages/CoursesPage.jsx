import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store';
import { Spinner, StatusBadge } from '../components/UI';
import { LayoutGrid, Play, BookOpen } from 'lucide-react';

export default function CoursesPage() {
  const navigate = useNavigate();
  const { setSuccessMsg } = useStore();
  const [courses, setCourses] = useState([]);
  const [loading, setLoad] = useState(true);
  const [error, setError] = useState('');
  const [startingId, setStartingId] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoad(true);
      const data = await api.getCourses();
      setCourses(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch courses');
    } finally {
      setLoad(false);
    }
  };

  const handleStart = async (course) => {
    setStartingId(course.id);
    setError('');
    try {
      const res = await api.startCourse(course.id);
      if (res.success) {
        setSuccessMsg(`Started course: ${course.title}`);
        navigate('/ide');
      }
    } catch (err) {
      setError(err.message || 'Failed to start course');
      setStartingId(null);
    }
  };

  return (
    <div className="goal-pg" style={{ alignItems: 'flex-start', paddingTop: 80 }}>
      <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 30 }}>
          <div>
            <div className="g-eye" style={{ marginBottom: 8 }}>// Learn</div>
            <h1 className="g-h1" style={{ fontSize: 32, marginBottom: 0 }}>Premium Courses</h1>
          </div>
        </div>

        {error && <div className="err" style={{ marginBottom: 20 }}>⚠ {error}</div>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
        ) : courses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-o)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutGrid size={24} color="var(--tx-d)" />
            </div>
            <div style={{ color: 'var(--tx-2)', fontSize: 13 }}>No courses available right now. Check back later!</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {(Array.isArray(courses) ? courses : []).map(c => (
              <div key={c.id} className="card fade-in" style={{ display: 'flex', flexDirection: 'column', opacity: startingId && startingId !== c.id ? 0.5 : 1 }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', lineHeight: 1.3 }}>{c.title}</h3>
                  <div style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4, background: 'var(--bg-o)', color: 'var(--tx)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {c.difficulty || 'All Levels'}
                  </div>
                </div>
                
                <div style={{ fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
                  {c.description || 'Learn to build real-world applications.'}
                </div>
                
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  {typeof c.tech_stack === 'string' && c.tech_stack.split(',').map(t => (
                     <span key={t} style={{ fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4, color: 'var(--tx-d)' }}>
                        {t.trim()}
                     </span>
                  ))}
                </div>
                
                <button 
                  className="btn btn-p" 
                  onClick={() => handleStart(c)} 
                  disabled={!!startingId}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {startingId === c.id ? <Spinner /> : <><Play size={16} /> Start Building</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
