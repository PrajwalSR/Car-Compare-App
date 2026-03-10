'use client';
import { useEffect, useState } from 'react';
import { ComparisonSession } from '@/lib/types';
import { decodeStateFromUrl } from '@/lib/urlState';

import HeroSection from '@/components/HeroSection';
import ComparisonSpreadsheet from '@/components/ComparisonSpreadsheet';

export default function SharedPage({ params }: { params: { sessionId: string } }) {
    const [session, setSession] = useState<ComparisonSession | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const decoded = decodeStateFromUrl(params.sessionId);
        if (!decoded) { setError(true); return; }
        setSession(decoded);
    }, [params.sessionId]);

    function handleEditOwnCopy() {
        // Seed the session into localStorage and navigate home
        if (!session) return;
        try {
            localStorage.setItem('carcompare_session', JSON.stringify(session));
        } catch { }
        window.location.href = '/';
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: 'var(--text-secondary)', background: 'var(--bg-base)' }}>
                <div style={{ fontSize: '48px' }}>🔗</div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Invalid or expired link</h1>
                <p>This comparison link could not be decoded.</p>
                <a href="/" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>← Start a new comparison</a>
            </div>
        );
    }

    if (!session) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-base)', fontSize: '14px' }}>
                Loading comparison…
            </div>
        );
    }

    return (
        <>
            {/* Shared banner */}
            <div
                style={{
                    background: 'rgba(41,151,255,0.1)',
                    borderBottom: '1px solid rgba(41,151,255,0.2)',
                    padding: '10px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    fontSize: '13px',
                    color: 'var(--accent-blue)',
                }}
            >
                📋 Viewing a shared comparison — <strong>{session.name}</strong>
                <button
                    style={{
                        background: 'var(--accent-blue)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '980px',
                        padding: '6px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                    onClick={handleEditOwnCopy}
                >
                    Edit your own copy
                </button>
            </div>

            <HeroSection carCount={session.cars.length} />
            <ComparisonSpreadsheet
                cars={session.cars}
                globalInputs={session.globalInputs}
                onUpdateCar={() => { }}
                onUpdateGlobal={() => { }}
                onAddCar={() => { }}
            />
        </>
    );
}
