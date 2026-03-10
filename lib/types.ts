// lib/types.ts

export type EfficiencyType = 'mpg' | 'kwh';

export interface Car {
    id: string;
    name: string;
    year: string;
    note: string;
    emoji: string;
    accentColor: string;
    price: number;
    downPayment: number;
    apr: number;
    loanTerm: number;
    efficiencyType: EfficiencyType;
    efficiency: number;
    fuelPrice: number;
    insurance: number;
    maintenance: number;
    resaleValue: number;
}

export interface GlobalInputs {
    dailyMiles: number;
    driveDaysPerMonth: number;
    ownershipYears: number;
}

// Scenarios removed.

export interface ComparisonSession {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    cars: Car[];
    globalInputs: GlobalInputs;
}
