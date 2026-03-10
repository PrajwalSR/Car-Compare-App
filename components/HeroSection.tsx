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
            style={{ minHeight: '60vh', background: 'var(--bg-base)' }}
        >
            {/* Gradient orb */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: '40%',
                    left: '50%',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(41,151,255,0.22) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                    transform: 'translate(-50%, -50%)',
                    animation: 'pulse-orb 6s ease-in-out infinite',
                    pointerEvents: 'none',
                }}
            />

            <div className="container-max relative z-10 py-20 w-full text-center">
                <p
                    ref={eyebrowRef}
                    style={{
                        fontSize: '11px',
                        letterSpacing: '0.15em',
                        fontWeight: 700,
                        color: 'var(--accent-blue)',
                        textTransform: 'uppercase',
                        marginBottom: '20px',
                        opacity: 0,
                    }}
                >
                    Used Car Cost Calculator
                </p>

                <h1
                    ref={h1Ref}
                    style={{
                        fontSize: 'clamp(40px, 6vw, 72px)',
                        fontWeight: 700,
                        lineHeight: 1.05,
                        letterSpacing: '-0.02em',
                        color: 'var(--text-primary)',
                        marginBottom: '20px',
                        opacity: 0,
                    }}
                >
                    Find Your Best
                    <br />
                    <span style={{ color: 'var(--accent-blue)' }}>Car Deal.</span>
                </h1>

                <p
                    ref={subtitleRef}
                    style={{
                        fontSize: 'clamp(16px, 2vw, 20px)',
                        color: 'var(--text-secondary)',
                        maxWidth: '560px',
                        margin: '0 auto 40px',
                        lineHeight: 1.6,
                        opacity: 0,
                    }}
                >
                    Compare the true cost of ownership — loans, fuel, insurance, maintenance, and resale —
                    across different cars side-by-side.
                </p>

                <div
                    ref={statRef}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'rgba(41,151,255,0.1)',
                        border: '1px solid rgba(41,151,255,0.25)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '10px 20px',
                        fontSize: '14px',
                        color: 'var(--accent-blue)',
                        fontWeight: 500,
                        opacity: 0,
                    }}
                >
                    <span style={{ fontSize: '18px' }}>📊</span>
                    Currently analyzing <strong className="num">{carCount}</strong> cars
                </div>
            </div>
        </section>
    );
}
