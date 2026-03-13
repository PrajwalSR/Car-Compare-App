// lib/urlState.ts
import { ComparisonSession, Car } from './types';
import { v4 as uuidv4 } from 'uuid';

export function encodeStateToUrl(session: ComparisonSession): string {
    // Compress keys to 1-2 characters to prevent the URL from exceeding the 2000-character browser limit, 
    // especially when users add multiple cars.
    const minimal = {
        n: session.name,
        g: session.globalInputs,
        c: session.cars.map((car) => ({
            id: car.id,
            nm: car.name,
            yr: car.year,
            nt: car.note,
            em: car.emoji,
            cl: car.accentColor,
            pr: car.price,
            et: car.efficiencyType,
            ef: car.efficiency,
            fp: car.fuelPrice,
            ins: car.insurance,
            mn: car.maintenance,
            rv: car.resaleValue,
        })),
    };
    try {
        return btoa(encodeURIComponent(JSON.stringify(minimal)));
    } catch {
        return '';
    }
}

export function decodeStateFromUrl(encoded: string): ComparisonSession | null {
    try {
        const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
        const cars: Car[] = decoded.c.map((c: {
            id: string; nm: string; yr: string; nt: string; em: string; cl: string;
            pr: number; et: 'mpg' | 'kwh'; ef: number; fp: number;
            ins: number; mn: number; rv: number;
        }) => ({
            id: c.id,
            name: c.nm,
            year: c.yr,
            note: c.nt,
            emoji: c.em,
            accentColor: c.cl,
            price: c.pr,
            efficiencyType: c.et,
            efficiency: c.ef,
            fuelPrice: c.fp,
            insurance: c.ins,
            maintenance: c.mn,
            resaleValue: c.rv || 0,
        }));
        return {
            id: uuidv4(),
            name: decoded.n,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cars,
            globalInputs: decoded.g,
        };
    } catch {
        return null;
    }
}
