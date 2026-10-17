import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertCircle, ArrowDownUp, ArrowRight, BookOpen, Building2, Check,
  CheckCircle2, ClipboardList, Download, GraduationCap, Loader2, Plus, RefreshCw,
  Search, Settings2, ShieldCheck, Users, X,
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';

const tabs = [
  ['overview', 'Overview'], ['students', 'Students'], ['faculty', 'Faculty'],
  ['departments', 'Departments'], ['projects', 'Projects'], ['challenges', 'Challenges'],
  ['skills', 'Skills'], ['reports', 'Reports & audit'], ['settings', 'Settings'],
];

const panelStyle = { background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 };
const buttonStyle = { padding: '9px 13px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' };

function Card({ icon: Icon, label, value, tone = '#58a6ff', hint }) {
  return <div style={{ ...panelStyle, display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 0 }}>
    <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 11, color: tone, background: `${tone}18` }}><Icon size={19} /></span>
    <div style={{ minWidth: 0 }}><div style={{ color: 'var(--tx-2)', fontSize: 12 }}>{label}</div>
      <div style={{ color: 'var(--tx-1)', fontSize: 27, fontWeight: 800, margin: '4px 0' }}>{value ?? '—'}</div>
      {hint && <div style={{ color: 'var(--tx-m)', fontSize: 11 }}>{hint}</div>}
    </div>
  </div>;
}

function Notice({ type = 'error', children, onClose }) {
  const color = type === 'success' ? '#3fb950' : '#f85149';
  return <div role="status" style={{ margin: '14px 0', padding: '11px 14px', borderRadius: 9, color, background: `${color}12`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', gap: 8 }}>
    {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{children}
    {onClose && <button aria-label="Dismiss" onClick={onClose} style={{ ...buttonStyle, marginLeft: 'auto', border: 0, background: 'transparent', color }}><X size={15} /></button>}
  </div>;
}

function Empty({ title, detail }) {
  return <div style={{ ...panelStyle, borderStyle: 'dashed', textAlign: 'center', padding: '42px 20px' }}>
    <Building2 size={25} color="var(--tx-m)" /><h3 style={{ color: 'var(--tx-1)', marginBottom: 6 }}>{title}</h3>
    <p style={{ color: 'var(--tx-2)', margin: 0, fontSize: 13 }}>{detail}</p>
  </div>;
}

function DataTable({ columns, rows, empty, keyField = 'id' }) {
  if (!rows?.length) return <Empty title="Nothing here yet" detail={empty || 'Records will appear when they are available.'} />;
  return <div style={{ overflowX: 'auto', ...panelStyle, padding: 0 }}><table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left' }}>
    <thead><tr>{columns.map(column => <th key={column.key} style={{ padding: '12px 14px', color: 'var(--tx-m)', borderBottom: '1px solid var(--border)', fontSize: 11, whiteSpace: 'nowrap' }}>{column.label}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row[keyField] ?? index}>{columns.map(column => <td key={column.key} style={{ padding: '13px 14px', color: 'var(--tx-2)', fontSize: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}</tr>)}</tbody>
  </table></div>;
}

export default function UniversityDashboardPage() {
  const navigate = useNavigate();
  const { userId, userName } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [institution, setInstitution] = useState(null);
  const [data, setData] = useState(null);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [setup, setSetup] = useState({ name: '', slug: '' });
  const [departmentForm, setDepartmentForm] = useState({ name: '', program: '' });
  const [joinSlug, setJoinSlug] = useState('');
  const [memberRequests, setMemberRequests] = useState([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getMyInstitution();
      const current = response.institution;
      setInstitution(current || null);
      if (current) {
        const result = await api.getInstitutionDashboard(current.id);
        setData(result);
        const [members, events] = await Promise.all([
          api.getInstitutionMembers(current.id, 'pending'),
          api.getInstitutionAudit(current.id),
        ]);
        setPendingMembers(members.members || []);
        setAuditEvents(events.events || []);
      } else {
        setData(null);
        setPendingMembers([]);
        setAuditEvents([]);
      }
      const membershipResult = await api.getMyInstitutionMemberships();
      setMemberRequests(membershipResult.memberships || []);
    } catch (err) {
      const message = err.message || 'Unable to load the university dashboard.';
      setError(message.includes('Not found: GET /api/v1/institutions/me')
        ? 'The API server does not have the institutions route. Restart or redeploy the backend using the current server code, then refresh this page.'
        : message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const students = useMemo(() => {
    const rows = [...(data?.students || [])];
    const query = search.trim().toLowerCase();
    return rows.filter(row => !query || `${row.name} ${row.email} ${row.department_id || ''}`.toLowerCase().includes(query))
      .sort((a, b) => String(a[sort] || '').localeCompare(String(b[sort] || '')));
  }, [data, search, sort]);
  const faculty = useMemo(() => (data?.faculty || []).filter(row => !search || `${row.name} ${row.email}`.toLowerCase().includes(search.trim().toLowerCase())), [data, search]);
  const projects = useMemo(() => (data?.projects || []).filter(row => !search || `${row.title} ${row.owner_name} ${row.status}`.toLowerCase().includes(search.trim().toLowerCase())), [data, search]);

  const runAction = async (action, message) => {
    setActionBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); await reload(); }
    catch (err) { setError(err.message || 'The action could not be completed.'); }
    finally { setActionBusy(false); }
  };

  const createInstitution = async event => {
    event.preventDefault();
    await runAction(async () => {
      const result = await api.createInstitution(setup);
      setInstitution(result.institution);
      setSetup({ name: '', slug: '' });
    }, 'Institution created. You can now invite students and faculty with its join code.');
  };

  const requestJoin = event => {
    event.preventDefault();
    runAction(async () => {
      await api.joinInstitution(joinSlug);
      setJoinSlug('');
    }, 'Membership request sent. An institution administrator must approve it.');
  };

  const createDepartment = event => {
    event.preventDefault();
    runAction(async () => {
      await api.createInstitutionDepartment(institution.id, departmentForm);
      setDepartmentForm({ name: '', program: '' });
    }, 'Department added.');
  };

  const decideMember = (membershipId, status) => runAction(
    () => api.reviewInstitutionMembership(institution.id, membershipId, status),
    `Membership ${status}.`,
  );

  const shareProject = (projectId, approvalRequired) => runAction(
    () => api.shareProjectWithInstitution(institution.id, projectId, approvalRequired),
    'Project sharing updated. The project owner can revoke access at any time.',
  );

  const revokeProjectShare = projectId => {
    if (!window.confirm('Revoke this institution’s access to the project? Existing access will stop immediately.')) return;
    runAction(() => api.revokeInstitutionProjectShare(institution.id, projectId), 'Project sharing revoked.');
  };

  const downloadReport = async () => {
    try {
      const blob = await api.downloadInstitutionReport(institution.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'institution-members.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Unable to download report.');
    }
  };

  const filteredChallenges = useMemo(() => (data?.challenges || []).filter(challenge => !search || `${challenge.title} ${challenge.description} ${challenge.status}`.toLowerCase().includes(search.trim().toLowerCase())), [data, search]);

  if (loading) return <main aria-live="polite" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', color: 'var(--tx-2)' }}><Loader2 className="spin" /> <span style={{ marginLeft: 10 }}>Loading institution data…</span></main>;

  return <main style={{ minHeight: 'calc(100vh - 52px)', padding: '26px clamp(14px, 4vw, 46px) 56px', background: 'var(--bg)', color: 'var(--tx-1)' }}>
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
        <div><div style={{ color: '#58a6ff', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em' }}>UNIVERSITY WORKSPACE</div>
          <h1 style={{ margin: '7px 0 4px', fontSize: 'clamp(24px, 4vw, 34px)' }}>{institution?.name || `Welcome, ${userName || 'University'}`}</h1>
          <p style={{ margin: 0, color: 'var(--tx-2)', maxWidth: 760, fontSize: 13 }}>A permission-scoped view of students, faculty, projects shared with your institution, public challenges and recorded verified skill evidence.</p></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-s" 
            style={{ ...buttonStyle, background: 'rgba(88,166,255,0.12)', border: '1px solid rgba(88,166,255,0.35)', color: '#58a6ff', fontSize: 13, fontWeight: 600 }}
            onClick={() => navigate('/labour-intelligence')}
          >
            📊 Labour Intelligence →
          </button>
          <button type="button" className="btn btn-g" style={buttonStyle} onClick={reload}><RefreshCw size={15} /> Refresh</button>
        </div>
      </header>

      {error && <Notice onClose={() => setError('')}>{error}</Notice>}
      {notice && <Notice type="success" onClose={() => setNotice('')}>{notice}</Notice>}

      {!institution ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))', gap: 18 }}>
        <section style={panelStyle}><div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}><Building2 color="#58a6ff" /><h2 style={{ margin: 0, fontSize: 19 }}>Set up your institution</h2></div>
          <p style={{ color: 'var(--tx-2)', fontSize: 13, lineHeight: 1.6 }}>Create an institution workspace. Students and faculty can request to join by its slug; you approve each membership. No existing student data is exposed automatically.</p>
          <form onSubmit={createInstitution} style={{ display: 'grid', gap: 12 }}>
            <label className="lbl">Institution name<input className="input" required minLength={2} maxLength={160} value={setup.name} onChange={event => setSetup(current => ({ ...current, name: event.target.value }))} placeholder="Example University" /></label>
            <label className="lbl">Join code (URL slug)<input className="input" value={setup.slug} onChange={event => setSetup(current => ({ ...current, slug: event.target.value }))} placeholder="example-university (optional)" /></label>
            <button className="btn btn-p" disabled={actionBusy} style={buttonStyle}>{actionBusy ? <Loader2 className="spin" size={15} /> : <Plus size={15} />} Create institution</button>
          </form>
        </section>
        <section style={panelStyle}><div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}><Users color="#a371f7" /><h2 style={{ margin: 0, fontSize: 19 }}>Membership status</h2></div>
          <p style={{ color: 'var(--tx-2)', fontSize: 13, lineHeight: 1.6 }}>Membership requests are available to student and faculty accounts. Contact your institution administrator if you need to change university workspace access.</p>
          {memberRequests.length > 0 && <div style={{ marginTop: 18 }}><h3 style={{ fontSize: 13 }}>My requests</h3>{memberRequests.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: '1px solid var(--border)', fontSize: 12 }}><span>{item.institution_name}</span><span style={{ color: item.status === 'active' ? '#3fb950' : '#d29922' }}>{item.status}</span></div>)}</div>}
        </section>
      </div> : <>
        <nav aria-label="University dashboard sections" style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '3px 0 15px', marginBottom: 16 }}>
          {tabs.map(([id, label]) => <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => { setActiveTab(id); setSearch(''); }} style={{ ...buttonStyle, flexShrink: 0, border: `1px solid ${activeTab === id ? '#58a6ff66' : 'var(--border)'}`, background: activeTab === id ? 'rgba(88,166,255,.13)' : 'var(--bg-o)', color: activeTab === id ? '#58a6ff' : 'var(--tx-2)' }}>{label}{id === 'students' && pendingMembers.length > 0 ? ` · ${pendingMembers.length}` : ''}</button>)}
        </nav>

        {['students', 'faculty', 'projects', 'challenges'].includes(activeTab) && <div style={{ display: 'flex', gap: 9, marginBottom: 16, flexWrap: 'wrap' }}><label style={{ position: 'relative', flex: '1 1 240px' }}><Search size={15} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--tx-m)' }} /><input aria-label="Search records" className="input" value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${activeTab}…`} style={{ paddingLeft: 34 }} /></label>{activeTab === 'students' && <button className="btn btn-g" style={buttonStyle} onClick={() => setSort(value => value === 'name' ? 'project_count' : 'name')}><ArrowDownUp size={14} /> Sort: {sort === 'name' ? 'Name' : 'Projects'}</button>}</div>}

        {activeTab === 'overview' && <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 12, marginBottom: 20 }}>
            <Card icon={GraduationCap} label="Active students" value={data?.metrics.active_students} hint="Approved memberships" />
            <Card icon={Users} label="Faculty & mentors" value={data?.metrics.faculty} tone="#a371f7" hint="Approved memberships" />
            <Card icon={BookOpen} label="Shared projects" value={data?.metrics.shared_projects} tone="#3fb950" hint="Owner opted-in to this institution" />
            <Card icon={ClipboardList} label="Pending applications" value={data?.metrics.pending_applications} tone="#d29922" hint="On institution-shared projects" />
            <Card icon={Activity} label="Average project progress" value={data?.metrics.average_shared_project_progress == null ? '—' : `${data.metrics.average_shared_project_progress}%`} tone="#bc8cff" hint="Recorded progress only" />
            <Card icon={ShieldCheck} label="Verified skill records" value={data?.metrics.verified_skill_records} tone="#3fb950" hint="From current active student members" />
          </div>
          <div style={{ ...panelStyle, marginBottom: 18, color: 'var(--tx-2)', fontSize: 12, lineHeight: 1.6 }}><ShieldCheck size={15} style={{ verticalAlign: 'middle', marginRight: 7, color: '#3fb950' }} />{data?.data_scope} Metrics intentionally do not include guessed completion, placement, or institution totals.</div>
          {pendingMembers.length > 0 && <section style={{ ...panelStyle, marginBottom: 18 }}><h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Membership requests <span style={{ color: '#d29922' }}>({pendingMembers.length})</span></h2>
            <DataTable rows={pendingMembers} empty="No pending requests." columns={[
              { key: 'name', label: 'Person' }, { key: 'email', label: 'Email' }, { key: 'member_type', label: 'Type' },
              { key: 'actions', label: 'Decision', render: row => <span style={{ display: 'flex', gap: 7 }}><button disabled={actionBusy} aria-label={`Approve ${row.name}`} onClick={() => decideMember(row.id, 'active')} style={{ ...buttonStyle, border: 0, color: '#3fb950', background: '#3fb95118' }}><Check size={14} /> Approve</button><button disabled={actionBusy} aria-label={`Reject ${row.name}`} onClick={() => decideMember(row.id, 'rejected')} style={{ ...buttonStyle, border: 0, color: '#f85149', background: '#f8514918' }}><X size={14} /> Reject</button></span> },
            ]} />
          </section>}
          <section style={panelStyle}><h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Recent shared projects</h2><DataTable rows={(data?.projects || []).slice(0, 6)} columns={[{ key: 'title', label: 'Project' }, { key: 'owner_name', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'progress_pct', label: 'Recorded progress', render: row => `${Math.round(row.progress_pct || 0)}%` }]} /></section>
        </>}

        {activeTab === 'students' && <><section style={{ ...panelStyle, marginBottom: 16 }}><h2 style={{ margin: '0 0 8px', fontSize: 17 }}>Membership requests ({pendingMembers.length})</h2><DataTable rows={pendingMembers} columns={[{ key: 'name', label: 'Student' }, { key: 'email', label: 'Email' }, { key: 'member_type', label: 'Role' }, { key: 'actions', label: 'Actions', render: row => <span style={{ display: 'flex', gap: 8 }}><button disabled={actionBusy} onClick={() => decideMember(row.id, 'active', null, false)} className="btn btn-g" style={buttonStyle}><Check size={14} /> Approve</button><button disabled={actionBusy} onClick={() => decideMember(row.id, 'rejected', null, false)} className="btn" style={{ ...buttonStyle, color: '#f85149' }}>Reject</button></span> }]} /></section><h2 style={{ fontSize: 17 }}>Active students ({students.length})</h2><DataTable rows={students} empty="Students appear after their join requests are approved." columns={[{ key: 'name', label: 'Student' }, { key: 'department_name', label: 'Department' }, { key: 'project_count', label: 'Projects shared' }, { key: 'account_created_at', label: 'Account created', render: row => row.account_created_at ? new Date(row.account_created_at).toLocaleDateString() : '—' }]} /></>}

        {activeTab === 'faculty' && <><h2 style={{ fontSize: 17 }}>Faculty & mentors ({faculty.length})</h2><DataTable rows={faculty} empty="Faculty appear after they request membership and are approved." columns={[{ key: 'name', label: 'Name' }, { key: 'member_type', label: 'Membership' }, { key: 'department_name', label: 'Department' }, { key: 'project_count', label: 'Projects shared' }]} /></>}

        {activeTab === 'departments' && <><form onSubmit={createDepartment} style={{ ...panelStyle, display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 16 }}><input className="input" required minLength={2} maxLength={120} placeholder="Department name" value={departmentForm.name} onChange={event => setDepartmentForm(current => ({ ...current, name: event.target.value }))} style={{ flex: '1 1 180px' }} /><input className="input" placeholder="Program (optional)" value={departmentForm.program} onChange={event => setDepartmentForm(current => ({ ...current, program: event.target.value }))} style={{ flex: '1 1 180px' }} /><button disabled={actionBusy} className="btn btn-p" style={buttonStyle}><Plus size={15} /> Add department</button></form><DataTable rows={data?.departments || []} empty="Add departments to organize approved institution members." columns={[{ key: 'name', label: 'Department' }, { key: 'program', label: 'Program' }, { key: 'created_at', label: 'Created' }, { key: 'actions', label: 'Actions', render: row => <button disabled={actionBusy || !window.confirm} onClick={() => window.confirm(`Delete ${row.name}? Members will remain in the institution but become unassigned.`) && runAction(() => api.deleteInstitutionDepartment(institution.id, row.id), 'Department removed.')} style={{ ...buttonStyle, color: '#f85149', border: '1px solid #f8514944', background: 'transparent' }}>Remove</button> }]} /></>}

        {activeTab === 'projects' && <><h2 style={{ fontSize: 17 }}>Projects shared with this institution ({projects.length})</h2><p style={{ color: 'var(--tx-2)', fontSize: 12 }}>Student and project data is visible only when the owner explicitly shares it. Read access does not grant edit access.</p><DataTable rows={projects} empty="No project owners have shared projects with this institution yet." columns={[{ key: 'title', label: 'Project' }, { key: 'owner_name', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'progress_pct', label: 'Progress', render: row => `${Math.round(row.progress_pct || 0)}%` }, { key: 'pending_applications', label: 'Pending applications' }, { key: 'updated_at', label: 'Last updated' }]} />
          {(data?.my_projects_to_share || []).length > 0 && <section style={{ ...panelStyle, marginTop: 18 }}><h3 style={{ marginTop: 0 }}>My projects — share by explicit consent</h3><div style={{ display: 'grid', gap: 10 }}>{data.my_projects_to_share.map(project => <div key={project.id} style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 10 }}><span>{project.title} <span style={{ color: 'var(--tx-m)', fontSize: 11 }}>· {project.status}</span></span>{project.shared_institution_id === institution.id ? <button disabled={actionBusy} className="btn" style={{ ...buttonStyle, color: '#f85149', border: '1px solid #f8514944', background: 'transparent' }} onClick={() => revokeProjectShare(project.id)}>Revoke share</button> : <button disabled={actionBusy || !!project.shared_institution_id} className="btn btn-g" style={buttonStyle} title={project.shared_institution_id ? 'This project is shared with another institution. Revoke that share first.' : 'Share project as read-only'} onClick={() => shareProject(project.id, true)}>{project.shared_institution_id ? 'Shared elsewhere' : <>Share read-only <ArrowRight size={14} /></>}</button>}</div>)}</div></section>}
          {(data?.applications || []).length > 0 && <section style={{ ...panelStyle, marginTop: 18 }}><h3 style={{ marginTop: 0 }}>Application activity</h3><p style={{ color: 'var(--tx-2)', fontSize: 12 }}>Applications are visible only to platform administrators in this version; institutional membership alone does not grant permission to decide another project owner's applications.</p><DataTable rows={data.applications} columns={[{ key: 'student_name', label: 'Student' }, { key: 'project_title', label: 'Project' }, { key: 'message', label: 'Message' }, { key: 'status', label: 'Status' }]} /></section>}
        </>}

        {activeTab === 'challenges' && <><h2 style={{ fontSize: 17 }}>Public challenges</h2><p style={{ color: 'var(--tx-2)', fontSize: 12 }}>Public civic challenges are discoverable; adoption is recorded under your university account.</p><DataTable rows={filteredChallenges} empty="There are no published challenges to display." columns={[{ key: 'title', label: 'Challenge' }, { key: 'urgency', label: 'Urgency' }, { key: 'status', label: 'Status' }, { key: 'linked_project_id', label: 'Project', render: row => row.linked_project_id ? 'Project linked' : 'Not started' }, { key: 'actions', label: 'Action', render: row => row.linked_project_id ? 'Already has a project' : <button disabled={actionBusy} className="btn btn-g" style={buttonStyle} onClick={() => runAction(() => api.adoptProblem(row.id), 'Challenge adoption recorded.')}>Adopt challenge</button> }]} /></>}

        {activeTab === 'skills' && <><h2 style={{ fontSize: 17 }}>Verified skill evidence</h2><p style={{ color: 'var(--tx-2)', fontSize: 12 }}>Only VERIFIED competency records from active student members are included. Claimed, estimated and seeded demonstration records are excluded.</p><DataTable rows={data?.verified_skills || []} empty="No verified skills have been recorded for currently approved student members." columns={[{ key: 'skill_name', label: 'Skill' }, { key: 'category', label: 'Category' }, { key: 'verified_students', label: 'Students with verified evidence' }]} /></>}

        {activeTab === 'reports' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}><section style={panelStyle}><h2 style={{ fontSize: 17 }}>Membership report</h2><p style={{ color: 'var(--tx-2)', fontSize: 13 }}>Export membership name, email, role, approval status, department and join date. Project work stays private unless separately shared.</p><button type="button" className="btn btn-p" onClick={downloadReport} style={buttonStyle}><Download size={15} /> Download CSV</button></section><section style={panelStyle}><h2 style={{ fontSize: 17 }}>Recent audit events</h2>{auditEvents.length ? auditEvents.map(event => <div key={event.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)', fontSize: 12 }}><div>{event.action.replaceAll('.', ' ')}</div><div style={{ color: 'var(--tx-m)', marginTop: 4 }}>{event.actor_name || 'System'} · {new Date(event.created_at).toLocaleString()}</div></div>) : <p style={{ color: 'var(--tx-2)', fontSize: 12 }}>Sensitive actions will be recorded here.</p>}</section></div>}

        {activeTab === 'settings' && <section style={panelStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Settings2 size={18} color="#58a6ff" /><h2 style={{ margin: 0, fontSize: 17 }}>Institution profile</h2></div><p style={{ color: 'var(--tx-2)', fontSize: 12 }}>Share this join code with students or faculty. Requests require an explicit approval.</p><label className="lbl">Institution name<input className="input" maxLength={160} value={institution.name} onChange={event => setInstitution(current => ({ ...current, name: event.target.value }))} /></label><label className="lbl" style={{ marginTop: 12 }}>Join code<input className="input" readOnly value={institution.slug} /></label><button className="btn btn-p" style={{ ...buttonStyle, marginTop: 12 }} disabled={actionBusy} onClick={() => runAction(() => api.updateInstitution(institution.id, { name: institution.name }), 'Institution profile updated.')}><Check size={15} /> Save name</button></section>}
      </>}
    </div>
  </main>;
}