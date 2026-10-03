import React, { useEffect, useState } from 'react';
import { RotateCw, ExternalLink, Globe, Layout, Maximize2 } from 'lucide-react';
import { getPreviewUrl } from '../../api/config';
import { api } from '../../api/client';

export default function WebPreview({ projectId, initialUrl = '' }) {
    const [key, setKey] = useState(0);
    const [url, setUrl] = useState(initialUrl); // Subpath
    const [previewToken, setPreviewToken] = useState('');
    const [previewError, setPreviewError] = useState('');

    useEffect(() => {
        let active = true;
        const refreshPreviewToken = async () => {
            try {
                const result = await api.getProjectPreviewToken(projectId);
                if (!active) return;
                setPreviewToken(result.token);
                setPreviewError('');
                setKey(current => current + 1);
            } catch (error) {
                if (active) setPreviewError(error.message || 'Unable to authorize project preview.');
            }
        };
        refreshPreviewToken();
        const timer = window.setInterval(refreshPreviewToken, 4 * 60 * 1000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [projectId]);

    const previewUrl = previewToken ? getPreviewUrl(projectId, url, previewToken) : '';

    const refresh = () => setKey(k => k + 1);

    return (
        <div style={styles.container}>
            <div style={styles.toolbar}>
                <div style={styles.urlBar}>
                    <Globe size={14} color="#8b949e" />
                    <input 
                        style={styles.input} 
                        value={url} 
                        onChange={e => setUrl(e.target.value)}
                        placeholder="index.html"
                    />
                </div>
                <div style={styles.actions}>
                    <button onClick={refresh} style={styles.btn} title="Refresh Preview">
                        <RotateCw size={14} />
                    </button>
                    <a href={previewUrl} target="_blank" rel="noreferrer" style={styles.btn} title="Open in New Tab">
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>
            
            <div style={styles.iframeContainer}>
                <iframe 
                    key={key}
                    src={previewUrl}
                    style={styles.iframe}
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                />
            </div>
            
            <div style={styles.footer}>
                <Layout size={12} /> Live Preview Active
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117' },
    toolbar: { 
        height: 38, 
        padding: '0 12px', 
        background: '#161b22', 
        borderBottom: '1px solid #30363d', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: 12
    },
    urlBar: { 
        flex: 1, 
        height: 24, 
        background: '#0d1117', 
        borderRadius: 4, 
        border: '1px solid #30363d', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 8px',
        gap: 8
    },
    input: { background: 'transparent', border: 'none', color: '#e6edf3', fontSize: 11, width: '100%', outline: 'none' },
    actions: { display: 'flex', gap: 4 },
    btn: { 
        padding: 6, 
        background: 'transparent', 
        border: 'none', 
        color: '#8b949e', 
        cursor: 'pointer', 
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.1s'
    },
    iframeContainer: { flex: 1, background: '#fff', position: 'relative' },
    iframe: { width: '100%', height: '100%', border: 'none' },
    footer: { height: 24, padding: '0 12px', background: '#161b22', borderTop: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#484f58' }
};
