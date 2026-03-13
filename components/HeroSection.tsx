'use client';
import { useEffect, useRef } from 'react';

interface HeroSectionProps {
    carCount: number;
}

export default function HeroSection({ carCount }: HeroSectionProps) {
    const eyebrowRef = useRef<HTMLParagraphElement>(null);
    const h1Ref = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const statRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const items = [eyebrowRef, h1Ref, subtitleRef, statRef];
        items.forEach((ref, i) => {
            if (ref.current) {
                ref.current.style.animationDelay = `${i * 100}ms`;
                ref.current.classList.add('animate-fade-up');
            }
        });
    }, []);

    return (
        <section
            className="hero-section dot-grid relative overflow-hidden flex items-center"
            style={{ minHeight: '46vh', background: '#fff', borderBottom: '1px solid #e5e7eb' }}
        >
            {/* Subtle blue orb — toned down for light theme */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', top: '50%', left: '50%',
                    // Relative sizing to ensure the orb doesn't trigger overflow 
                    // or look awkward on very small mobile screens (Rule 5).
                    width: 'min(700px, 140vw)', height: 'min(400px, 80vw)',
                    background: 'radial-gradient(ellipse, rgba(37,99,235,0.06) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                    transform: 'translate(-50%, -50%)',
                    animation: 'pulse-orb 8s ease-in-out infinite',
                    pointerEvents: 'none',
                }}
            />

            <div className="container-max relative z-10 py-16 w-full text-center">
                <p
                    ref={eyebrowRef}
                    style={{
                        fontSize: '11px', letterSpacing: '0.15em', fontWeight: 700,
                        color: '#2563eb', textTransform: 'uppercase',
                        marginBottom: '16px', opacity: 0,
                    }}
                >
                    True Cost of Ownership Calculator
                </p>

                <h1
                    ref={h1Ref}
                    style={{
                        fontSize: 'clamp(36px, 5.5vw, 64px)', fontWeight: 800,
                        lineHeight: 1.08, letterSpacing: '-0.03em',
                        color: '#111827', marginBottom: '18px', opacity: 0,
                    }}
                >
                    Find Your Best
                    <br />
                    <span style={{ color: '#2563eb' }}>Car Deal.</span>
                </h1>

                <p
                    ref={subtitleRef}
                    style={{
                        fontSize: 'clamp(15px, 1.8vw, 18px)', color: '#6b7280',
                        maxWidth: '520px', margin: '0 auto 32px',
                        lineHeight: 1.65, opacity: 0,
                    }}
                >
                    Compare the true cost of ownership — loans, fuel, insurance,
                    maintenance, and resale value — across cars side-by-side.
                </p>

                <div
                    ref={statRef}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: '999px', padding: '8px 20px',
                        fontSize: '13px', color: '#2563eb', fontWeight: 600, opacity: 0,
                    }}
                >
                    {/* SVG icon replaces 📊 for a more premium look per brand standards */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '-1px' }}>
                        <path d="M12 20V10"></path>
                        <path d="M18 20V4"></path>
                        <path d="M6 20v-4"></path>
                    </svg>
                    <span>Currently comparing <strong className="num">{carCount}</strong> {carCount === 1 ? 'car' : 'cars'}</span>
                </div>
            </div>
        </section>
    );
}
