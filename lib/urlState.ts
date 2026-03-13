// lib/urlState.ts
import { ComparisonSession, Car } from './types';
import { v4 as uuidv4 } from 'uuid';

// Define a default for global inputs for backward compatibility
const DEFAULT_GLOBAL_INPUTS = {
    dailyMiles: 30,
    driveDaysPerMonth: 20,
    ownershipYears: 5,
    syncLoanToOwnership: true, // Default value
};

export function encodeStateToUrl(session: ComparisonSession): string {
    // Compress keys to 1-2 characters to prevent the URL from exceeding the 2000-character browser limit, 
    // especially when users add multiple cars.
    const minimal = {
        n: session.name,
        g: { // Compress globalInputs
            d: session.globalInputs.dailyMiles,
            p: session.globalInputs.driveDaysPerMonth,
            y: session.globalInputs.ownershipYears,
            s: session.globalInputs.syncLoanToOwnership ? 1 : 0, // Add syncLoanToOwnership
        },
        c: session.cars.map((car) => ({
            id: car.id,
            nm: car.name,
            yr: car.year,
            nt: car.note,
            pr: car.price,
            et: car.efficiencyType,
            ef: car.efficiency,
            fp: car.fuelPrice,
            ins: car.insurance,
            mn: car.maintenance,
            rv: car.resaleValue,
            lt: car.leaseTerm,
            lm: car.leaseMilesPerYear,
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
            id: string; nm: string; yr: string; nt: string;
            pr: number; et: 'mpg' | 'kwh'; ef: number; fp: number;
            ins: number; mn: number; rv: number;
            lt?: number; lm?: number;
        }) => ({
            id: c.id,
            name: c.nm,
            year: c.yr,
            note: c.nt,
            price: c.pr,
            efficiencyType: c.et,
            efficiency: c.ef,
            fuelPrice: c.fp,
            insurance: c.ins,
            maintenance: c.mn,
            resaleValue: c.rv || 0,
            leaseTerm: c.lt ?? 36,
            leaseMilesPerYear: c.lm ?? 10000,
        }));

        // Handle old format where globalInputs was not compressed
        const globalInputs = decoded.g ? {
            dailyMiles: Number(decoded.g.d) || DEFAULT_GLOBAL_INPUTS.dailyMiles,
            driveDaysPerMonth: Number(decoded.g.p) || DEFAULT_GLOBAL_INPUTS.driveDaysPerMonth,
            ownershipYears: Number(decoded.g.y) || DEFAULT_GLOBAL_INPUTS.ownershipYears,
            syncLoanToOwnership: decoded.g.s === 1, // Decode syncLoanToOwnership
        } : DEFAULT_GLOBAL_INPUTS;

        return {
            id: uuidv4(),
            name: decoded.n,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cars,
            globalInputs: globalInputs,
        };
    } catch {
        return null;
    }
}
