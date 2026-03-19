import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
    Play, Loader2, Send, Save, FolderOpen, File,
    PanelRightClose, PanelRightOpen, TerminalSquare, AlertCircle,
    FilePlus, FolderPlus, Pencil, Trash2, GitBranchPlus, RefreshCw, ChevronRight, ChevronDown,
    MessageSquare, Download, Upload
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';
import '@xterm/xterm/css/xterm.css';

// ─── CONTEXT MENU ─────────────────────────────────────────────────────────────
function ContextMenu({ x, y, node, onClose, onNewFile, onNewFolder, onRename, onDelete, setImportTarget }) {
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const item = (icon, label, action, danger = false) => (
        <div
            onClick={() => { action(); onClose(); }}
            style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
                cursor: 'pointer', fontSize: 12,
                color: danger ? '#f87171' : '#c9d1d9',
                transition: 'background 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#21262d'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            {icon}
            {label}
        </div>
    );

    return (
        <div
            ref={ref}
            style={{
                position: 'fixed', top: y, left: x, zIndex: 1000,
                background: '#161b22', border: '1px solid #30363d',
                borderRadius: 6, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                overflow: 'hidden'
            }}
        >
            {node?.isDir && item(<FilePlus size={13} />, 'New File', () => onNewFile(node))}
            {node?.isDir && item(<FolderPlus size={13} />, 'New Folder', () => onNewFolder(node))}
            {node?.isDir && item(<FolderOpen size={13} />, 'Import File', () => { setImportTarget(node.path); document.getElementById('hidden-file-input')?.click(); })}
            {node?.isDir && <div style={{ borderTop: '1px solid #30363d', margin: '2px 0' }} />}
            {item(<Pencil size={13} />, 'Rename', () => onRename(node))}
            {item(<Trash2 size={13} />, 'Delete', () => onDelete(node), true)}
            {(node?.path === '/' || node?.isDir) && <div style={{ borderTop: '1px solid #30363d', margin: '2px 0' }} />}
            {(node?.path === '/' || node?.isDir) && item(<AlertCircle size={13} />, 'Request Deletion', () => onNewFile({ path: `[REQUEST_DELETE] ${node.path === '/' ? 'root' : node.path}` }), true)}
        </div>
    );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, placeholder, value, onChange, onConfirm, onCancel, confirmLabel = 'OK', danger = false }) {
    const inputRef = useRef(null);
    useEffect(() => inputRef.current?.focus(), []);

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
                padding: 24, minWidth: 360, boxShadow: '0 16px 48px rgba(0,0,0,0.8)'
            }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', marginBottom: 16 }}>{title}</div>
                <input
                    ref={inputRef}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    onKeyDown={e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel(); }}
                    style={{
                        width: '100%', background: '#010409', border: '1px solid #30363d',
                        borderRadius: 6, padding: '8px 12px', color: '#e6edf3',
                        fontSize: 13, outline: 'none', boxSizing: 'border-box'
                    }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                    <button onClick={onCancel} style={{
                        background: 'transparent', border: '1px solid #30363d', color: '#8b949e',
                        borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12
                    }}>Cancel</button>
                    <button onClick={onConfirm} style={{
                        background: danger ? '#b91c1c' : '#238636', border: 'none', color: 'white',
                        borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12
                    }}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

// ─── FILE TREE NODE ──────────────────────────────────────────────────────────
function TreeNode({ node, depth, activeFile, onOpen, onContextMenu, expandedDirs, toggleDir }) {
    const isExpanded = expandedDirs.has(node.path);
    const ext = node.name.split('.').pop();

    return (
        <div>
            <div
                onClick={() => node.isDir ? toggleDir(node.path) : onOpen(node)}
                onContextMenu={e => { e.preventDefault(); onContextMenu(e, node); }}
                style={{
                    paddingLeft: 8 + depth * 14, paddingRight: 8,
                    height: 26, display: 'flex', alignItems: 'center', gap: 5,
                    cursor: 'pointer', userSelect: 'none',
                    background: !node.isDir && activeFile?.path === node.path ? 'rgba(88,166,255,0.12)' : 'transparent',
                    color: !node.isDir && activeFile?.path === node.path ? '#58a6ff' : (node.isDir ? '#e6edf3' : '#8b949e'),
                    fontSize: 12, borderRadius: 4,
                    transition: 'background 0.1s'
                }}
                onMouseEnter={e => {
                    if (activeFile?.path !== node.path) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                    if (activeFile?.path !== node.path) e.currentTarget.style.background = 'transparent';
                }}
            >
                {node.isDir
                    ? (isExpanded ? <ChevronDown size={12} style={{ flexShrink: 0 }} /> : <ChevronRight size={12} style={{ flexShrink: 0 }} />)
                    : <span style={{ width: 12, flexShrink: 0 }} />
                }
                {node.isDir
                    ? <FolderOpen size={13} style={{ color: '#e6a700', flexShrink: 0 }} />
                    : <File size={13} style={{ flexShrink: 0 }} />
                }
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.name}
                </span>
            </div>
            {node.isDir && isExpanded && (node.children || []).map(child => (
                <TreeNode key={child.path} node={child} depth={depth + 1}
                    activeFile={activeFile} onOpen={onOpen} onContextMenu={onContextMenu}
                    expandedDirs={expandedDirs} toggleDir={toggleDir} />
            ))}
        </div>
    );
}

// ─── IDE PAGE ─────────────────────────────────────────────────────────────────
export default function IDE() {
    const navigate = useNavigate();
    // const { userId } = useStore(); // Consolidated above

    // FS State
    const [fsTree, setFsTree] = useState([]);
    const [openFiles, setOpenFiles] = useState([]);
    const [activeFile, setActiveFile] = useState(null);
    const [fileContents, setFileContents] = useState({});
    const [dirtyFiles, setDirtyFiles] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [expandedDirs, setExpandedDirs] = useState(new Set());

    // Modal state
    const [modal, setModal] = useState(null); // { type, node }
    const [modalValue, setModalValue] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null); // node to delete

    // Context menu
    const [ctxMenu, setCtxMenu] = useState(null); // { x, y, node }
    const [importTarget, setImportTarget] = useState('/');

    // Status bar
    const [statusMsg, setStatusMsg] = useState('');
    const [statusErr, setStatusErr] = useState(false);

    // State from Store
    const { 
        project, currentTask, chatLog, addChatMessage,
        userId
    } = useStore();

    const [chatInput, setChatInput] = useState('');
    const [isAsking, setIsAsking] = useState(false);

    // Layout
    const [showSidebar, setShowSidebar] = useState(true);
    const [showChat, setShowChat] = useState(true);
    const [showTerm, setShowTerm] = useState(true);

    // Terminal Refs
    const termRef = useRef(null);
    const wsRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const autoSaveTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    // ── FS helpers ──────────────────────────────────────────────────────────
    const status = (msg, err = false) => {
        setStatusMsg(msg); setStatusErr(err);
        setTimeout(() => setStatusMsg(''), 3000);
    };

    const loadFsTree = useCallback(async () => {
        try {
            const res = await api.getFsTree();
            setFsTree(res.tree || []);
        } catch (e) { status('Failed to load tree: ' + e.message, true); }
    }, []);

    useEffect(() => { loadFsTree(); }, [loadFsTree]);

    const toggleDir = (path) => {
        setExpandedDirs(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };

    const handleOpenFile = async (file) => {
        if (file.isDir) return;
        if (!openFiles.find(f => f.path === file.path)) {
            setOpenFiles(prev => [...prev, file]);
        }
        setActiveFile(file);
        if (!(file.path in fileContents)) {
            status('Opening ' + file.name + '...');
            try {
                const res = await api.getFile(file.path);
                setFileContents(prev => ({ ...prev, [file.path]: res.content }));
            } catch (e) { 
                console.error('[IDE] open failed', e);
                status('Failed to open file: ' + e.message, true); 
            }
        }
    };

    const closeFile = (e, path) => {
        e.stopPropagation();
        setOpenFiles(prev => prev.filter(f => f.path !== path));
        setFileContents(prev => { const n = { ...prev }; delete n[path]; return n; });
        setDirtyFiles(prev => { const n = new Set(prev); n.delete(path); return n; });
        if (activeFile?.path === path) {
            const remaining = openFiles.filter(f => f.path !== path);
            setActiveFile(remaining.length ? remaining[remaining.length - 1] : null);
        }
    };

    const handleSave = useCallback(async () => {
        const fileToSave = activeFile;
        const content = fileContents[fileToSave?.path];
        if (!fileToSave || !dirtyFiles.has(fileToSave.path) || content === undefined) return;
        setIsSaving(true);
        try {
            await api.saveFile(fileToSave.path, content);
            setDirtyFiles(prev => { const n = new Set(prev); n.delete(fileToSave.path); return n; });
            status('Saved ' + fileToSave.name);
        } catch (e) { status('Save failed: ' + e.message, true); }
        setIsSaving(false);
    }, [activeFile, fileContents, dirtyFiles]);

    useEffect(() => {
        if (!activeFile || !dirtyFiles.has(activeFile.path)) return;
        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = setTimeout(() => {
            handleSave();
        }, 2000);
        return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
    }, [fileContents, activeFile, dirtyFiles, handleSave]);

    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSave]);

    // ── Path helpers ─────────────────────────────────────────────────────────
    // Ensure paths are like /folder/file.txt without double slashes
    const joinPath = (base, name) => {
        let b = base.replace(/\/+$/, '');
        if (!b.startsWith('/')) b = '/' + b;
        if (b === '/') b = '';
        return b + '/' + name.replace(/^\/+/, '');
    };
    const parentOf = (p) => {
        const last = p.lastIndexOf('/');
        if (last <= 0) return '/';
        return p.substring(0, last);
    };

    // ── Context menu actions ─────────────────────────────────────────────────
    const openModal = (type, node, defaultVal = '') => {
        setModal({ type, node });
        setModalValue(defaultVal);
        setCtxMenu(null);
    };

    const handleModalConfirm = async () => {
        const { type, node } = modal;
        const val = modalValue.trim();
        if (!val) return;
        setModal(null);

        try {
            if (type === 'newFile' && node?.path.startsWith('[REQUEST_DELETE]')) {
                const target = node.path.replace('[REQUEST_DELETE] ', '');
                setChatInput(`I would like to delete the folder: "${target || 'root'}". Is this safe? Please authorize.`);
                setTimeout(() => {
                   const sendBtn = document.querySelector('button[title="Send Message"]');
                   if (sendBtn) sendBtn.click();
                   else handleChat();
                }, 200);
                return;
            }

            if (type === 'newFile') {
                const newPath = joinPath(node?.path ?? '', val);
                console.log('[IDE] createFile', newPath);
                await api.createFile(newPath);
                status('Created ' + val);
            } else if (type === 'newFolder') {
                const newPath = joinPath(node?.path ?? '', val);
                console.log('[IDE] createFolder', newPath);
                await api.createFolder(newPath);
                status('Created folder ' + val);
            } else if (type === 'rename') {
                const newPath = joinPath(parentOf(node.path), val);
                console.log('[IDE] rename', node.path, '→', newPath);
                await api.renameFile(node.path, newPath);
                setOpenFiles(prev => prev.map(f => f.path === node.path ? { ...f, name: val, path: newPath } : f));
                if (activeFile?.path === node.path) setActiveFile(a => ({ ...a, name: val, path: newPath }));
                status('Renamed to ' + val);
            } else if (type === 'gitClone') {
                status('Cloning… this may take a moment');
                await api.gitClone(val, node?.path || null);
                status('Cloned successfully');
            }
            await loadFsTree();
        } catch (e) { 
            console.error('[IDE] operation failed', e); 
            status(e.message, true); 
        }
    };

    // Uses a modal instead of window.confirm (which can be blocked in iframes)
    const handleDelete = (node) => {
        setCtxMenu(null);
        setDeleteTarget(node);
    };

    const confirmDelete = async () => {
        const node = deleteTarget;
        setDeleteTarget(null);
        try {
            console.log('[IDE] delete', node.path);
            await api.deleteFile(node.path);
            status('Deleted ' + node.name);
            setOpenFiles(prev => prev.filter(f => !f.path.startsWith(node.path)));
            if (activeFile?.path.startsWith(node.path)) setActiveFile(null);
            await loadFsTree();
        } catch (e) { console.error('[IDE] delete failed', e); status(e.message, true); }
    };

    // ── Terminal ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const term = new Terminal({
            theme: { background: '#0a0a0a', foreground: '#e0e0e0', cursor: '#10b981' },
            fontFamily: '"Fira Code", monospace',
            fontSize: 13, cursorBlink: true
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termRef.current);
        fitAddon.fit();
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Always point to backend port 3001 for terminal, regardless of where frontend is
        const host = window.location.host.split(':')[0]; // get hostname part
        const ws = new WebSocket(`${protocol}//${host}:3001/api/v1/terminal`);
        wsRef.current = ws;
        ws.onopen = () => {
            console.log('[IDE] Terminal WebSocket connected');
            ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        };
        ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.type === 'output') term.write(m.data); };
        ws.onerror = (e) => {
            console.error('[IDE] Terminal WebSocket error', e);
            term.writeln('\r\n\x1b[31m[WebSocket error – ensures backend is running on port 3001]\x1b[0m');
        };
        term.onData(data => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: 'input', data })));

        const resize = () => {
            fitAddon.fit();
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        };
        window.addEventListener('resize', resize);
        return () => { window.removeEventListener('resize', resize); ws.close(); term.dispose(); };
    }, []);

    useEffect(() => {
        if (fitAddonRef.current) setTimeout(() => fitAddonRef.current.fit(), 100);
    }, [showSidebar, showChat, showTerm]);

    // ── AI Chat ──────────────────────────────────────────────────────────────
    const handleChat = async () => {
        if (!chatInput.trim()) return;
        if (!currentTask && !project) {
            addChatMessage({ role: 'system', content: 'Please start or select a project to chat with the Mentor.' });
            return;
        }
        const userMsg = chatInput;
        setChatInput('');
        addChatMessage({ role: 'user', content: userMsg });
        setIsAsking(true);
        try {
            const activeFileContent = activeFile ? fileContents[activeFile.path] : null;
            let res;
            if (currentTask) {
                res = await api.askQuestion(currentTask.id, userMsg, activeFileContent, activeFile?.path);
            } else {
                res = await api.askProjectQuestion(project.id, userMsg, activeFileContent, activeFile?.path);
            }
            if (res.message.includes('AUTHORIZE_DELETE')) {
                await api.authorizeDeletion();
                addChatMessage({ role: 'system', content: '✓ Dangerous operations authorized for 2 minutes.' });
            }
            addChatMessage({ role: 'mentor', content: res.message });
        } catch (e) {
            addChatMessage({ role: 'system', content: 'Chat Error: ' + e.message });
        }
        setIsAsking(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const result = ev.target.result;
                if (!result.includes(',')) throw new Error('Invalid file format');
                const content = result.split(',')[1];
                const targetPath = joinPath(importTarget, file.name);
                console.log('[IDE] Uploading', targetPath, 'target:', importTarget);
                await api.uploadFile(targetPath, content, 'base64');
                status('Imported ' + file.name);
                await loadFsTree();
                // Ensure we open with the exact path returned by backend/joinPath
                handleOpenFile({ name: file.name, path: targetPath, isDir: false });
            } catch (err) { 
                console.error('[IDE] Import failed', err);
                status('Import failed: ' + err.message, true); 
            }
        };
        reader.onerror = () => status('Read failed', true);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleExecuteAction = async (act) => {
        if (act.type === 'terminal') {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'input', data: act.command + '\n' }));
                status('Running command...');
            } else {
                status('Terminal not connected', true);
            }
        } else if (act.type === 'create_file') {
            try {
                await api.createFile(act.path);
                if (act.content) await api.saveFile(act.path, act.content);
                await loadFsTree();
                status('Created ' + act.path);
            } catch (e) {
                status('Action failed: ' + e.message, true);
            }
        }
    };

    const getLanguage = (name = '') => {
        if (name.endsWith('.jsx') || name.endsWith('.js')) return 'javascript';
        if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'typescript';
        if (name.endsWith('.json')) return 'json';
        if (name.endsWith('.css')) return 'css';
        if (name.endsWith('.html')) return 'html';
        if (name.endsWith('.md')) return 'markdown';
        if (name.endsWith('.py')) return 'python';
        return 'plaintext';
    };

    return (
        <div style={{ display: 'flex', flex: 1, width: '100%', background: '#0d0d0d', color: '#c9d1d9', overflow: 'hidden', fontFamily: 'var(--sans)', flexDirection: 'column' }}>

            {/* MENU BAR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#010409', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
                <span style={{ fontWeight: 800, fontSize: 12, color: '#58a6ff', marginRight: 8 }}>AMIT-BODHIT IDE</span>
                <button title="New File (right-click explorer)" onClick={() => openModal('newFile', { path: '', isDir: true }, 'filename.js')} style={iconBtn}><FilePlus size={14} /></button>
                <button title="New Folder" onClick={() => openModal('newFolder', { path: '', isDir: true }, 'folder-name')} style={iconBtn}><FolderPlus size={14} /></button>
                <button title="Import File (Top)" onClick={() => { setImportTarget('/'); fileInputRef.current?.click(); }} style={iconBtn}><FolderOpen size={14} /></button>
                <button title="Git Clone" onClick={() => openModal('gitClone', null, 'https://github.com/user/repo.git')} style={iconBtn}><GitBranchPlus size={14} /></button>
                <button title="Refresh Explorer" onClick={loadFsTree} style={iconBtn}><RefreshCw size={14} /></button>
                <div style={{ flex: 1 }} />
                {statusMsg && (
                    <span style={{ fontSize: 11, color: statusErr ? '#f87171' : '#3fb950', fontFamily: 'monospace', marginRight: 8 }}>
                        {statusErr ? '⚠ ' : '✓ '}{statusMsg}
                    </span>
                )}
                <button onClick={() => navigate('/dashboard')} style={{ background: '#238636', color: 'white', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>
                    ← Dashboard
                </button>
            </div>

            {/* MAIN BODY */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

                {/* SIDEBAR – File Explorer */}
                {showSidebar && (
                    <div style={{ width: 240, borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column', background: '#0d0d0d', flexShrink: 0 }}>
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#8b949e', flex: 1 }}>PROJECT WORKSPACE</span>
                            <button title="New File" onClick={() => openModal('newFile', { path: '', isDir: true }, 'newfile.js')} style={smallIconBtn}><FilePlus size={12} /></button>
                            <button title="New Folder" onClick={() => openModal('newFolder', { path: '', isDir: true }, 'new-folder')} style={smallIconBtn}><FolderPlus size={12} /></button>
                            <button title="Refresh" onClick={loadFsTree} style={smallIconBtn}><RefreshCw size={12} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                            {(fsTree || []).map(node => (
                                <TreeNode key={node.path} node={node} depth={0}
                                    activeFile={activeFile} onOpen={handleOpenFile}
                                    onContextMenu={(e, n) => setCtxMenu({ x: e.clientX, y: e.clientY, node: n })}
                                    expandedDirs={expandedDirs} toggleDir={toggleDir} />
                            ))}
                        </div>
                    </div>
                )}

                {/* CENTER – Editor + Terminal */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                    {/* TABS BAR */}
                    <div style={{ display: 'flex', background: '#010409', borderBottom: '1px solid #21262d', overflowX: 'auto', flexShrink: 0, alignItems: 'stretch' }}>
                        <button onClick={() => setShowSidebar(!showSidebar)} style={{ ...iconBtn, borderRight: '1px solid #21262d', borderRadius: 0 }}>
                            {showSidebar ? <PanelRightOpen size={14} /> : <PanelRightOpen size={14} />}
                        </button>
                        {openFiles.map(f => (
                            <div key={f.path} onClick={() => handleOpenFile(f)} style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px',
                                cursor: 'pointer', flexShrink: 0, borderRight: '1px solid #21262d',
                                background: activeFile?.path === f.path ? '#0d0d0d' : 'transparent',
                                borderTop: activeFile?.path === f.path ? '1px solid #58a6ff' : '1px solid transparent',
                                color: activeFile?.path === f.path ? '#e6edf3' : '#8b949e',
                                fontSize: 12
                            }}>
                                <span>{f.name}{dirtyFiles.has(f.path) ? ' ●' : ''}</span>
                                <span onClick={e => closeFile(e, f.path)} style={{ opacity: 0.5, fontSize: 14, lineHeight: 1 }}>×</span>
                            </div>
                        ))}
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 12 }}>
                            <button onClick={handleSave} disabled={isSaving || !activeFile || !dirtyFiles.has(activeFile?.path)}
                                title="Save (Ctrl+S)"
                                style={{ ...iconBtn, color: activeFile && dirtyFiles.has(activeFile.path) ? '#58a6ff' : '#484f58' }}>
                                {isSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* EDITOR */}
                    <div style={{ flex: 1, minHeight: 0 }}>
                        {activeFile ? (
                            <Editor
                                height="100%"
                                path={activeFile.path}
                                language={getLanguage(activeFile.name)}
                                theme="vs-dark"
                                value={fileContents[activeFile.path] ?? ''}
                                onChange={val => {
                                    setFileContents(prev => ({ ...prev, [activeFile.path]: val }));
                                    setDirtyFiles(prev => new Set(prev).add(activeFile.path));
                                }}
                                options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: '"Fira Code", monospace', padding: { top: 16 } }}
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#484f58', gap: 12 }}>
                                <File size={42} />
                                <p style={{ fontSize: 14 }}>Right-click a file in the Explorer to get started</p>
                            </div>
                        )}
                    </div>

                    {/* TERMINAL */}
                    {showTerm && (
                        <div style={{ height: 240, borderTop: '1px solid #21262d', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', padding: '3px 12px', background: '#010409', borderBottom: '1px solid #21262d' }}>
                                <TerminalSquare size={12} style={{ marginRight: 6, color: '#8b949e' }} />
                                <span style={{ fontSize: 10, color: '#8b949e', flex: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Terminal</span>
                                <button onClick={() => setShowTerm(false)} style={{ ...smallIconBtn, color: '#8b949e' }}>×</button>
                            </div>
                            <div style={{ flex: 1, padding: 6, background: '#0a0a0a', minHeight: 0 }} ref={termRef} />
                        </div>
                    )}
                    {!showTerm && (
                        <div style={{ background: '#010409', borderTop: '1px solid #21262d', flexShrink: 0 }}>
                            <button onClick={() => setShowTerm(true)} style={{ ...iconBtn, fontSize: 11 }}>
                                <TerminalSquare size={13} /> <span style={{ marginLeft: 4 }}>Terminal</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT – AI Mentor */}
                {showChat ? (
                    <div style={{ width: 320, borderLeft: '1px solid #21262d', display: 'flex', flexDirection: 'column', background: '#0d0d0d', flexShrink: 0 }}>
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>AI MENTOR</span>
                            <button onClick={() => setShowChat(false)} style={smallIconBtn}><PanelRightClose size={14} /></button>
                        </div>
                        {currentTask ? (
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid #21262d', background: '#161b22' }}>
                                <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>CURRENT TASK</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#c9d1d9' }}>{currentTask.title}</div>
                            </div>
                        ) : (
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid #21262d', background: 'rgba(248,113,113,0.07)' }}>
                                <div style={{ fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <AlertCircle size={13} /> No active task
                                </div>
                            </div>
                        )}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {chatLog.length === 0 && (
                                <div style={{ fontSize: 12, color: '#8b949e', textAlign: 'center', marginTop: 20 }}>
                                    Ask me anything about your current task!
                                </div>
                            )}
                            {chatLog.map((c, i) => {
                                const actionMatch = c.content.match(/<ACTION_PLAN>([\s\S]*?)<\/ACTION_PLAN>/);
                                const cleanContent = c.content.replace(/<ACTION_PLAN>[\s\S]*?<\/ACTION_PLAN>/, '').trim();
                                let actions = [];
                                if (actionMatch) {
                                    try { actions = JSON.parse(actionMatch[1]); } catch(e) { console.error('Failed to parse actions', e); }
                                }

                                return (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: c.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        <span style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>{c.role === 'user' ? 'You' : 'AMIT-BODHIT'}</span>
                                        <div style={{
                                            background: c.role === 'user' ? '#1f6feb' : '#21262d',
                                            color: c.role === 'user' ? '#fff' : '#e6edf3',
                                            padding: '8px 10px', borderRadius: 8, fontSize: 12.5, lineHeight: 1.55,
                                            maxWidth: '90%', wordBreak: 'break-word', whiteSpace: 'pre-wrap', position: 'relative'
                                        }}>
                                            {cleanContent}
                                            {actions.length > 0 && (
                                                <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase' }}>Suggested Actions</div>
                                                    {actions.map((act, ai) => (
                                                        <button 
                                                            key={ai}
                                                            onClick={() => handleExecuteAction(act)}
                                                            style={{ 
                                                                background: '#30363d', border: '1px solid #444c56', borderRadius: 4, 
                                                                padding: '4px 8px', fontSize: 11, color: '#e6edf3', cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content'
                                                            }}
                                                        >
                                                            {act.type === 'terminal' ? <TerminalSquare size={12} /> : <FilePlus size={12} />}
                                                            {act.type === 'terminal' ? `Run: ${act.command}` : `Create: ${act.path}`}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {isAsking && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8b949e', fontSize: 12 }}>
                                    <Loader2 size={14} className="spin" /> Mentor is typing…
                                </div>
                            )}
                        </div>
                        <div style={{ padding: 10, borderTop: '1px solid #21262d' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleChat()}
                                    placeholder={currentTask ? "Ask for help or a review…" : "Select a task to start chatting…"}
                                    style={{ flex: 1, background: '#010409', border: '1px solid #30363d', padding: '7px 10px', borderRadius: 6, color: '#e6edf3', fontSize: 12, outline: 'none' }} />
                                <button 
                                    onClick={handleChat} 
                                    disabled={isAsking || !chatInput.trim() || (!currentTask && !project)}
                                    title="Send Message"
                                    style={{ background: '#238636', color: 'white', border: 'none', borderRadius: 6, padding: '0 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: (isAsking || !chatInput.trim() || (!currentTask && !project)) ? 0.5 : 1 }}
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ borderLeft: '1px solid #21262d', background: '#010409', flexShrink: 0 }}>
                        <button onClick={() => setShowChat(true)} style={iconBtn}><PanelRightOpen size={16} /></button>
                    </div>
                )}
            </div>

            {/* CONTEXT MENU */}
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x} y={ctxMenu.y} node={ctxMenu.node}
                    onClose={() => setCtxMenu(null)}
                    onNewFile={n => openModal('newFile', n, 'newfile.js')}
                    onNewFolder={n => openModal('newFolder', n, 'new-folder')}
                    onRename={n => openModal('rename', n, n.name)}
                    onDelete={handleDelete}
                    setImportTarget={setImportTarget}
                />
            )}

            {/* MODALS */}
            {modal?.type === 'newFile' && (
                <Modal title="New File" placeholder="filename.js" value={modalValue} onChange={setModalValue}
                    onConfirm={handleModalConfirm} onCancel={() => setModal(null)} confirmLabel="Create" />
            )}
            {modal?.type === 'newFolder' && (
                <Modal title="New Folder" placeholder="folder-name" value={modalValue} onChange={setModalValue}
                    onConfirm={handleModalConfirm} onCancel={() => setModal(null)} confirmLabel="Create" />
            )}
            {modal?.type === 'rename' && (
                <Modal title={`Rename "${modal.node.name}"`} placeholder="new-name" value={modalValue} onChange={setModalValue}
                    onConfirm={handleModalConfirm} onCancel={() => setModal(null)} confirmLabel="Rename" />
            )}
            {modal?.type === 'gitClone' && (
                <Modal title="Git Clone Repository" placeholder="https://github.com/user/repo.git" value={modalValue} onChange={setModalValue}
                    onConfirm={handleModalConfirm} onCancel={() => setModal(null)} confirmLabel="Clone" />
            )}

            {/* DELETE CONFIRMATION */}
            {deleteTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 24, minWidth: 340, boxShadow: '0 16px 48px rgba(0,0,0,0.8)' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>Delete "{deleteTarget.name}"?</div>
                        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 20 }}>
                            {deleteTarget.isDir ? 'This will permanently delete the folder and all its contents.' : 'This file will be permanently deleted.'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteTarget(null)} style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                            <button onClick={confirmDelete} style={{ background: '#b91c1c', border: 'none', color: 'white', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
            {/* HIDDEN INPUTS */}
            <input type="file" id="hidden-file-input" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
        </div>
    );
}

// ─── SHARED BUTTON STYLES ─────────────────────────────────────────────────────
const iconBtn = {
    display: 'flex', alignItems: 'center', background: 'transparent', border: 'none',
    color: '#8b949e', cursor: 'pointer', padding: '6px 8px', borderRadius: 4,
    transition: 'color 0.15s'
};
const smallIconBtn = {
    display: 'flex', alignItems: 'center', background: 'transparent', border: 'none',
    color: '#8b949e', cursor: 'pointer', padding: '3px 5px', borderRadius: 3
};
