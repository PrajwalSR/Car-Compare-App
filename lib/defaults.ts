// lib/defaults.ts
import { Car, GlobalInputs } from './types';

export const DEFAULT_GLOBAL_INPUTS: GlobalInputs = {
    dailyMiles: 40,
    driveDaysPerMonth: 24,
    ownershipYears: 3,
};

export const DEFAULT_CARS: Car[] = [
    {
        id: '1',
        name: 'Used AWD 2022',
        year: '2022',
        note: '',
        emoji: '🚘',
        accentColor: '#34C759', // iOS Green
        price: 26000,
        downPayment: 4000,
        apr: 7.19,
        loanTerm: 36,
        efficiencyType: 'kwh',
        efficiency: 3.8, // mi/kWh
        fuelPrice: 0.15, // $/kWh
        insurance: 180,
        maintenance: 50,
        resaleValue: 11000,
    },
    {
        id: '2',
        name: 'New RWD 2025 (Offer)',
        year: '2025',
        note: '',
        emoji: '✨',
        accentColor: '#007AFF', // iOS Blue
        price: 43500,
        downPayment: 6000,
        apr: 0,
        loanTerm: 60,
        efficiencyType: 'kwh',
        efficiency: 4.0, // mi/kWh
        fuelPrice: 0.15, // $/kWh
        insurance: 200,
        maintenance: 50,
        resaleValue: 23000,
    },
    {
        id: '3',
        name: 'New AWD 2025 (Tax + Offer)',
        year: '2025',
        note: '',
        emoji: '🚀',
        accentColor: '#5856D6', // iOS Purple
        price: 48900,
        downPayment: 10000,
        apr: 0,
        loanTerm: 60,
        efficiencyType: 'kwh',
        efficiency: 3.8, // mi/kWh
        fuelPrice: 0.15, // $/kWh
        insurance: 220,
        maintenance: 50,
        resaleValue: 25000,
    },
];
