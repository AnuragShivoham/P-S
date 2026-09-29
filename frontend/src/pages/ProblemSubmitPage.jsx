import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, MapPin, UploadCloud, AlertTriangle, CheckCircle2, 
  ArrowLeft, ArrowRight, Loader2, Image as ImageIcon, Video, 
  Trash2, Shield, Info, HelpCircle, FileText, Check 
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';
import LocationPicker from '../components/problems/LocationPicker';

const PROBLEM_TYPES = [
  { value: 'infrastructure', label: 'Roads & Infrastructure' },
  { value: 'water_sanitation', label: 'Water & Sanitation' },
  { value: 'healthcare', label: 'Healthcare Access & Supply' },
  { value: 'environmental', label: 'Environmental & Pollution' },
  { value: 'agriculture', label: 'Agriculture & Farming' },
  { value: 'education', label: 'Education & Schools' },
  { value: 'civic', label: 'Civic & Municipal Services' },
  { value: 'governance', label: 'Public Transparency' },
  { value: 'other', label: 'Other Societal Need' },
];

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low', color: '#8b949e', desc: 'No immediate danger; chronic issue' },
  { value: 'medium', label: 'Medium', color: '#58a6ff', desc: 'Noticeable difficulty, requires timely attention' },
  { value: 'high', label: 'High', color: '#f0883e', desc: 'Significant disruption; needs priority action' },
  { value: 'critical', label: 'Critical', color: '#f85149', desc: 'Immediate crisis affecting lives/safety' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', desc: 'Minor inconvenience' },
  { value: 'medium', label: 'Medium', desc: 'Moderate local disturbance' },
  { value: 'high', label: 'High', desc: 'Major community impact' },
  { value: 'catastrophic', label: 'Catastrophic', desc: 'Severe systemic danger or widespread harm' },
];

export default function ProblemSubmitPage() {
  const navigate = useNavigate();
  const { role } = useStore();

  // Multi-step wizard state (1: Core Info, 2: Impact & Media, 3: Location & Privacy, 4: Review & Submit)
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [problemType, setProblemType] = useState('civic');
  const [urgency, setUrgency] = useState('medium');
  const [severity, setSeverity] = useState('medium');

  // Real-world impact
  const [affectedCount, setAffectedCount] = useState('');
  const [impactSummary, setImpactSummary] = useState('');
  const [existingWorkarounds, setExistingWorkarounds] = useState('');
  const [financialImpact, setFinancialImpact] = useState('');

  // Location & Privacy
  const [location, setLocation] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    formatted_address: '',
    district: '',
    state: '',
    country: 'India'
  });
  const [privacyLevel, setPrivacyLevel] = useState('approximate');

  // Media files (base64 or file upload)
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState('');

  // Citizen Info
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.getProblemCategories();
      setCategories(res.categories || []);
    } catch (e) {
      console.warn('Could not load categories:', e);
    }
  };

  // Handle local image file picker
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 10MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setMediaFiles(prev => [
          ...prev,
          {
            type: 'image',
            name: file.name,
            size: file.size,
            mime: file.type,
            dataUrl: event.target.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle video file picker
  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert(`Video ${file.name} exceeds the 50MB limit.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaFiles(prev => [
        ...prev,
        {
          type: 'video',
          name: file.name,
          size: file.size,
          mime: file.type,
          dataUrl: event.target.result
        }
      ]);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Step validation
  const canProceedStep1 = title.trim().length >= 8 && description.trim().length >= 25;

  const handleSubmit = async () => {
    if (!canProceedStep1) {
      setError('Please provide a descriptive title and at least 25 characters of description.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId || null,
      problem_type: problemType,
      urgency,
      severity,
      affected_population_estimate: affectedCount ? parseInt(affectedCount, 10) : null,
      impact_summary: impactSummary.trim() || null,
      existing_workarounds: existingWorkarounds.trim() || null,
      financial_impact_estimate: financialImpact.trim() || null,
      is_anonymous: isAnonymous,
      submitter_name: isAnonymous ? null : submitterName.trim(),
      submitter_email: isAnonymous ? null : submitterEmail.trim(),
      submitter_phone: isAnonymous ? null : submitterPhone.trim(),
      privacy_level: privacyLevel,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        formatted_address: location.formatted_address,
        district: location.district,
        state: location.state,
        country: location.country
      },
      media: mediaFiles.map(m => ({
        type: m.type,
        data_url: m.dataUrl,
        caption: m.name
      }))
    };

    try {
      const res = await api.submitProblem(payload);
      setSuccessResult(res);
    } catch (err) {
      console.error('[SubmitProblem] Error:', err);
      setError(err.message || 'Failed to submit problem. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render Success Screen
  if (successResult) {
    const prob = successResult.problem || {};
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <div style={styles.successIconWrap}>
            <CheckCircle2 size={48} color="#3fb950" />
          </div>
          <h2 style={styles.successTitle}>Societal Problem Submitted!</h2>
          <p style={styles.successSub}>
            Your submission has been recorded with tracking ID{' '}
            <code style={styles.idBadge}>#{prob.id?.slice(0, 8)}</code>.
          </p>

          <div style={styles.analysisNotice}>
            <Sparkles size={20} color="#58a6ff" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                Automated AI Intelligence In Progress
              </div>
              <div style={{ color: '#8b949e', fontSize: 12, marginTop: 3 }}>
                SOCRATES Problem Intelligence is structuring your problem into technical requirements, 
                detecting potential duplicates, and preparing project milestones for engineers.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
            <button 
              onClick={() => navigate(`/problems/${prob.id}`)}
              style={styles.primaryBtn}
            >
              View Problem Details & AI Analysis <ArrowRight size={15} style={{ marginLeft: 6 }} />
            </button>
            <button 
              onClick={() => navigate('/problems')}
              style={styles.secondaryBtn}
            >
              Browse Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard: non-citizen role check
  if (role && role !== 'citizen' && role !== 'admin') {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <div style={{ ...styles.successIconWrap, background: 'rgba(240,136,62,0.15)', borderColor: 'rgba(240,136,62,0.4)' }}>
            <Shield size={48} color="#f0883e" />
          </div>
          <h2 style={styles.successTitle}>Citizen Account Required</h2>
          <p style={styles.successSub}>
            You are currently signed in with a <strong style={{ color: '#58a6ff' }}>{role}</strong> profile.
            Submitting ground-level societal problems is reserved for community citizens and platform administrators.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
            <button 
              onClick={() => navigate('/problems')}
              style={styles.primaryBtn}
            >
              Browse Societal Problems
            </button>
            <button 
              onClick={() => navigate('/login')}
              style={styles.secondaryBtn}
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Banner */}
      <div style={styles.header}>
        <button onClick={() => navigate('/problems')} style={styles.backBtn}>
          <ArrowLeft size={14} /> Back to Problems
        </button>
        <h1 style={styles.title}>Submit a Societal Problem</h1>
        <p style={styles.subtitle}>
          Empower citizens, grassroots communities, and public stakeholders to surface real-world 
          issues that university developers and mentors can solve.
        </p>
      </div>

      {/* Step Indicator */}
      <div style={styles.stepperWrap}>
        {[
          { num: 1, title: 'Problem Overview' },
          { num: 2, title: 'Impact & Evidence' },
          { num: 3, title: 'Location & Privacy' },
          { num: 4, title: 'Review & Submit' }
        ].map(s => (
          <div 
            key={s.num} 
            style={{
              ...styles.stepItem,
              borderBottomColor: step === s.num ? '#58a6ff' : (step > s.num ? '#3fb950' : 'transparent'),
              color: step === s.num ? '#58a6ff' : (step > s.num ? '#3fb950' : '#8b949e')
            }}
            onClick={() => {
              if (s.num < step || (s.num === 2 && canProceedStep1)) {
                setStep(s.num);
              }
            }}
          >
            <span style={{
              ...styles.stepBadge,
              background: step === s.num ? '#58a6ff' : (step > s.num ? '#3fb950' : '#21262d'),
              color: step >= s.num ? '#fff' : '#8b949e'
            }}>
              {step > s.num ? <Check size={12} /> : s.num}
            </span>
            <span>{s.title}</span>
          </div>
        ))}
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <AlertTriangle size={16} color="#f85149" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Core Problem Info */}
      {step === 1 && (
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <FileText size={18} color="#58a6ff" />
            <div>
              <h3 style={styles.sectionTitle}>1. Problem Information</h3>
              <p style={styles.sectionDesc}>Describe the societal challenge clearly and accurately.</p>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Problem Title <span style={styles.req}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Unreliable Municipal Drinking Water Supply in North Ward"
              style={styles.input}
              maxLength={150}
            />
            <div style={styles.hint}>Be concise and specific (min 8 characters).</div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Detailed Description <span style={styles.req}>*</span>
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue in detail: what happens, when did it begin, how often does it occur, and what are the day-to-day consequences for citizens?"
              style={styles.textarea}
            />
            <div style={styles.hint}>
              {description.length} characters (minimum 25 required for high-accuracy AI breakdown).
            </div>
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Category</label>
              <select 
                value={categoryId} 
                onChange={e => setCategoryId(e.target.value)}
                style={styles.select}
              >
                <option value="">✨ Let AI Categorize Automatically</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.label}>Domain / Type</label>
              <select 
                value={problemType} 
                onChange={e => setProblemType(e.target.value)}
                style={styles.select}
              >
                {PROBLEM_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ ...styles.row, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Urgency Level</label>
              <div style={styles.pillGroup}>
                {URGENCY_LEVELS.map(u => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUrgency(u.value)}
                    style={{
                      ...styles.pillBtn,
                      border: urgency === u.value ? `1px solid ${u.color}` : '1px solid #30363d',
                      background: urgency === u.value ? 'rgba(88,166,255,0.1)' : '#161b22',
                      color: urgency === u.value ? '#e6edf3' : '#8b949e'
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.color, display: 'inline-block', marginRight: 6 }} />
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.label}>Severity Level</label>
              <div style={styles.pillGroup}>
                {SEVERITY_LEVELS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeverity(s.value)}
                    style={{
                      ...styles.pillBtn,
                      border: severity === s.value ? '1px solid #58a6ff' : '1px solid #30363d',
                      background: severity === s.value ? 'rgba(88,166,255,0.1)' : '#161b22',
                      color: severity === s.value ? '#e6edf3' : '#8b949e'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.wizardFooter}>
            <div />
            <button
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              style={{ ...styles.primaryBtn, opacity: canProceedStep1 ? 1 : 0.5 }}
            >
              Continue to Impact & Evidence <ArrowRight size={14} style={{ marginLeft: 6 }} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Impact & Media */}
      {step === 2 && (
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <UploadCloud size={18} color="#58a6ff" />
            <div>
              <h3 style={styles.sectionTitle}>2. Impact Assessment & Media Evidence</h3>
              <p style={styles.sectionDesc}>Help students understand scope, affected groups, and photographic proof.</p>
            </div>
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Estimated People Affected</label>
              <input
                type="number"
                value={affectedCount}
                onChange={e => setAffectedCount(e.target.value)}
                placeholder="e.g. 5000"
                style={styles.input}
              />
              <div style={styles.hint}>Approximate number of citizens, students, or patients impacted.</div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.label}>Financial / Economic Consequence (Optional)</label>
              <input
                type="text"
                value={financialImpact}
                onChange={e => setFinancialImpact(e.target.value)}
                placeholder="e.g. Daily loss of wages, high water tanker costs"
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ ...styles.fieldGroup, marginTop: 16 }}>
            <label style={styles.label}>Current Workarounds / How People Cope</label>
            <textarea
              rows={3}
              value={existingWorkarounds}
              onChange={e => setExistingWorkarounds(e.target.value)}
              placeholder="What do residents or workers currently do to get around this problem? e.g. buying expensive bottled water, manual paper records."
              style={styles.textarea}
            />
          </div>

          {/* Media Attachments */}
          <div style={{ marginTop: 24 }}>
            <label style={styles.label}>Photo & Video Proof (Recommended)</label>
            <div style={styles.mediaUploadRow}>
              <label style={styles.uploadBox}>
                <ImageIcon size={22} color="#58a6ff" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginTop: 6 }}>Add Photos</span>
                <span style={{ fontSize: 11, color: '#8b949e' }}>PNG, JPG, WEBP up to 10MB</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }} 
                />
              </label>

              <label style={styles.uploadBox}>
                <Video size={22} color="#bc8cff" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginTop: 6 }}>Add Video Proof</span>
                <span style={{ fontSize: 11, color: '#8b949e' }}>MP4, WEBM up to 50MB</span>
                <input 
                  type="file" 
                  accept="video/mp4, video/webm" 
                  onChange={handleVideoUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>

            {/* Media previews */}
            {mediaFiles.length > 0 && (
              <div style={styles.mediaGrid}>
                {mediaFiles.map((m, idx) => (
                  <div key={idx} style={styles.mediaThumbCard}>
                    {m.type === 'image' ? (
                      <img src={m.dataUrl} alt={m.name} style={styles.mediaThumb} />
                    ) : (
                      <video src={m.dataUrl} style={styles.mediaThumb} controls />
                    )}
                    <div style={styles.mediaThumbMeta}>
                      <span style={{ fontSize: 11, color: '#c9d1d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                        {m.name}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => removeMedia(idx)} 
                        style={styles.deleteMediaBtn}
                        title="Remove media"
                      >
                        <Trash2 size={13} color="#f85149" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.wizardFooter}>
            <button onClick={() => setStep(1)} style={styles.secondaryBtn}>
              <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back
            </button>
            <button onClick={() => setStep(3)} style={styles.primaryBtn}>
              Continue to Location & Privacy <ArrowRight size={14} style={{ marginLeft: 6 }} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Location & Privacy */}
      {step === 3 && (
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <MapPin size={18} color="#58a6ff" />
            <div>
              <h3 style={styles.sectionTitle}>3. Location Pin & Privacy</h3>
              <p style={styles.sectionDesc}>Specify the geographic area affected and protect sensitive personal details.</p>
            </div>
          </div>

          <LocationPicker 
            value={location}
            onChange={setLocation}
            privacyLevel={privacyLevel}
            onPrivacyChange={setPrivacyLevel}
          />

          {/* Citizen Details & Anonymous toggle */}
          <div style={styles.citizenBox}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={18} color="#3fb950" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Submitter Privacy</div>
                  <div style={{ fontSize: 12, color: '#8b949e' }}>Choose whether your name and contact details are publicly visible.</div>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isAnonymous} 
                  onChange={e => setIsAnonymous(e.target.checked)} 
                  style={{ accentColor: '#58a6ff' }}
                />
                <span style={{ fontSize: 13, color: '#e6edf3', fontWeight: 500 }}>Stay Anonymous</span>
              </label>
            </div>

            {!isAnonymous && (
              <div style={{ ...styles.row, marginTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Your Name</label>
                  <input
                    type="text"
                    value={submitterName}
                    onChange={e => setSubmitterName(e.target.value)}
                    placeholder="Full Name"
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={submitterEmail}
                    onChange={e => setSubmitterEmail(e.target.value)}
                    placeholder="name@domain.org"
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={submitterPhone}
                    onChange={e => setSubmitterPhone(e.target.value)}
                    placeholder="+91..."
                    style={styles.input}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={styles.wizardFooter}>
            <button onClick={() => setStep(2)} style={styles.secondaryBtn}>
              <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back
            </button>
            <button onClick={() => setStep(4)} style={styles.primaryBtn}>
              Review & Finalize <ArrowRight size={14} style={{ marginLeft: 6 }} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Finalize */}
      {step === 4 && (
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <Sparkles size={18} color="#58a6ff" />
            <div>
              <h3 style={styles.sectionTitle}>4. Review Submission</h3>
              <p style={styles.sectionDesc}>Confirm details before submitting to the platform and AI engine.</p>
            </div>
          </div>

          <div style={styles.reviewGrid}>
            <div style={styles.reviewItem}>
              <span style={styles.reviewLabel}>Title:</span>
              <span style={styles.reviewValue}>{title}</span>
            </div>
            <div style={styles.reviewItem}>
              <span style={styles.reviewLabel}>Domain & Type:</span>
              <span style={styles.reviewValue}>{problemType}</span>
            </div>
            <div style={styles.reviewItem}>
              <span style={styles.reviewLabel}>Urgency / Severity:</span>
              <span style={styles.reviewValue}>
                <span style={{ textTransform: 'capitalize', color: urgency === 'critical' ? '#f85149' : '#e6edf3' }}>
                  {urgency} Urgency
                </span> • <span style={{ textTransform: 'capitalize' }}>{severity} Severity</span>
              </span>
            </div>
            <div style={styles.reviewItem}>
              <span style={styles.reviewLabel}>Location:</span>
              <span style={styles.reviewValue}>
                {location.district || location.formatted_address || 'Geographic coordinate'} ({privacyLevel} privacy)
              </span>
            </div>
            <div style={styles.reviewItem}>
              <span style={styles.reviewLabel}>Media Proof:</span>
              <span style={styles.reviewValue}>{mediaFiles.length} file(s) attached</span>
            </div>
            <div style={styles.reviewItem}>
              <span style={styles.reviewLabel}>Submitter:</span>
              <span style={styles.reviewValue}>{isAnonymous ? 'Anonymous Citizen' : submitterName}</span>
            </div>
          </div>

          <div style={styles.summaryCallout}>
            <Info size={18} color="#58a6ff" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.5 }}>
              By submitting, your problem report will become publicly discoverable in the Societal 
              Marketplace for academic mentors, student teams, and civic partners to analyze, build 
              solutions for, and verify.
            </div>
          </div>

          <div style={styles.wizardFooter}>
            <button onClick={() => setStep(3)} style={styles.secondaryBtn}>
              <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={submitting}
              style={{ ...styles.primaryBtn, minWidth: 160 }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin" style={{ marginRight: 8 }} />
                  Submitting Problem...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} style={{ marginRight: 8 }} />
                  Submit Societal Problem
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '32px 20px 80px',
    fontFamily: 'var(--sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    color: '#c9d1d9'
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    color: '#58a6ff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 12
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#e6edf3',
    margin: '0 0 6px 0',
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: 14,
    color: '#8b949e',
    margin: 0,
    lineHeight: 1.5
  },
  stepperWrap: {
    display: 'flex',
    borderBottom: '1px solid #30363d',
    marginBottom: 24,
    gap: 8
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700
  },
  card: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 10,
    padding: 24,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: '1px solid #21262d'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e6edf3',
    margin: 0
  },
  sectionDesc: {
    fontSize: 12,
    color: '#8b949e',
    margin: '2px 0 0 0'
  },
  fieldGroup: {
    marginBottom: 16
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#c9d1d9',
    marginBottom: 6
  },
  req: {
    color: '#f85149'
  },
  hint: {
    fontSize: 11,
    color: '#8b949e',
    marginTop: 4
  },
  input: {
    width: '100%',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#e6edf3',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '10px 12px',
    color: '#e6edf3',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    lineHeight: 1.5
  },
  select: {
    width: '100%',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#e6edf3',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box'
  },
  row: {
    display: 'flex',
    gap: 16
  },
  pillGroup: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap'
  },
  pillBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  mediaUploadRow: {
    display: 'flex',
    gap: 16,
    marginTop: 8
  },
  uploadBox: {
    flex: 1,
    border: '1px dashed #30363d',
    borderRadius: 8,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: '#161b22',
    transition: 'border-color 0.2s'
  },
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 12,
    marginTop: 16
  },
  mediaThumbCard: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    overflow: 'hidden'
  },
  mediaThumb: {
    width: '100%',
    height: 80,
    objectFit: 'cover',
    display: 'block'
  },
  mediaThumbMeta: {
    padding: '4px 6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0d1117'
  },
  deleteMediaBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2
  },
  citizenBox: {
    marginTop: 20,
    padding: 16,
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8
  },
  reviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16,
    marginBottom: 20
  },
  reviewItem: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 6,
    padding: '10px 14px'
  },
  reviewLabel: {
    fontSize: 11,
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: 4
  },
  reviewValue: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e6edf3'
  },
  summaryCallout: {
    display: 'flex',
    gap: 12,
    background: 'rgba(88,166,255,0.06)',
    border: '1px solid rgba(88,166,255,0.2)',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20
  },
  wizardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid #21262d'
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#238636',
    border: '1px solid rgba(240,246,252,0.1)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 18px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: 500,
    padding: '8px 16px',
    cursor: 'pointer'
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(248,81,73,0.1)',
    border: '1px solid rgba(248,81,73,0.4)',
    color: '#f85149',
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16
  },
  successCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 10,
    padding: 36,
    textAlign: 'center',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'rgba(63,185,80,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px'
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#e6edf3',
    margin: '0 0 8px 0'
  },
  successSub: {
    fontSize: 14,
    color: '#8b949e',
    margin: 0
  },
  idBadge: {
    background: '#161b22',
    border: '1px solid #30363d',
    padding: '2px 6px',
    borderRadius: 4,
    color: '#58a6ff',
    fontFamily: 'monospace'
  },
  analysisNotice: {
    display: 'flex',
    gap: 14,
    textAlign: 'left',
    background: 'rgba(88,166,255,0.06)',
    border: '1px solid rgba(88,166,255,0.2)',
    borderRadius: 8,
    padding: 16,
    maxWidth: 580,
    margin: '24px auto 0'
  }
};
