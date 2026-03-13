// lib/defaults.ts
import { Car, GlobalInputs } from './types';

export const DEFAULT_GLOBAL_INPUTS: GlobalInputs = {
    dailyMiles: 40,
    driveDaysPerMonth: 24,
    ownershipYears: 3,
    syncLoanToOwnership: false,
};

export const DEFAULT_CARS: Car[] = [
    // ── Used, Finance ──────────────────────────────────────────────────────────
    {
        id: '1',
        name: 'Used Tesla Model 3',
        year: '2022', note: '',
        financingMethod: 'finance',
        price: 22000, downPayment: 2000, apr: 8.5, loanTerm: 48,
        efficiencyType: 'kwh', efficiency: 4.0, fuelPrice: 0.15,
        insurance: 230, maintenance: 100,
        resaleValue: 11000,
        leaseMonthlyPayment: 0, leaseDispositionFee: 0,
        leaseTerm: 36, leaseMilesPerYear: 10000,
    },
    {
        id: '2',
        name: 'Used RAV4 Hybrid',
        year: '2020', note: '',
        financingMethod: 'finance',
        price: 24000, downPayment: 2000, apr: 8.5, loanTerm: 48,
        efficiencyType: 'mpg', efficiency: 38, fuelPrice: 5.2,
        insurance: 180, maintenance: 100,
        resaleValue: 14000,
        leaseMonthlyPayment: 0, leaseDispositionFee: 0,
        leaseTerm: 36, leaseMilesPerYear: 10000,
    },

    // ── New, Lease ────────────────────────────────────────────────────────────
    {
        id: '3',
        name: 'New Hyundai Ioniq 5',
        year: '2024', note: '',
        financingMethod: 'lease',
        price: 45000, downPayment: 3500, apr: 0, loanTerm: 0,
        efficiencyType: 'kwh', efficiency: 3.3, fuelPrice: 0.15,
        insurance: 240, maintenance: 50,
        resaleValue: 0,
        leaseMonthlyPayment: 299, leaseDispositionFee: 400,
        leaseTerm: 36, leaseMilesPerYear: 10000,
    },
    {
        id: '4',
        name: 'New Honda CR-V Hybrid',
        year: '2024', note: '',
        financingMethod: 'lease',
        price: 35000, downPayment: 3000, apr: 0, loanTerm: 0,
        efficiencyType: 'mpg', efficiency: 36, fuelPrice: 4.5,
        insurance: 220, maintenance: 50,
        resaleValue: 0,
        leaseMonthlyPayment: 359, leaseDispositionFee: 350,
        leaseTerm: 36, leaseMilesPerYear: 10000,
    },
];
