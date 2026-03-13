// lib/types.ts

export type EfficiencyType = 'mpg' | 'kwh';

export interface Car {
    id: string;
    name: string;
    year: string;
    note: string;
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
    financingMethod: 'finance' | 'lease';
    leaseMonthlyPayment?: number;
    leaseTerm?: number;
    leaseMilesPerYear?: number;
    leaseDispositionFee?: number;
}

export interface GlobalInputs {
    dailyMiles: number;
    driveDaysPerMonth: number;
    ownershipYears: number;
    syncLoanToOwnership: boolean;
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
