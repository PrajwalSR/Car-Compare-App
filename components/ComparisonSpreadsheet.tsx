'use client';
import { useState } from 'react';
import { Car, GlobalInputs } from '@/lib/types';

interface ComparisonSpreadsheetProps {
    cars: Car[];
    globalInputs: GlobalInputs;
    onUpdateCar: (id: string, updates: Partial<Car>) => void;
    onUpdateGlobal: (key: keyof GlobalInputs, value: number) => void;
    onAddCar?: () => void;
}

// ── Math helpers
function calcEMI(principal: number, apr: number, months: number): number {
    if (months === 0 || principal <= 0) return 0;
    if (apr === 0) return principal / months;
    const r = apr / 100 / 12; // convert percentage to monthly decimal
    return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function calcFuelPerMonth(car: Car, dailyMiles: number, driveDays: number): number {
    const monthlyMiles = dailyMiles * driveDays;
    return (monthlyMiles / car.efficiency) * car.fuelPrice;
}

function getCostColorStyle(val: number, allVals: number[]) {
    // If we only have 1 car, comparison is meaningless, so keep text neutral
    if (allVals.length < 2) return { color: 'var(--text-primary)', fontWeight: 500 };
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    if (min === max) return { color: 'var(--text-primary)', fontWeight: 500 };

    // Lower costs are better: min cost is green (good deal), max cost is red (expensive)
    if (val === min) return { color: 'var(--accent-green)', fontWeight: 600 };
    if (val === max) return { color: 'var(--accent-red)', fontWeight: 600 };
    
    // Everything in between is assigned a 'caution' yellow
    return { color: 'var(--accent-yellow)', fontWeight: 600 };
}

function calcTrueCostYear(car: Car, globalInputs: GlobalInputs): { costPerYear: number, totalCost: number, breakdown: any } {
    const ownershipMonths = globalInputs.ownershipYears * 12;
    const loanPrincipal = Math.max(0, car.price - car.downPayment);
    const emi = calcEMI(loanPrincipal, car.apr, car.loanTerm);
    const paymentsMade = Math.min(ownershipMonths, car.loanTerm);
    const totalEmiPaid = emi * paymentsMade;

    let loanBalance = 0;
    if (ownershipMonths < car.loanTerm) {
        const r = car.apr / 100 / 12;
        if (r > 0) {
            // Standard amortization formula to find the remaining principal balance after N payments
            loanBalance = loanPrincipal * (Math.pow(1 + r, car.loanTerm) - Math.pow(1 + r, ownershipMonths)) / (Math.pow(1 + r, car.loanTerm) - 1);
        } else {
            // Handle 0% APR promotional loans linearly to prevent division by zero in the formula above
            loanBalance = loanPrincipal - (emi * ownershipMonths);
        }
    }

    const principalPaid = loanPrincipal - loanBalance;
    const interestPaid = totalEmiPaid - principalPaid;
    const netFromSale = car.resaleValue - loanBalance;
    const totalPaidToBankAndDealer = car.downPayment + totalEmiPaid;
    const trueCapitalCost = totalPaidToBankAndDealer - netFromSale;
    const depreciation = car.price - car.resaleValue;

    const fuel = calcFuelPerMonth(car, globalInputs.dailyMiles, globalInputs.driveDaysPerMonth);
    const totalFuel = fuel * ownershipMonths;
    const totalInsurance = car.insurance * ownershipMonths;
    const totalMaintenance = car.maintenance * ownershipMonths;
    const totalOperating = totalFuel + totalInsurance + totalMaintenance;

    const totalCost = trueCapitalCost + totalOperating;

    return {
        costPerYear: totalCost / globalInputs.ownershipYears,
        totalCost,
        breakdown: {
            purchase: {
                price: car.price,
                downpayment: car.downPayment,
                loanPrincipal,
                totalPaidOut: totalPaidToBankAndDealer
            },
            loan: {
                totalEmiPaid,
                principalPaid,
                interestPaid,
                paymentsMade
            },
            sale: {
                resaleValue: car.resaleValue,
                remainingBalance: loanBalance,
                netCash: netFromSale
            },
            capital: {
                trueCapitalCost,
                depreciation,
                interestPaid
            },
            operating: {
                totalOperating,
                fuel: totalFuel,
                insurance: totalInsurance,
                maintenance: totalMaintenance
            }
        }
    };
}

export default function ComparisonSpreadsheet({ cars, globalInputs, onUpdateCar, onUpdateGlobal, onAddCar }: ComparisonSpreadsheetProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        purchase: false,
        loan: false,
        sale: false,
        capital: false,
        operating: false
    });

    const toggle = (section: string) => setExpanded(p => ({ ...p, [section]: !p[section] }));
    const fmt = (n: number) => '$' + Math.round(n).toLocaleString();

    function handleChange(id: string, field: keyof Car, val: string) {
        let num = parseFloat(val.replace(/[^0-9.-]/g, ''));
        if (isNaN(num)) num = 0;
        onUpdateCar(id, { [field]: num });
    }

    function renderInput(car: Car, field: keyof Car, label: string, prefix: string, suffix: string, step = "1") {
        const val = car[field] as number;
        return (
            <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</label>
                <div style={{
                    display: 'flex', alignItems: 'center', background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)', borderRadius: '6px',
                    padding: '6px 10px', transition: 'border-color 0.2s'
                }}>
                    {prefix && <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginRight: '6px' }}>{prefix}</span>}
                    <input
                        type="number"
                        step={step}
                        value={val === 0 ? '' : val}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleChange(car.id, field, e.target.value)}
                        style={{
                            width: '100%', background: 'transparent', border: 'none', outline: 'none',
                            color: 'var(--text-primary)', fontSize: '14px', fontWeight: ['price', 'resaleValue'].includes(field) ? 600 : 400,
                            fontFamily: 'inherit', textAlign: 'left'
                        }}
                    />
                    {suffix && <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginLeft: '6px' }}>{suffix}</span>}
                </div>
            </div>
        );
    }

    return (
        <section style={{ padding: '24px 0 80px' }}>
            <div className="container-max" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

                {/* ─── 1. GLOBAL INPUTS ─── */}
                <div style={{
                    display: 'flex', gap: '20px', padding: '16px 20px', background: 'var(--bg-elevated)',
                    borderRadius: '12px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap'
                }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Usage Assumptions
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Distance / Day</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="number" className="input-field num" value={globalInputs.dailyMiles} onChange={(e) => onUpdateGlobal('dailyMiles', Number(e.target.value) || 0)} style={{ width: '80px', padding: '6px 10px' }} />
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>mi</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Office Days / Mo</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="number" className="input-field num" value={globalInputs.driveDaysPerMonth} onChange={(e) => onUpdateGlobal('driveDaysPerMonth', Number(e.target.value) || 0)} style={{ width: '80px', padding: '6px 10px' }} />
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>days</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Ownership Horizon</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="number" className="input-field num" value={globalInputs.ownershipYears} onChange={(e) => onUpdateGlobal('ownershipYears', Number(e.target.value) || 0)} style={{ width: '80px', padding: '6px 10px' }} />
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>years</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── 2. VEHICLE INPUTS CARDS ─── */}
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Vehicle Inputs</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '20px',
                    }}>
                        {cars.map(car => (
                            <div key={car.id} style={{
                                background: 'var(--bg-elevated)', border: `1px solid var(--border-subtle)`,
                                borderTop: `4px solid ${car.accentColor}`, borderRadius: '12px', padding: '20px',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ fontSize: '24px' }}>{car.emoji}</div>
                                    <input
                                        value={car.name}
                                        onChange={(e) => onUpdateCar(car.id, { name: e.target.value })}
                                        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', width: '100%', borderBottom: '1px dashed var(--border-subtle)' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                                    {renderInput(car, 'price', 'Car Price', '$', '')}
                                    {renderInput(car, 'downPayment', 'Down Payment', '$', '')}
                                    {renderInput(car, 'apr', 'Interest Rate', '', '%', '0.1')}
                                    {renderInput(car, 'loanTerm', 'Loan Tenure', '', 'mo')}
                                </div>
                                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0 12px' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                                    {renderInput(car, 'efficiency', 'Efficiency', '', car.efficiencyType === 'mpg' ? 'mpg' : 'mi/kWh')}
                                    {renderInput(car, 'fuelPrice', 'Energy Cost', '$', '', '0.1')}
                                    {renderInput(car, 'insurance', 'Insurance/mo', '$', '')}
                                    {renderInput(car, 'maintenance', 'Maint/mo', '$', '')}
                                </div>
                                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0 12px' }} />
                                {renderInput(car, 'resaleValue', `Expected Resale (${globalInputs.ownershipYears} Yrs)`, '$', '')}
                            </div>
                        ))}
                        {onAddCar && (
                            <div
                                onClick={onAddCar}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--bg-elevated)', border: '2px dashed var(--border-subtle)',
                                    borderRadius: '12px', padding: '20px', cursor: 'pointer', opacity: 0.7,
                                    minHeight: '300px', transition: 'all 0.2s', color: 'var(--text-secondary)'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            >
                                <div style={{ fontSize: '36px', marginBottom: '8px' }}>➕</div>
                                <div style={{ fontWeight: 600 }}>Add Another Car</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── 3. COMPARISON OVERVIEW ─── */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Comparison Overview</h3>
                        {onAddCar && (
                            <button onClick={onAddCar} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                + Add Another Car
                            </button>
                        )}
                    </div>
                    <div style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        borderRadius: '16px', boxShadow: 'var(--shadow-sm)', overflowX: 'auto'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '16px', width: '220px', background: 'var(--bg-card)', borderRight: '2px solid var(--border-subtle)', borderBottom: '2px solid var(--border-subtle)' }}></th>
                                    {cars.map(car => (
                                        <th key={car.id} style={{ padding: '16px 20px', width: `${100 / cars.length}%`, background: `var(--bg-card)`, borderTop: `4px solid ${car.accentColor}`, borderBottom: `2px solid var(--border-subtle)`, borderRight: '1px solid var(--border-subtle)' }}>
                                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{car.emoji} {car.name}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Monthly Cashflow */}
                                {(() => {
                                    const emis = cars.map(c => calcEMI(Math.max(0, c.price - c.downPayment), c.apr, c.loanTerm));
                                    const fuels = cars.map(c => calcFuelPerMonth(c, globalInputs.dailyMiles, globalInputs.driveDaysPerMonth));
                                    const monthlies = cars.map((c, i) => emis[i] + fuels[i] + c.insurance + c.maintenance);

                                    const depLosses = cars.map(c => Math.max(0, c.price - c.resaleValue));
                                    const trueCostsFull = cars.map(c => calcTrueCostYear(c, globalInputs));
                                    const costPerYears = trueCostsFull.map(tc => tc.costPerYear);

                                    return (
                                        <>
                                            <tr><td colSpan={cars.length + 1} className="section-header">Monthly Cashflow</td></tr>
                                            <tr>
                                                <td className="row-label">Monthly EMI</td>
                                                {cars.map((c, i) => <td key={c.id} className="cell-val num" style={getCostColorStyle(emis[i], emis)}>{fmt(emis[i])}</td>)}
                                            </tr>
                                            <tr>
                                                <td className="row-label">Fuel / Energy</td>
                                                {cars.map((c, i) => <td key={c.id} className="cell-val num" style={getCostColorStyle(fuels[i], fuels)}>{fmt(fuels[i])}</td>)}
                                            </tr>
                                            <tr>
                                                <td className="row-label">Insurance</td>
                                                {cars.map((c, i) => <td key={c.id} className="cell-val num" style={getCostColorStyle(c.insurance, cars.map(x => x.insurance))}>{fmt(c.insurance)}</td>)}
                                            </tr>
                                            <tr>
                                                <td className="row-label">Maintenance</td>
                                                {cars.map((c, i) => <td key={c.id} className="cell-val num" style={getCostColorStyle(c.maintenance, cars.map(x => x.maintenance))}>{fmt(c.maintenance)}</td>)}
                                            </tr>
                                            <tr style={{ background: 'var(--bg-input)' }}>
                                                <td className="row-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Monthly All-In</td>
                                                {cars.map((c, i) => <td key={c.id} className="cell-val num" style={{ fontSize: '16px', ...getCostColorStyle(monthlies[i], monthlies) }}>{fmt(monthlies[i])}</td>)}
                                            </tr>

                                            {/* 1. Purchase & Financing */}
                                            <tr><td colSpan={cars.length + 1} className="section-header">Ownership Cost Breakdown ({globalInputs.ownershipYears} Yrs)</td></tr>
                                            <tr onClick={() => toggle('purchase')} style={{ cursor: 'pointer', background: 'var(--bg-input)' }}>
                                                <td className="row-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    <span style={{ display: 'inline-block', width: '20px', color: 'var(--text-muted)' }}>{expanded.purchase ? '▼' : '▶'}</span>
                                                    Purchase & Financing
                                                </td>
                                                {cars.map((c, i) => <td key={c.id} className="cell-val num" style={{ fontWeight: 600 }}>{fmt(trueCostsFull[i].breakdown.purchase.totalPaidOut)}</td>)}
                                            </tr>
                                            {expanded.purchase && (
                                                <>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px' }}>Vehicle Price</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">{fmt(c.price)}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px' }}>Downpayment (Paid Upfront)</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">{fmt(c.downPayment)}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px' }}>Total Loan Principal</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">{fmt(trueCostsFull[i].breakdown.purchase.loanPrincipal)}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px' }}>Total EMI Paid Over {globalInputs.ownershipYears} Yrs</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">{fmt(trueCostsFull[i].breakdown.loan.totalEmiPaid)}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '60px', color: 'var(--text-muted)', fontSize: '12px' }}>↳ Principal Portion</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num" style={{ color: 'var(--text-secondary)' }}>{fmt(trueCostsFull[i].breakdown.loan.principalPaid)}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '60px', color: 'var(--text-muted)', fontSize: '12px' }}>↳ Interest Portion</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num" style={{ color: 'var(--text-secondary)' }}>{fmt(trueCostsFull[i].breakdown.loan.interestPaid)}</td>)}
                                                    </tr>
                                                </>
                                            )}

                                            {/* 2. Value at Sale */}
                                            <tr onClick={() => toggle('sale')} style={{ cursor: 'pointer', background: 'var(--bg-input)' }}>
                                                <td className="row-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    <span style={{ display: 'inline-block', width: '20px', color: 'var(--text-muted)' }}>{expanded.sale ? '▼' : '▶'}</span>
                                                    Value at Sale ({globalInputs.ownershipYears} Yrs)
                                                </td>
                                                {cars.map((c, i) => <td key={c.id} className="cell-val num" style={{ fontWeight: 600, color: trueCostsFull[i].breakdown.sale.netCash > 0 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                                                    {trueCostsFull[i].breakdown.sale.netCash > 0 ? '+' : ''}{fmt(trueCostsFull[i].breakdown.sale.netCash)}
                                                </td>)}
                                            </tr>
                                            {expanded.sale && (
                                                <>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px' }}>Expected Resale Value</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">{fmt(c.resaleValue)}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px' }}>Remaining Loan Payoff to Bank</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">-{fmt(trueCostsFull[i].breakdown.sale.remainingBalance)}</td>)}
                                                    </tr>
                                                </>
                                            )}

                                            {/* 3. Capital Cost */}
                                            <tr onClick={() => toggle('capital')} style={{ cursor: 'pointer', background: 'var(--bg-input)' }}>
                                                <td className="row-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    <span style={{ display: 'inline-block', width: '20px', color: 'var(--text-muted)' }}>{expanded.capital ? '▼' : '▶'}</span>
                                                    Total Capital Cost (Value Lost)
                                                </td>
                                                {cars.map((c, i) => <td key={c.id} className="cell-val num" style={{ fontWeight: 600 }}>{fmt(trueCostsFull[i].breakdown.capital.trueCapitalCost)}</td>)}
                                            </tr>
                                            {expanded.capital && (
                                                <>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px', color: 'var(--text-secondary)' }}>Asset Depreciation</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">{fmt(trueCostsFull[i].breakdown.capital.depreciation)}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px', color: 'var(--text-secondary)' }}>Cost of Financing (Interest)</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">{fmt(trueCostsFull[i].breakdown.capital.interestPaid)}</td>)}
                                                    </tr>
                                                </>
                                            )}

                                            {/* 4. Operating Costs */}
                                            <tr onClick={() => toggle('operating')} style={{ cursor: 'pointer', background: 'var(--bg-input)' }}>
                                                <td className="row-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    <span style={{ display: 'inline-block', width: '20px', color: 'var(--text-muted)' }}>{expanded.operating ? '▼' : '▶'}</span>
                                                    Total Operating Costs
                                                </td>
                                                {cars.map((c, i) => <td key={c.id} className="cell-val num" style={{ fontWeight: 600 }}>{fmt(trueCostsFull[i].breakdown.operating.totalOperating)}</td>)}
                                            </tr>
                                            {expanded.operating && (
                                                <>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px', color: 'var(--text-secondary)' }}>Fuel / Energy</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">{fmt(trueCostsFull[i].breakdown.operating.fuel)}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px', color: 'var(--text-secondary)' }}>Insurance</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">{fmt(trueCostsFull[i].breakdown.operating.insurance)}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td className="row-label" style={{ paddingLeft: '40px', color: 'var(--text-secondary)' }}>Maintenance</td>
                                                        {cars.map((c, i) => <td key={c.id} className="cell-val num">{fmt(trueCostsFull[i].breakdown.operating.maintenance)}</td>)}
                                                    </tr>
                                                </>
                                            )}

                                            <tr><td colSpan={cars.length + 1} className="section-header" style={{ borderTop: '2px solid var(--border-subtle)' }}>Lifetime Summary</td></tr>
                                            <tr style={{ background: 'var(--bg-elevated)' }}>
                                                <td className="row-label" style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>True Cost / Year</td>
                                                {cars.map((c, i) => (
                                                    <td key={c.id} className="cell-val num" style={{ fontSize: '18px', ...getCostColorStyle(costPerYears[i], costPerYears) }}>
                                                        {fmt(costPerYears[i])}
                                                        <div style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px', opacity: 0.8, color: 'var(--text-secondary)' }}>
                                                            Lifetime: {fmt(trueCostsFull[i].totalCost)}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        </>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <style jsx>{`
                .section-header {
                    padding: 24px 20px 8px;
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    background: var(--bg-body);
                    border-bottom: 1px solid var(--border-subtle);
                }
                .row-label {
                    padding: 14px 20px;
                    border-bottom: 1px solid var(--border-subtle);
                    border-right: 2px solid var(--border-subtle);
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-secondary);
                }
                .cell-val {
                    padding: 14px 20px;
                    border-bottom: 1px solid var(--border-subtle);
                    border-right: 1px solid var(--border-subtle);
                }
                .highlight-blue { font-weight: 600; color: var(--accent-blue); }
                .highlight-orange { font-weight: 600; color: var(--accent-orange); }
            `}</style>
        </section>
    );
}
