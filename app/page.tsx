'use client';
import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Car, GlobalInputs, ComparisonSession } from '@/lib/types';
import { DEFAULT_CARS, DEFAULT_GLOBAL_INPUTS } from '@/lib/defaults';
import { saveSession, loadSession, saveToHistory, loadHistory, deleteFromHistory } from '@/lib/storage';
import { encodeStateToUrl, decodeStateFromUrl } from '@/lib/urlState';

import HeroSection from '@/components/HeroSection';
import AddCarModal from '@/components/AddCarModal';
import ExportButton from '@/components/ExportButton';
import ComparisonSpreadsheet from '@/components/ComparisonSpreadsheet';

// ─── helpers ─────────────────────────────────────────────────────────────────
function newSession(overrides: Partial<ComparisonSession> = {}): ComparisonSession {
    return {
        id: uuidv4(),
        name: 'Untitled Comparison',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cars: DEFAULT_CARS,
        globalInputs: DEFAULT_GLOBAL_INPUTS,
        ...overrides,
    };
}

// ─── state machine ────────────────────────────────────────────────────────────
type Action =
    | { type: 'SET_SESSION'; session: ComparisonSession }
    | { type: 'SET_NAME'; name: string }
    | { type: 'UPDATE_GLOBAL_INPUT'; key: keyof GlobalInputs; value: number }
    | { type: 'RESET_GLOBAL_INPUTS' }
    | { type: 'ADD_CAR'; car: Car }
    | { type: 'REMOVE_CAR'; id: string }
    | { type: 'UPDATE_CAR'; id: string; updates: Partial<Car> }
    | { type: 'RESTORE_CAR'; car: Car; index: number };

function reducer(state: ComparisonSession, action: Action): ComparisonSession {
    const touch = (s: ComparisonSession): ComparisonSession => ({ ...s, updatedAt: new Date().toISOString() });
    switch (action.type) {
        case 'SET_SESSION': return action.session;
        case 'SET_NAME': return touch({ ...state, name: action.name });
        case 'UPDATE_GLOBAL_INPUT': return touch({ ...state, globalInputs: { ...state.globalInputs, [action.key]: action.value } });
        case 'RESET_GLOBAL_INPUTS': return touch({ ...state, globalInputs: DEFAULT_GLOBAL_INPUTS });
        case 'ADD_CAR': return touch({ ...state, cars: [...state.cars, action.car] });
        case 'REMOVE_CAR': return touch({ ...state, cars: state.cars.filter((c) => c.id !== action.id) });
        case 'UPDATE_CAR': return touch({ ...state, cars: state.cars.map((c) => c.id === action.id ? { ...c, ...action.updates } : c) });
        case 'RESTORE_CAR': {
            const cars = [...state.cars];
            cars.splice(action.index, 0, action.car);
            return touch({ ...state, cars });
        }
        default: return state;
    }
}

// ─── component ────────────────────────────────────────────────────────────────
export default function Home() {
    const [session, dispatch] = useReducer(reducer, newSession());
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCarId, setNewCarId] = useState<string | undefined>();
    const [history, setHistory] = useState<ComparisonSession[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isSharedView, setIsSharedView] = useState(false);
    const [sessionNameEditing, setSessionNameEditing] = useState(false);
    const [sessionNameDraft, setSessionNameDraft] = useState('');
    const [savedFlash, setSavedFlash] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [undoData, setUndoData] = useState<{ car: Car; index: number } | null>(null);
    const [undoTimeoutId, setUndoTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionNameInputRef = useRef<HTMLInputElement>(null);

    // ── mobile detection ──
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // ── init: URL or localStorage ──
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const encoded = params.get('session');
        if (encoded) {
            const decoded = decodeStateFromUrl(encoded);
            if (decoded) { dispatch({ type: 'SET_SESSION', session: decoded }); setIsSharedView(true); return; }
        }
        const saved = loadSession();
        if (saved) dispatch({ type: 'SET_SESSION', session: saved });
        setHistory(loadHistory());
    }, []);

    // ── auto-save ──
    useEffect(() => {
        if (isSharedView) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveSession(session), 500);
    }, [session, isSharedView]);

    // ── handlers ──
    const handleGlobalInputChange = useCallback((key: keyof GlobalInputs, value: number) => {
        dispatch({ type: 'UPDATE_GLOBAL_INPUT', key, value });
    }, []);

    const handleResetGlobalInputs = useCallback(() => { dispatch({ type: 'RESET_GLOBAL_INPUTS' }); }, []);

    const handleUpdateCar = useCallback((id: string, updates: Partial<Car>) => {
        dispatch({ type: 'UPDATE_CAR', id, updates });
    }, []);

    const handleRemoveCar = useCallback((id: string) => {
        if (session.cars.length <= 2) { alert('You need at least 2 cars for a comparison.'); return; }
        const index = session.cars.findIndex((c) => c.id === id);
        const car = session.cars[index];
        dispatch({ type: 'REMOVE_CAR', id });
        setUndoData({ car, index });
        if (undoTimeoutId) clearTimeout(undoTimeoutId);
        const tid = setTimeout(() => setUndoData(null), 5000);
        setUndoTimeoutId(tid);
    }, [session.cars, undoTimeoutId]);

    const handleUndo = useCallback(() => {
        if (!undoData) return;
        dispatch({ type: 'RESTORE_CAR', car: undoData.car, index: undoData.index });
        setUndoData(null);
        if (undoTimeoutId) clearTimeout(undoTimeoutId);
    }, [undoData, undoTimeoutId]);

    const handleAddCar = useCallback((car: Car) => {
        dispatch({ type: 'ADD_CAR', car });
        setNewCarId(car.id);
        setTimeout(() => setNewCarId(undefined), 800);
        setShowAddModal(false);
    }, []);

    // ── session name ──
    function startEditingName() {
        setSessionNameDraft(session.name);
        setSessionNameEditing(true);
        setTimeout(() => sessionNameInputRef.current?.select(), 10);
    }

    function commitSessionName() {
        const name = sessionNameDraft.trim() || 'Untitled Comparison';
        dispatch({ type: 'SET_NAME', name });
        setSessionNameEditing(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
        saveToHistory({ ...session, name });
        setHistory(loadHistory());
    }

    // ── share ──
    function handleShare() {
        const encoded = encodeStateToUrl(session);
        const url = `${window.location.origin}${window.location.pathname}?session=${encoded}`;
        setShareUrl(url);
        if (isMobile && navigator.share) {
            navigator.share({ title: 'CarCompare', text: 'Check out my car comparison:', url }).catch(() => { });
            return;
        }
        setShowShareModal(true);
    }

    function handleCopyLink() {
        navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }

    function handleEditOwnCopy() {
        setIsSharedView(false);
        dispatch({ type: 'SET_SESSION', session: { ...session, id: uuidv4(), name: session.name + ' (my copy)' } });
        window.history.replaceState({}, '', window.location.pathname);
    }

    function handleLoadSession(s: ComparisonSession) { dispatch({ type: 'SET_SESSION', session: s }); setHistoryOpen(false); }
    function handleDeleteSession(id: string) { deleteFromHistory(id); setHistory(loadHistory()); }

    return (
        <>
            {/* Print header */}
            <div className="print-header" style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #ddd' }}>
                <div id="print-header-title" style={{ fontSize: '14px', color: '#333', fontWeight: 600 }} />
            </div>

            {/* Shared view banner */}
            {isSharedView && (
                <div style={{ background: 'rgba(41,151,255,0.1)', borderBottom: '1px solid rgba(41,151,255,0.2)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '13px', color: 'var(--accent-blue)' }}>
                    📋 Viewing a shared comparison
                    <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={handleEditOwnCopy}>Edit your own copy</button>
                </div>
            )}

            <HeroSection carCount={session.cars.length} />

            {/* Session name + actions */}
            <div className="container-max no-print" style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    {sessionNameEditing ? (
                        <input
                            ref={sessionNameInputRef}
                            value={sessionNameDraft}
                            onChange={(e) => setSessionNameDraft(e.target.value)}
                            onBlur={commitSessionName}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitSessionName(); if (e.key === 'Escape') setSessionNameEditing(false); }}
                            className="input-field"
                            style={{ fontSize: '18px', fontWeight: 700, padding: '6px 12px', maxWidth: '360px' }}
                            autoFocus
                        />
                    ) : (
                        <h2 onClick={startEditingName} title="Click to rename" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'text', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {session.name}
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>✏️</span>
                            {savedFlash && <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 400 }}>✓ Saved</span>}
                        </h2>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }} className="no-print">
                    <button className="btn-secondary" onClick={() => setShowAddModal(true)} id="add-car-btn" style={{ fontWeight: 600 }}>
                        <span style={{ fontSize: '16px', fontWeight: 800 }}>+</span> Add Car
                    </button>
                    <button className="btn-secondary" onClick={handleShare} id="share-btn"><span>🔗</span> Share</button>
                    <ExportButton sessionName={session.name} />
                </div>
            </div>

            <ComparisonSpreadsheet
                cars={session.cars}
                globalInputs={session.globalInputs}
                onUpdateCar={handleUpdateCar}
                onUpdateGlobal={handleGlobalInputChange}
                onAddCar={() => setShowAddModal(true)}
            />

            {/* Comparison History */}
            <section className="history-section no-print" style={{ padding: '24px 0 40px' }}>
                <div className="container-max">
                    <div className="card" style={{ padding: '20px 24px' }}>
                        <button
                            style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '15px', fontWeight: 600, padding: 0, width: '100%', textAlign: 'left' }}
                            onClick={() => setHistoryOpen((o) => !o)}
                        >
                            🕒 Your Saved Comparisons
                            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '18px', fontWeight: 300 }}>{historyOpen ? '−' : '+'}</span>
                        </button>
                        {historyOpen && (
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s both' }}>
                                {history.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No saved sessions yet. Edit the comparison name above and press Enter to save.</p>}
                                {history.map((h) => (
                                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: '10px', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: '160px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{h.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {new Date(h.updatedAt).toLocaleDateString()} · {h.cars.length} cars
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => handleLoadSession(h)}>Load</button>
                                            <button style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)', color: 'var(--accent-red)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => handleDeleteSession(h.id)}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '28px 24px', color: 'var(--text-muted)', fontSize: '11px', lineHeight: 1.7 }}>
                <div className="container-max" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>Built with ❤️ for smarter car buying</span>
                    <button className="btn-ghost" onClick={handleShare} style={{ fontSize: '11px' }}>Share</button>
                    <ExportButton sessionName={session.name} />
                    <button className="btn-ghost" style={{ fontSize: '11px', color: 'var(--accent-red)' }} onClick={() => { if (confirm('Reset to defaults?')) dispatch({ type: 'SET_SESSION', session: newSession() }); }}>Reset</button>
                </div>
            </footer>

            {/* Add Car Modal */}
            {showAddModal && <AddCarModal onAdd={handleAddCar} onClose={() => setShowAddModal(false)} isMobile={isMobile} />}

            {/* Share Modal */}
            {showShareModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}>
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 80px rgba(0,0,0,0.8)', animation: 'slideUp 0.25s both' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>🔗 Comparison link ready!</h2>
                            <button className="btn-ghost" onClick={() => setShowShareModal(false)} style={{ fontSize: '20px', padding: '4px 10px' }}>×</button>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>Anyone with this link sees the exact same cars and inputs.</p>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input readOnly value={shareUrl} className="input-field" style={{ fontSize: '12px' }} onClick={(e) => (e.target as HTMLInputElement).select()} />
                            <button className="btn-primary" style={{ whiteSpace: 'nowrap', padding: '10px 18px', fontSize: '13px' }} onClick={handleCopyLink}>{copied ? '✓ Copied!' : 'Copy Link'}</button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <a href={`https://wa.me/?text=Check+out+this+car+comparison:+${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#25D366', color: '#fff', borderRadius: 'var(--radius-pill)', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>💬 WhatsApp</a>
                            <a href={`mailto:?subject=My+Car+Comparison&body=Check+out+this+car+comparison:+${encodeURIComponent(shareUrl)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--bg-input)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', border: '1px solid var(--border-subtle)' }}>✉️ Email</a>
                        </div>
                    </div>
                </div>
            )}

            {/* Undo Toast */}
            {undoData && (
                <div className="toast" style={{ animation: 'slideUp 0.3s both' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{undoData.car.emoji} {undoData.car.name} removed</span>
                    <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={handleUndo}>Undo</button>
                </div>
            )}
        </>
    );
}
