// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'CarCompare — Used Car Cost Calculator',
    description:
        'Compare the true cost of ownership for used cars — loan payments, fuel, insurance, maintenance, and resale — across 6 different scenarios.',
    keywords: 'used car, cost calculator, car comparison, loan EMI, true cost of ownership',
    icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body>{children}</body>
        </html>
    );
}
