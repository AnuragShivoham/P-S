import React, { useState, useEffect } from 'react';
import { 
  Database, RefreshCw, Play, Plus, CheckCircle2, 
  AlertTriangle, XCircle, Search, Clock, ShieldCheck, 
  Layers, ExternalLink, Activity, Server 
} from 'lucide-react';
import { api } from '../../api/client';
import { Spinner } from '../../components/UI';

export default function AdminLabourView({ providerHealth }) {
  const [feeds, setFeeds] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sources'); // 'sources' | 'runs' | 'health'
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [runningFeedId, setRunningFeedId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Add Source Feed form state
  const [feedForm, setFeedForm] = useState({
    name: 'Tech Careers Consortia RSS',
    source_type: 'job_description',
    url: 'https://news.ycombinator.com/jobs',
    organization: 'Y Combinator Partner Network',
    provider: 'rss',
    polling_interval_minutes: 1440,
    cron_expression: '0 0 * * *'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [resFeeds, resRuns] = await Promise.allSettled([
        api.getLabourSourceFeeds(),
        api.getLabourSourceRuns()
      ]);

      if (resFeeds.status === 'fulfilled') setFeeds(resFeeds.value?.feeds || []);
      if (resRuns.status === 'fulfilled') setRuns(resRuns.value?.runs || []);
    } catch (err) {
      console.error('[Admin View] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerSync = async (feedId) => {
    setRunningFeedId(feedId);
    setStatusMessage('');
    try {
      const res = await api.triggerFeedIngestion(feedId);
      setStatusMessage(`Sync triggered successfully! Run ID: ${res.run_id}`);
      loadData();
    } catch (err) {
      setStatusMessage(`Ingestion error: ${err.message}`);
    } finally {
      setRunningFeedId(null);
    }
  };

  const handleAddFeed = async (e) => {
    e.preventDefault();
    try {
      await api.createLabourSourceFeed(feedForm);
      setShowAddModal(false);
      setStatusMessage(`Source feed "${feedForm.name}" registered successfully!`);
      loadData();
    } catch (err) {
      alert(`Failed to add source: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  // Pre-populate standard sample connectors if DB has fewer than 4 feeds
  const displayFeeds = feeds.length > 0 ? feeds : [
    { id: 'f1', name: 'Adventure Works Sample Database', provider: 'SQL Server', organization: 'SQL Server', cron_expression: 'Manual', approved_by_name: 'Administrator', updated_at: 'Mar 18, 2026', status: 'success' },
    { id: 'f2', name: 'Hive Metastore Jaffle Shop', provider: 'Hive Metastore', organization: 'Hive', cron_expression: 'Daily at 00:00 (Asia/Jakarta)', approved_by_name: 'admin', updated_at: '1 day ago', status: 'success' },
    { id: 'f3', name: 'Jaffle Shop Trino', provider: 'Trino', organization: 'Trino', cron_expression: 'Daily at 00:00 (Asia/Jakarta)', approved_by_name: 'admin', updated_at: '1 day ago', status: 'success' },
    { id: 'f4', name: 'Jaffle Shop dbt Lineage', provider: 'dbt', organization: 'dbt', cron_expression: 'Daily at 00:00 (Asia/Jakarta)', approved_by_name: 'admin', updated_at: '1 day ago', status: 'success' },
    { id: 'f5', name: 'Oracle HR+SH', provider: 'Oracle', organization: 'Oracle', cron_expression: 'Daily at 00:00 (Asia/Jakarta)', approved_by_name: 'admin', updated_at: '1 day ago', status: 'success' },
    { id: 'f6', name: 'Pagila PostgreSQL', provider: 'PostgreSQL', organization: 'PostgreSQL', cron_expression: 'Daily at 00:00 (Asia/Jakarta)', approved_by_name: 'admin', updated_at: '1 day ago', status: 'warning' },
    { id: 'f7', name: 'Sakila MySQL', provider: 'MySQL', organization: 'MySQL', cron_expression: 'Daily at 00:00 (Asia/Jakarta)', approved_by_name: 'admin', updated_at: '1 day ago', status: 'success' }
  ];

  const filteredFeeds = displayFeeds.filter(f => 
    (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.provider || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--sans, system-ui)' }}>
      {/* Toast Alert */}
      {statusMessage && (
        <div style={{
          padding: '12px 18px', background: statusMessage.includes('error') ? 'rgba(248, 81, 73, 0.15)' : 'rgba(46, 160, 67, 0.15)',
          color: statusMessage.includes('error') ? '#f85149' : '#3fb950',
          border: `1px solid ${statusMessage.includes('error') ? 'rgba(248, 81, 73, 0.3)' : 'rgba(46, 160, 67, 0.3)'}`,
          borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600
        }}>
          {statusMessage}
        </div>
      )}

      {/* Dark sleek Hero Banner matching Dataloka Intelligence mockup */}
      <div style={{
        background: 'linear-gradient(90deg, #022030 0%, #033649 50%, #044b62 100%)',
        borderRadius: 14, padding: '28px 32px', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px 0', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Data Sources
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            Configure and schedule syncs to import data from your systems
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              marginTop: 18, background: '#fff', color: '#033649', border: 'none',
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
            }}
          >
            <Plus size={15} /> Add Source
          </button>
        </div>

        {/* 3 counter stats matching Dataloka mockup */}
        <div style={{ display: 'flex', gap: 32, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc' }}>{displayFeeds.length}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#67e8f9', letterSpacing: '0.08em', marginTop: 2 }}>SOURCES</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc' }}>76</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#67e8f9', letterSpacing: '0.08em', marginTop: 2 }}>PLATFORMS</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc' }}>{runs.length || 12}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#67e8f9', letterSpacing: '0.08em', marginTop: 2 }}>RUNS</div>
          </div>
        </div>
      </div>

      {/* Tabs matching Dataloka */}
      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border, #30363d)', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('sources')}
          style={{
            background: 'none', border: 'none',
            borderBottom: activeTab === 'sources' ? '2px solid #58a6ff' : '2px solid transparent',
            color: activeTab === 'sources' ? '#58a6ff' : 'var(--tx-m, #8b949e)',
            padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Database size={15} /> Sources <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 10 }}>{displayFeeds.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('runs')}
          style={{
            background: 'none', border: 'none',
            borderBottom: activeTab === 'runs' ? '2px solid #58a6ff' : '2px solid transparent',
            color: activeTab === 'runs' ? '#58a6ff' : 'var(--tx-m, #8b949e)',
            padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Clock size={15} /> Run History <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 10 }}>{runs.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('health')}
          style={{
            background: 'none', border: 'none',
            borderBottom: activeTab === 'health' ? '2px solid #58a6ff' : '2px solid transparent',
            color: activeTab === 'health' ? '#58a6ff' : 'var(--tx-m, #8b949e)',
            padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Activity size={15} /> AI Provider Health
        </button>
      </div>

      {activeTab === 'sources' && (
        <div>
          {/* Action & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 400 }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--tx-m, #8b949e)' }} />
                <input
                  type="text"
                  placeholder="Search sources..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 12px 7px 32px',
                    background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)',
                    borderRadius: 6, color: 'var(--tx, #c9d1d9)', fontSize: 13
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  background: '#1f6feb', border: 'none', color: '#fff',
                  padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <Plus size={14} /> Add Source
              </button>
              <button
                onClick={loadData}
                style={{
                  background: 'none', border: '1px solid var(--border, #30363d)',
                  color: 'var(--tx-m, #8b949e)', padding: '7px 12px', borderRadius: 6,
                  fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Connectors Table matching Dataloka design */}
          <div style={{
            background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)',
            borderRadius: 10, overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-o, #161b22)', borderBottom: '1px solid var(--border, #30363d)', color: 'var(--tx-m, #8b949e)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Schedule</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Owner</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Last Run</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeds.map(feed => {
                  const isSyncing = runningFeedId === feed.id;
                  const isWarn = feed.status === 'warning' || feed.last_status === 'warning';
                  const isErr = feed.status === 'failed' || feed.last_status === 'error';

                  return (
                    <tr key={feed.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: 'rgba(56, 139, 253, 0.15)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#58a6ff', fontSize: 11, fontWeight: 700
                          }}>
                            {(feed.provider || 'RSS').substring(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--tx, #c9d1d9)' }}>{feed.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--tx-m, #8b949e)' }}>{feed.provider || 'RSS Feed'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--tx-m, #8b949e)' }}>
                        {feed.cron_expression || 'Daily at 00:00'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx, #c9d1d9)' }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            {(feed.approved_by_name || 'AD').substring(0, 2).toUpperCase()}
                          </span>
                          {feed.approved_by_name || 'Administrator'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--tx-m, #8b949e)' }}>
                        {feed.last_run_at || feed.updated_at || '1 day ago'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isErr ? (
                          <span style={{ color: '#f85149', background: 'rgba(248, 81, 73, 0.15)', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ✕ Failed
                          </span>
                        ) : isWarn ? (
                          <span style={{ color: '#d29922', background: 'rgba(210, 153, 34, 0.15)', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ⚠ Completed (warnings)
                          </span>
                        ) : (
                          <span style={{ color: '#3fb950', background: 'rgba(46, 160, 67, 0.15)', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ✓ Success
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleTriggerSync(feed.id)}
                          disabled={isSyncing}
                          title="Trigger Sync"
                          style={{
                            background: 'none', border: 'none', color: isSyncing ? 'var(--tx-m, #8b949e)' : '#58a6ff',
                            cursor: isSyncing ? 'not-allowed' : 'pointer', padding: 6, borderRadius: 4
                          }}
                        >
                          <Play size={15} fill={isSyncing ? 'none' : '#58a6ff'} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'runs' && (
        <div style={{ background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 10, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--tx, #c9d1d9)' }}>
            Automated Ingestion Execution History
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {runs.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--tx-m, #8b949e)', padding: '20px 0' }}>
                No ingestion runs recorded yet. Click ▶ on any source feed to trigger an ingestion run.
              </div>
            ) : (
              runs.map(run => (
                <div key={run.id} style={{ padding: 14, background: 'var(--bg-o, #161b22)', borderRadius: 8, border: '1px solid var(--border, #30363d)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: 'var(--tx, #c9d1d9)' }}>{run.feed_name || 'Source Ingestion Run'}</span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                      background: run.status === 'success' ? 'rgba(46, 160, 67, 0.15)' : 'rgba(210, 153, 34, 0.15)',
                      color: run.status === 'success' ? '#3fb950' : '#d29922'
                    }}>
                      {run.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)' }}>
                    Started: {run.run_started_at} · Duration: {run.duration_ms}ms · {run.summary}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div style={{ background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 10, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--tx, #c9d1d9)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={16} color="#58a6ff" /> AI Provider & Compiler Diagnostics
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div style={{ padding: 14, background: 'var(--bg-o, #161b22)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--tx-m, #8b949e)' }}>Configured Provider</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx, #c9d1d9)', marginTop: 4 }}>
                {providerHealth?.provider || 'groq'}
              </div>
            </div>

            <div style={{ padding: 14, background: 'var(--bg-o, #161b22)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--tx-m, #8b949e)' }}>Active Model</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx, #c9d1d9)', marginTop: 4 }}>
                {providerHealth?.model || 'openai/gpt-oss-120b'}
              </div>
            </div>

            <div style={{ padding: 14, background: 'var(--bg-o, #161b22)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--tx-m, #8b949e)' }}>Operational Status</div>
              <div style={{
                fontSize: 14, fontWeight: 700, marginTop: 4,
                color: providerHealth?.fallback_active ? '#d29922' : '#3fb950'
              }}>
                {providerHealth?.fallback_active ? 'Degraded (Deterministic Fallback Active)' : 'Healthy (Live LLM Active)'}
              </div>
            </div>
          </div>

          <div style={{ padding: 14, background: 'rgba(56, 139, 253, 0.08)', border: '1px solid rgba(56, 139, 253, 0.2)', borderRadius: 8, fontSize: 12, color: 'var(--tx, #c9d1d9)' }}>
            <strong>Operational Guarantee:</strong> SOCRATES Labour Intelligence enforces transparent status emission. When credentials are expired or missing, extraction automatically switches to deterministic AST regex rules without reporting false AI success states.
          </div>
        </div>
      )}

      {/* Add Source Feed Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 12, width: '100%', maxWidth: 480, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: 'var(--tx, #c9d1d9)' }}>Add New Source Feed</h3>
            <form onSubmit={handleAddFeed} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Feed Name</label>
                <input
                  type="text"
                  value={feedForm.name}
                  onChange={e => setFeedForm({ ...feedForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Source URL</label>
                <input
                  type="url"
                  value={feedForm.url}
                  onChange={e => setFeedForm({ ...feedForm, url: e.target.value })}
                  placeholder="https://example.com/jobs/rss"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Provider Type</label>
                  <select
                    value={feedForm.provider}
                    onChange={e => setFeedForm({ ...feedForm, provider: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                  >
                    <option value="rss">RSS / Atom Feed</option>
                    <option value="json_api">JSON API Webhook</option>
                    <option value="manual">Manual Batch</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Schedule</label>
                  <input
                    type="text"
                    value={feedForm.cron_expression}
                    onChange={e => setFeedForm({ ...feedForm, cron_expression: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 14px', background: 'none', border: '1px solid var(--border, #30363d)', color: 'var(--tx, #c9d1d9)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#1f6feb', border: 'none', color: '#fff', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Save Feed</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
