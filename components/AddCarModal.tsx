'use client';
import { useState } from 'react';
import { Car, EfficiencyType } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface AddCarModalProps {
    onAdd: (car: Car) => void;
    onClose: () => void;
    isMobile?: boolean;
}

const EMPTY_FORM = {
    name: '',
    year: '',
    note: '',
    price: '',
    downPayment: '0',
    apr: '6.5',
    loanTerm: '60',
    efficiencyType: 'mpg' as EfficiencyType,
    efficiency: '',
    fuelPrice: '4.90',
    insurance: '',
    maintenance: '',
    resaleValue: '',
    leaseTerm: '36',
    leaseMilesPerYear: '10000',
};

export default function AddCarModal({ onAdd, onClose, isMobile }: AddCarModalProps) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) {
        setForm((p) => {
            const next = { ...p, [key]: value };
            if (key === 'efficiencyType') {
                next.fuelPrice = value === 'kwh' ? '0.46' : '4.90';
                next.efficiency = '';
            }
            return next;
        });
        setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
    }

    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = 'Required';
        if (!form.year.trim()) errs.year = 'Required';
        const price = parseFloat(form.price);
        if (!form.price || isNaN(price) || price < 1000) errs.price = 'Must be ≥ $1,000';
        if (!form.downPayment || isNaN(parseFloat(form.downPayment))) errs.downPayment = 'Required';
        if (!form.apr || isNaN(parseFloat(form.apr))) errs.apr = 'Required';
        if (!form.loanTerm || isNaN(parseFloat(form.loanTerm))) errs.loanTerm = 'Required';
        const eff = parseFloat(form.efficiency);
        if (!form.efficiency || isNaN(eff) || eff < 1) errs.efficiency = 'Must be ≥ 1';
        if (!form.insurance || isNaN(parseFloat(form.insurance))) errs.insurance = 'Required';
        if (!form.maintenance || isNaN(parseFloat(form.maintenance))) errs.maintenance = 'Required';
        if (!form.resaleValue || isNaN(parseFloat(form.resaleValue))) errs.resaleValue = 'Required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    function handleSubmit() {
        if (!validate()) return;
        const car: Car = {
            id: uuidv4(),
            name: form.name.trim(),
            year: form.year.trim(),
            note: form.note.trim(),
            price: parseFloat(form.price),
            downPayment: parseFloat(form.downPayment),
            apr: parseFloat(form.apr),
            loanTerm: parseFloat(form.loanTerm),
            efficiencyType: form.efficiencyType,
            efficiency: parseFloat(form.efficiency),
            fuelPrice: parseFloat(form.fuelPrice),
            insurance: parseFloat(form.insurance),
            maintenance: parseFloat(form.maintenance),
            resaleValue: parseFloat(form.resaleValue),
            financingMethod: 'finance',
            leaseMonthlyPayment: 0,
            leaseDispositionFee: 395,
            leaseTerm: parseInt(form.leaseTerm, 10),
            leaseMilesPerYear: parseInt(form.leaseMilesPerYear, 10),
        };
        onAdd(car);
    }

    const modalStyle: React.CSSProperties = isMobile
        ? {
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '24px 20px 32px', maxHeight: '90vh', overflowY: 'auto',
            zIndex: 101, animation: 'slideUp 0.3s both',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
        }
        : {
            background: '#fff', borderRadius: '12px',
            border: '1px solid #e5e7eb', padding: '28px',
            width: '100%', maxWidth: '520px', maxHeight: '90vh',
            overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.25s both', position: 'relative', zIndex: 101,
        };

    const inp = (
        key: string, label: string, value: string,
        onChange: (v: string) => void,
        opts?: { type?: string; placeholder?: string; required?: boolean }
    ) => (
        <div>
            <label htmlFor={`add-car-${key}`} style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
                {label}{opts?.required && ' *'}
            </label>
            <input
                id={`add-car-${key}`}
                type={opts?.type || 'text'}
                value={value}
                placeholder={opts?.placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="input-field"
                style={errors[key] ? { borderColor: '#dc2626' } : {}}
            />
            {errors[key] && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>{errors[key]}</div>}
        </div>
    );

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={modalStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Add a Car</h2>
                    <button className="btn-ghost" onClick={onClose} aria-label="Close modal" style={{ fontSize: '20px', padding: '4px 10px', color: '#9ca3af' }}>×</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                        {inp('name', 'Car Name', form.name, (v) => setField('name', v), { required: true, placeholder: 'Toyota RAV4 Hybrid' })}
                        {inp('year', 'Year', form.year, (v) => setField('year', v), { required: true, placeholder: '2021' })}
                    </div>

                    {inp('note', 'Notes (optional)', form.note, (v) => setField('note', v), { placeholder: '1 owner · 52k mi' })}

                    {inp('price', 'On-Road Price ($)', form.price, (v) => setField('price', v), { required: true, type: 'number', placeholder: '28000' })}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        {inp('downPayment', 'Down Payment ($)', form.downPayment, (v) => setField('downPayment', v), { required: true, type: 'number', placeholder: '4000' })}
                        {inp('apr', 'APR (%)', form.apr, (v) => setField('apr', v), { required: true, type: 'number', placeholder: '6.5' })}
                        {inp('loanTerm', 'Loan Term (mo)', form.loanTerm, (v) => setField('loanTerm', v), { required: true, type: 'number', placeholder: '60' })}
                    </div>

                    {/* Fuel type */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: 500 }}>Fuel Type *</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {(['mpg', 'kwh'] as EfficiencyType[]).map((et) => (
                                <button key={et} onClick={() => setField('efficiencyType', et)}
                                    style={{
                                        padding: '7px 18px', borderRadius: '999px', cursor: 'pointer',
                                        border: `1px solid ${form.efficiencyType === et ? '#2563eb' : '#e5e7eb'}`,
                                        background: form.efficiencyType === et ? '#eff6ff' : '#f8f9fa',
                                        color: form.efficiencyType === et ? '#2563eb' : '#6b7280',
                                        fontSize: '13px', fontWeight: form.efficiencyType === et ? 600 : 400,
                                        fontFamily: 'inherit',
                                    }}>
                                    {et === 'mpg' ? '⛽ Gas/Hybrid' : '⚡ Electric (kWh)'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {inp(
                            'efficiency',
                            form.efficiencyType === 'kwh' ? 'Efficiency (mi/kWh)' : 'Efficiency (MPG)',
                            form.efficiency,
                            (v) => setField('efficiency', v),
                            { required: true, type: 'number', placeholder: form.efficiencyType === 'kwh' ? '3.8' : '32' }
                        )}
                        {inp(
                            'fuelPrice',
                            form.efficiencyType === 'kwh' ? 'Electricity ($/kWh)' : 'Fuel Price ($/gal)',
                            form.fuelPrice,
                            (v) => setField('fuelPrice', v),
                            { type: 'number' }
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {inp('insurance', 'Insurance ($/mo)', form.insurance, (v) => setField('insurance', v), { required: true, type: 'number', placeholder: '320' })}
                        {inp('maintenance', 'Maintenance ($/mo)', form.maintenance, (v) => setField('maintenance', v), { required: true, type: 'number', placeholder: '80' })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                        {inp('resaleValue', 'Est. Resale Value ($)', form.resaleValue, (v) => setField('resaleValue', v), { required: true, type: 'number', placeholder: '23000' })}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                        <button className="btn-primary" onClick={handleSubmit} style={{ flex: 2 }}>Add Car</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
