import { useState, useRef, useCallback } from 'react';
import { Car, GlobalInputs } from '@/lib/types';

interface ComparisonSpreadsheetProps {
    cars: Car[];
    globalInputs: GlobalInputs;
    onUpdateCar: (id: string, updates: Partial<Car>) => void;
    onUpdateGlobal: (key: keyof GlobalInputs, value: number) => void;
    // Accepts two arbitrary indices to swap — used by drag-to-reorder
    onSwapCars?: (index1: number, index2: number) => void;
    onAddCar?: () => void;
    onRemoveCar?: (id: string) => void;
}

// ── Math helpers (unchanged from original) ────────────────────────────────────
function calcEMI(principal: number, apr: number, months: number): number {
    if (months === 0 || principal <= 0) return 0;
    if (apr === 0) return principal / months;
    const r = apr / 100 / 12;
    return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function calcFuelPerMonth(car: Car, dailyMiles: number, driveDays: number): number {
    // Guard against zero efficiency to avoid NaN when inputs are blank
    if (!car.efficiency || car.efficiency <= 0) return 0;
    const monthlyMiles = dailyMiles * driveDays;
    return (monthlyMiles / car.efficiency) * (car.fuelPrice || 0);
}

function calcFinancials(car: Car, globalInputs: GlobalInputs) {
    const ownershipMonths = globalInputs.ownershipYears * 12;
    const effectiveLoanTerm = globalInputs.syncLoanToOwnership
        ? ownershipMonths
        : (car.financingMethod === 'lease' ? ownershipMonths : (car.loanTerm || 0));

    const downPayment = car.downPayment || 0;
    const price = car.price || 0;
    const apr = car.apr || 0;
    const insurance = car.insurance || 0;
    const maintenance = car.maintenance || 0;
    const resaleValue = car.resaleValue || 0;
    const dispositionFee = car.leaseDispositionFee || 0;
    const leaseMonthlyPayment = car.leaseMonthlyPayment || 0;

    const loanPrincipal = Math.max(0, price - downPayment);
    const emi = car.financingMethod === 'lease'
        ? leaseMonthlyPayment
        : calcEMI(loanPrincipal, apr, effectiveLoanTerm);
    const fuel = calcFuelPerMonth(car, globalInputs.dailyMiles, globalInputs.driveDaysPerMonth);
    const totalMonthly = emi + fuel + insurance + maintenance;
    const totalAnnual = totalMonthly * 12;

    let loanBalance = 0;
    let netCashAtSale = 0;

    if (car.financingMethod === 'finance') {
        if (ownershipMonths < effectiveLoanTerm) {
            const r = apr / 100 / 12;
            if (r > 0) {
                loanBalance = loanPrincipal * (Math.pow(1 + r, effectiveLoanTerm) - Math.pow(1 + r, ownershipMonths)) / (Math.pow(1 + r, effectiveLoanTerm) - 1);
            } else {
                loanBalance = Math.max(0, loanPrincipal - (emi * ownershipMonths));
            }
        }
        netCashAtSale = resaleValue - loanBalance;
    } else {
        loanBalance = 0;
        netCashAtSale = -dispositionFee;
    }

    const totalMoneySpent = downPayment + (totalMonthly * ownershipMonths);
    const lifecycleLoss = totalMoneySpent - netCashAtSale;
    const trueCostPerYear = lifecycleLoss / globalInputs.ownershipYears;

    return {
        monthly: { emi, fuel, ins: insurance, maint: maintenance, total: totalMonthly },
        annual: { total: totalAnnual },
        endOfPeriod: {
            totalSpent: totalMoneySpent,
            balance: loanBalance,
            resale: car.financingMethod === 'finance' ? resaleValue : 0,
            netCash: netCashAtSale,
            loss: lifecycleLoss,
            dispositionFee: car.financingMethod === 'lease' ? dispositionFee : 0,
        },
        trueCostPerYear,
    };
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function getBestIndex(vals: number[], lowerIsBetter = true): number {
    if (vals.length < 2) return -1;
    const fn = lowerIsBetter ? Math.min : Math.max;
    const best = fn(...vals);
    return vals.indexOf(best);
}

function getCostStyle(val: number, allVals: number[], lowerIsBetter = true) {
    if (allVals.length < 2) return {};
    const best = lowerIsBetter ? Math.min(...allVals) : Math.max(...allVals);
    const worst = lowerIsBetter ? Math.max(...allVals) : Math.min(...allVals);
    if (best === worst) return {};
    if (val === best) return { color: 'var(--accent-green)', fontWeight: 700 };
    if (val === worst) return { color: 'var(--accent-red)', fontWeight: 600 };
    return { color: 'var(--accent-yellow)', fontWeight: 600 };
}

// ── Sub-components ────────────────────────────────────────────────────────────
// CellInput is defined outside to prevent focus-loss on re-render.
// isMutedZero=true renders blank when value is 0 to declutter non-applicable fields.
function CellInput({
    value, onChange, prefix, suffix, step = '1', disabled = false, placeholder = '0', isMutedZero = false
}: {
    value: number; onChange: (v: string) => void;
    prefix?: string; suffix?: string; step?: string; disabled?: boolean; placeholder?: string;
    isMutedZero?: boolean;
}) {
    const showBlank = isMutedZero && (value === 0 || value === undefined);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            background: disabled ? 'transparent' : '#f8f9fa',
            border: (disabled || isMutedZero) ? 'none' : '1px solid #e5e7eb',
            borderRadius: '6px', padding: '5px 10px',
            justifyContent: 'center',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            minHeight: '29px', // Maintain height even if blank
        }}
            className="cell-input-wrap"
        >
            {!showBlank && (
                <>
                    {prefix && <span style={{ color: '#374151', fontSize: '12px', flexShrink: 0, fontWeight: 600 }}>{prefix}</span>}
                    <input
                        type="number"
                        step={step}
                        value={value || ''}
                        onChange={e => onChange(e.target.value)}
                        disabled={disabled}
                        placeholder={placeholder}
                        className="hide-spin-buttons"
                        style={{
                            width: `${Math.max(2, String(value ?? '').length) + 1.5}ch`,
                            minWidth: '30px', maxWidth: '120px', background: 'transparent',
                            border: 'none', outline: 'none', fontSize: '13px',
                            textAlign: 'center',
                            color: disabled ? '#9ca3af' : '#111827',
                            fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'text',
                            fontVariantNumeric: 'tabular-nums',
                            padding: 0,
                            margin: 0,
                            opacity: isMutedZero ? 0.4 : 1,
                        }}
                    />
                    {suffix && <span style={{ color: '#374151', fontSize: '12px', flexShrink: 0, fontWeight: 600 }}>{suffix}</span>}
                </>
            )}
        </div>
    );
}
// ── Shared Constants & Styles ──────────────────────────────────────────────────
const fmt = (n: number) => '$' + Math.round(n).toLocaleString();

const LC: React.CSSProperties = {
    padding: '10px 20px', borderBottom: '1px solid #f1f3f5',
    fontSize: '13px', fontWeight: 500, color: '#374151',
    position: 'sticky', left: 0, background: 'inherit', zIndex: 5,
    borderRight: '2px solid #e5e7eb', whiteSpace: 'nowrap',
};
const LC_BOLD: React.CSSProperties = { ...LC, fontWeight: 700, color: '#111827' };
const LC_INDENT: React.CSSProperties = { ...LC, paddingLeft: '36px', color: '#6b7280', fontSize: '12px' };
const DC: React.CSSProperties = {
    padding: '10px 16px', borderBottom: '1px solid #f1f3f5',
    borderLeft: '1px solid #e5e7eb', textAlign: 'center',
    fontSize: '13px', color: '#111827', fontVariantNumeric: 'tabular-nums',
};
const DC_BOLD: React.CSSProperties = { ...DC, fontWeight: 700, fontSize: '14px' };

function handleCarNumHelper(id: string, field: keyof Car, val: string, onUpdateCar: (id: string, update: Partial<Car>) => void) {
    let num = parseFloat(val.replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) num = 0;
    onUpdateCar(id, { [field]: num });
}

/** A full-width grey section header */
function SectionRow({ label, carsCount }: { label: string; carsCount: number }) {
    return (
        <tr>
            <td colSpan={carsCount + 1} style={{
                padding: '8px 20px', background: '#f1f3f5',
                fontSize: '11px', fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb',
            }}>
                {label}
            </td>
        </tr>
    );
}

/** 
 * Sub-components (SectionRow, CalcRow, InputRow) are defined at top-level 
 * to maintain stable component identity. Defining them inside the main 
 * component would cause them to be recreated on every render, causing 
 * child inputs to lose focus during keystrokes.
 */

/** A read-only calculated result row */
function CalcRow({
    label, values, cars, format, bold, allVals, lowerIsBetter = true, subLabel
}: {
    label: string; values: (number | string)[]; cars: Car[]; format?: (v: number | string) => string;
    bold?: boolean; allVals?: number[]; lowerIsBetter?: boolean; subLabel?: string;
}) {
    const fmtVal = format ?? ((v: number | string) => typeof v === 'number' ? fmt(v) : v);
    return (
        <tr style={{ background: bold ? '#f8f9fa' : '#fff' }}>
            <td style={bold ? LC_BOLD : LC}>
                {label}
                {subLabel && <div style={{ fontSize: '10px', fontWeight: 400, color: '#9ca3af', marginTop: '2px' }}>{subLabel}</div>}
            </td>
            {values.map((v, i) => {
                const style = (allVals && typeof v === 'number') ? getCostStyle(v, allVals, lowerIsBetter) : {};
                return (
                    <td key={cars[i]?.id ?? i} style={{ ...(bold ? DC_BOLD : DC), ...style }}>
                        {fmtVal(v)}
                    </td>
                );
            })}
        </tr>
    );
}

/** An input row — shows a muted "0" for fields not applicable to the current financing method */
function InputRow({
    label, field, cars, onUpdateCar, globalInputs, prefix, suffix, step, disabled
}: {
    label: string; field: keyof Car | ((car: Car) => keyof Car); cars: Car[];
    onUpdateCar: (id: string, update: Partial<Car>) => void;
    globalInputs: GlobalInputs; prefix?: string; suffix?: string | ((car: Car) => string); step?: string;
    disabled?: (car: Car) => boolean;
}) {
    return (
        <tr style={{ background: '#fff' }}>
            <td style={LC}>{label}</td>
            {cars.map(car => {
                const isDisabled = disabled ? disabled(car) : false;
                const fieldKey = typeof field === 'function' ? field(car) : field;
                const isLoanTerm = fieldKey === 'loanTerm' && globalInputs.syncLoanToOwnership;
                const val = isLoanTerm ? globalInputs.ownershipYears * 12 : (car[fieldKey] as number);

                const renderSuffix = () => {
                    if (isLoanTerm) return `mo (synced)`;
                    if (typeof suffix === 'function') return suffix(car);
                    return suffix;
                };

                return (
                    <td key={car.id} style={DC}>
                        <CellInput
                            value={isDisabled ? 0 : val}
                            onChange={v => {
                                if (!isDisabled) {
                                    handleCarNumHelper(car.id, fieldKey, v, onUpdateCar);
                                }
                            }}
                            prefix={prefix}
                            suffix={renderSuffix()}
                            step={step}
                            disabled={isDisabled || isLoanTerm}
                            isMutedZero={isDisabled}
                        />
                    </td>
                );
            })}
        </tr>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ComparisonSpreadsheet({
    cars, globalInputs, onUpdateCar, onUpdateGlobal, onSwapCars, onAddCar, onRemoveCar
}: ComparisonSpreadsheetProps) {
    // Track which column index is being dragged and which is the current drag-over target
    const dragIndexRef = useRef<number | null>(null);
    const [dragOver, setDragOver] = useState<number | null>(null);

    const fin = cars.map(c => calcFinancials(c, globalInputs));

    const handleCarNum = useCallback((id: string, field: keyof Car, val: string) => {
        handleCarNumHelper(id, field, val, onUpdateCar);
    }, [onUpdateCar]);

    const trueCosts = fin.map(f => f.trueCostPerYear);
    const bestIdx = getBestIndex(trueCosts);


    return (
        <section style={{ padding: '0 0 80px' }}>
            <div className="container-max" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* ─── GLOBAL INPUTS BAR ─── */}
                <div style={{
                    display: 'flex', gap: '16px', padding: '14px 20px',
                    background: '#fff', borderRadius: '10px',
                    border: '1px solid #e5e7eb', flexWrap: 'wrap',
                    alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                        Usage Assumptions
                    </span>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flex: 1 }}>
                        {[
                            { label: 'Distance / Day', key: 'dailyMiles' as keyof GlobalInputs, unit: 'mi' },
                            { label: 'Office Days / Mo', key: 'driveDaysPerMonth' as keyof GlobalInputs, unit: 'days' },
                            { label: 'Ownership Horizon', key: 'ownershipYears' as keyof GlobalInputs, unit: 'yrs' },
                        ].map(({ label, key, unit }) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{label}</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f3f5', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 10px' }}>
                                    <input
                                        type="number"
                                        value={globalInputs[key] as number}
                                        onChange={e => onUpdateGlobal(key, Number(e.target.value) || 0)}
                                        style={{ width: '52px', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#111827', fontFamily: 'inherit' }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{unit}</span>
                                </div>
                            </div>
                        ))}
                        {/* Sync Loan Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>Sync Loan Terms</label>
                            <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={!!globalInputs.syncLoanToOwnership}
                                    onChange={e => onUpdateGlobal('syncLoanToOwnership', e.target.checked ? 1 : 0)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer',
                                    backgroundColor: globalInputs.syncLoanToOwnership ? '#2563eb' : '#d1d5db',
                                    borderRadius: '22px', transition: '.3s',
                                }}>
                                    <span style={{
                                        position: 'absolute', height: '16px', width: '16px', left: '3px', bottom: '3px',
                                        backgroundColor: '#fff', transition: '.3s', borderRadius: '50%',
                                        transform: globalInputs.syncLoanToOwnership ? 'translateX(18px)' : 'translateX(0)',
                                    }} />
                                </span>
                            </label>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{globalInputs.syncLoanToOwnership ? 'On' : 'Off'}</span>
                        </div>
                    </div>
                </div>

                {/* ─── UNIFIED COMPARISON TABLE ─── */}
                <div style={{
                    background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    overflowX: 'auto',
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                        <colgroup>
                            {/* Label column */}
                            <col style={{ width: '200px', minWidth: '180px' }} />
                            {/* One column per car */}
                            {cars.map(c => <col key={c.id} />)}
                        </colgroup>

                        {/* ── COLUMN HEADERS ── */}
                        <thead>
                            <tr>
                                <th style={{
                                    padding: '14px 20px', textAlign: 'left', background: '#fff',
                                    fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase',
                                    letterSpacing: '0.06em', borderBottom: '2px solid #e5e7eb',
                                    position: 'sticky', left: 0, zIndex: 11,
                                }}>
                                    Vehicle
                                </th>
                                {cars.map((car, i) => (
                                    <th
                                        key={car.id}
                                        // HTML5 drag-to-reorder: drag this column and drop on another to swap
                                        draggable={!!onSwapCars}
                                        onDragStart={() => { dragIndexRef.current = i; }}
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                                        onDrop={() => {
                                            if (dragIndexRef.current !== null && dragIndexRef.current !== i) {
                                                onSwapCars?.(dragIndexRef.current, i);
                                            }
                                            dragIndexRef.current = null;
                                            setDragOver(null);
                                        }}
                                        onDragEnd={() => { dragIndexRef.current = null; setDragOver(null); }}
                                        style={{
                                            padding: '12px 16px', background: '#fff',
                                            borderBottom: '2px solid #e5e7eb',
                                            borderLeft: dragOver === i ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                            borderTop: '3px solid transparent',
                                            minWidth: '160px', cursor: onSwapCars ? 'grab' : 'default',
                                            opacity: dragIndexRef.current === i ? 0.5 : 1,
                                            transition: 'border-color 0.15s, opacity 0.15s',
                                            userSelect: 'none',
                                            textAlign: 'center',
                                        }}
                                    >
                                        {/* Drag grip hint + delete + Finance/Lease dropdown */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            {/* Drag grip (visual affordance for drag-to-reorder) */}
                                            <span style={{ color: '#d1d5db', fontSize: '14px', letterSpacing: '1px', cursor: 'grab', lineHeight: 1 }} title="Drag to reorder">⠿</span>
                                            {/* Finance / Lease select — compact dropdown instead of pill toggle */}
                                            <select
                                                value={car.financingMethod}
                                                onChange={e => onUpdateCar(car.id, { financingMethod: e.target.value as 'finance' | 'lease' })}
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                    fontSize: '11px', fontWeight: 600, border: '1px solid #e5e7eb',
                                                    borderRadius: '5px', padding: '3px 6px', background: '#f8f9fa',
                                                    color: '#374151', cursor: 'pointer', fontFamily: 'inherit',
                                                    appearance: 'auto',
                                                }}
                                            >
                                                <option value="finance">Finance</option>
                                                <option value="lease">Lease</option>
                                            </select>
                                            {onRemoveCar && cars.length > 2 && (
                                                <button
                                                    onClick={() => onRemoveCar(car.id)}
                                                    title="Remove car"
                                                    onMouseDown={e => e.stopPropagation()}
                                                    className="delete-car-btn"
                                                    // SVG icons are used instead of emojis (🗑) for a more premium, 
                                                    // professional aesthetic as per global design guidelines.
                                                    style={{ 
                                                        background: 'none', border: 'none', cursor: 'pointer', 
                                                        color: '#9ca3af', // Gray by default
                                                        fontSize: '14px', padding: '6px', borderRadius: '6px', 
                                                        lineHeight: 1, display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 6h18"></path>
                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        {/* Editable car name — no emoji */}
                                        <input
                                            value={car.name}
                                            onChange={e => onUpdateCar(car.id, { name: e.target.value })}
                                            onMouseDown={e => e.stopPropagation()} // prevent drag while editing name
                                            onClick={e => e.stopPropagation()}
                                            style={{
                                                background: 'transparent', border: 'none', outline: 'none',
                                                fontSize: '13px', fontWeight: 600, color: '#111827',
                                                width: '100%', borderBottom: '1px dashed #d1d5db',
                                                padding: '2px 0', cursor: 'text', fontFamily: 'inherit',
                                            }}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {/* ── PURCHASE & FINANCING ── */}
                            <SectionRow label="Purchase & Financing" carsCount={cars.length} />

                            <InputRow label="Purchase Price" field="price" prefix="$" disabled={c => c.financingMethod === 'lease'} cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs} />
                            <InputRow label="Down Payment" field="downPayment" prefix="$" cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs} />
                            <InputRow label="Interest Rate" field="apr" suffix="%" step="0.1" disabled={c => c.financingMethod === 'lease'} cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs} />
                            <InputRow
                                label="Loan / Lease Term"
                                field={c => c.financingMethod === 'lease' ? 'leaseTerm' : 'loanTerm'}
                                suffix="mo"
                                cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs}
                            />
                            <InputRow label="Lease Payment" field="leaseMonthlyPayment" prefix="$" disabled={c => c.financingMethod === 'finance'} cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs} />
                            <InputRow label="Lease Miles / Year" field="leaseMilesPerYear" suffix="mi" disabled={c => c.financingMethod === 'finance'} cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs} />

                            <CalcRow
                                label="Monthly Loan / Lease Payment"
                                values={fin.map(f => f.monthly.emi)}
                                cars={cars}
                                allVals={fin.map(f => f.monthly.emi)}
                                bold
                            />

                            {/* ── RUNNING COSTS ── */}
                            <SectionRow label="Monthly Running Costs" carsCount={cars.length} />

                            <InputRow
                                label="Fuel Efficiency"
                                field="efficiency"
                                suffix={c => c.efficiencyType === 'kwh' ? 'mi/kWh' : 'mpg'}
                                cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs}
                            />
                            <InputRow 
                                label="Energy / Fuel Price" 
                                field="fuelPrice" 
                                prefix="$" 
                                suffix={c => c.efficiencyType === 'kwh' ? '/ kWh' : '/ gal'} 
                                cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs}
                            />
                            <InputRow label="Insurance / Mo" field="insurance" prefix="$" cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs} />
                            <InputRow label="Maintenance / Mo" field="maintenance" prefix="$" cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs} />

                            <CalcRow
                                label="Monthly Energy Cost"
                                values={fin.map(f => f.monthly.fuel)}
                                cars={cars}
                                allVals={fin.map(f => f.monthly.fuel)}
                                subLabel="Based on your usage assumptions"
                            />

                            <CalcRow
                                label="Total Monthly Out-of-Pocket"
                                values={fin.map(f => f.monthly.total)}
                                cars={cars}
                                allVals={fin.map(f => f.monthly.total)}
                                bold
                                subLabel="EMI + Fuel + Insurance + Maintenance"
                            />

                            <SectionRow label={`End of Period (${globalInputs.ownershipYears} Yrs)`} carsCount={cars.length} />

                            <InputRow
                                label="Expected Resale Value"
                                field="resaleValue"
                                prefix="$"
                                disabled={c => c.financingMethod !== 'finance'}
                                cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs}
                            />
                            <InputRow
                                label="Lease Disposition Fee"
                                field="leaseDispositionFee"
                                prefix="$"
                                disabled={c => c.financingMethod !== 'lease'}
                                cars={cars} onUpdateCar={onUpdateCar} globalInputs={globalInputs}
                            />

                            <CalcRow
                                label="Total Money Spent"
                                values={fin.map(f => -f.endOfPeriod.totalSpent)}
                                cars={cars}
                                format={v => typeof v === 'number' ? `−${fmt(Math.abs(v))}` : v as string}
                            />

                            <tr style={{ background: '#fff' }}>
                                <td style={LC}>Remaining Loan Balance</td>
                                {fin.map((f, i) => (
                                    <td key={cars[i].id} style={{ ...DC, color: cars[i].financingMethod === 'lease' ? '#9ca3af' : '#111827' }}>
                                        {cars[i].financingMethod === 'lease' ? <span /> : `−${fmt(f.endOfPeriod.balance)}`}
                                    </td>
                                ))}
                            </tr>

                            <tr style={{ background: '#fff' }}>
                                <td style={LC}>Lease Disposition Fee</td>
                                {fin.map((f, i) => (
                                    <td key={cars[i].id} style={{ ...DC, color: cars[i].financingMethod === 'finance' ? '#9ca3af' : '#111827' }}>
                                        {cars[i].financingMethod === 'finance' ? <span /> : `−${fmt(f.endOfPeriod.dispositionFee)}`}
                                    </td>
                                ))}
                            </tr>

                            <CalcRow
                                label="Expected Resale Value"
                                values={fin.map((f, i) => f.endOfPeriod.resale)}
                                cars={cars}
                                allVals={fin.map(f => f.endOfPeriod.resale)}
                                lowerIsBetter={false}
                            />

                            <tr style={{ background: '#fff' }}>
                                <td style={{ ...LC_BOLD }}>Net Cash at Sale / Return</td>
                                {fin.map((f, i) => (
                                    <td key={cars[i].id} style={{ ...DC, fontWeight: 600, color: f.endOfPeriod.netCash >= 0 ? '#16a34a' : '#dc2626' }}>
                                        {f.endOfPeriod.netCash >= 0 ? '+' : '−'}{fmt(Math.abs(f.endOfPeriod.netCash))}
                                    </td>
                                ))}
                            </tr>

                            <SectionRow label="True Cost Analysis" carsCount={cars.length} />

                            <tr>
                                <td style={{ ...LC_BOLD, fontSize: '14px', fontWeight: 800 }}>
                                    True Cost / Year
                                    <div style={{ fontSize: '10px', fontWeight: 400, color: '#9ca3af', marginTop: '2px' }}>Full lifecycle ÷ ownership</div>
                                </td>
                                {fin.map((f, i) => {
                                    const isBest = i === bestIdx;
                                    return (
                                        <td key={cars[i].id} style={{
                                            padding: '14px 16px', textAlign: 'center',
                                            borderLeft: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb',
                                            background: isBest ? '#f0fdf4' : '#fff',
                                            fontSize: '18px', fontWeight: 800,
                                            color: isBest ? '#16a34a' : getCostStyle(f.trueCostPerYear, trueCosts, true).color ?? '#111827',
                                        }}>
                                            {fmt(f.trueCostPerYear)}
                                            {isBest && <div style={{ fontSize: '10px', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>✓ Best Deal</div>}
                                        </td>
                                    );
                                })}
                            </tr>

                            <CalcRow
                                label="True Cost / Month"
                                values={fin.map(f => f.trueCostPerYear / 12)}
                                cars={cars}
                                allVals={fin.map(f => f.trueCostPerYear / 12)}
                                bold
                            />

                            {/* ── ADD CAR FOOTER ── */}
                            {onAddCar && (
                                <tr>
                                    <td colSpan={cars.length + 1} style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#fafafa' }}>
                                        <button onClick={onAddCar} className="btn-secondary" style={{ fontSize: '13px', padding: '6px 16px' }}>
                                            + Add Another Car
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .cell-input-wrap:focus-within {
                    border-color: #2563eb !important;
                    background: #fff !important;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
                }
            `}</style>
        </section>
    );
}
