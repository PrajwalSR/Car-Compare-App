# 🚗 CarCompare — Product Requirements Document
### For AI Agent: Read every section before writing a single line of code.

---

## 0. WHAT THIS PRODUCT IS

**CarCompare** is a public web application that helps anyone buying a used car understand the **true cost of ownership** — not just the sticker price, but every dollar that leaves your pocket (loan payments, fuel, insurance, maintenance) minus every dollar you get back when you sell. The tool compares up to 10 cars side by side with customizable loan terms, providing a detailed breakdown of capital and operating costs. It features shareable links and session saving so users can come back and pick up where they left off.

**This is not a spreadsheet replacement. It is a product.** It should feel like a premium financial tool — think NerdWallet meets Apple.com with a sophisticated Slate/Zinc dark theme.

**Live at:** Vercel (Next.js). Built to scale — user accounts, API integrations, and collaboration features come later.

---

## 1. TECH STACK

```
Framework:    Next.js 14 (App Router)
Language:     TypeScript
Styling:      Tailwind CSS + custom CSS variables for design tokens
State:        React useState / useReducer (local), URL params for sharing
Persistence:  localStorage for sessions, URL encoding for sharing
Deployment:   Vercel (push to main = auto deploy)
Future-ready: Leave hooks for Supabase (auth + DB), Prisma (ORM)
```

**File structure the agent must create:**
```
/
├── app/
│   ├── layout.tsx          ← root layout, fonts, metadata
│   ├── page.tsx            ← home page (main app)
│   ├── globals.css         ← design tokens, resets
│   └── compare/
│       └── [sessionId]/
│           └── page.tsx    ← shared comparison page (read from URL)
├── components/
│   ├── HeroSection.tsx
│   ├── GlobalInputsBar.tsx
│   ├── CarCard.tsx
│   ├── CarGrid.tsx
│   ├── ComparisonSpreadsheet.tsx
│   ├── AddCarModal.tsx
│   └── ExportButton.tsx
├── lib/
│   ├── defaults.ts         ← default car data
│   ├── types.ts            ← TypeScript interfaces
│   ├── urlState.ts         ← encode/decode state to/from URL
│   └── storage.ts          ← localStorage helpers
└── public/
```

---

## 2. DESIGN SYSTEM

### Philosophy
Apple.com dark mode aesthetic. Premium, minimal, confident. Every element earns its place. No clutter.

### Color Tokens (define in globals.css as CSS variables)
```css
:root {
  --bg-base:        #000000;   /* page background */
  --bg-elevated:    #1d1d1f;   /* cards, sections */
  --bg-input:       #2d2d2f;   /* input fields */
  --bg-hover:       #3a3a3c;   /* hover state */

  --text-primary:   #f5f5f7;
  --text-secondary: #a1a1a6;
  --text-muted:     #6e6e73;

  --accent-blue:    #2997ff;   /* primary actions, links, active states */
  --accent-green:   #30d158;   /* best value, positive outcomes */
  --accent-orange:  #ff9f0a;   /* warnings, caution */
  --accent-red:     #ff453a;   /* danger, remaining loan balance */
  --accent-purple:  #bf5af2;   /* insurance cost segment */

  --border-subtle:  rgba(255,255,255,0.08);
  --border-input:   rgba(255,255,255,0.15);
  --border-active:  var(--accent-blue);

  --radius-card:    18px;
  --radius-pill:    980px;
  --radius-input:   8px;

  --shadow-card:    0 4px 24px rgba(0,0,0,0.4);
  --shadow-glow-green:  0 0 20px rgba(48, 209, 88, 0.3);
  --shadow-glow-blue:   0 0 20px rgba(41, 151, 255, 0.3);
  --shadow-glow-red:    0 0 16px rgba(255, 69, 58, 0.3);

  --transition-default: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --transition-fast:    all 0.15s ease;
}
```

### Typography
```
Display font:  "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif
Body font:     Same stack, lighter weight
Numbers:       font-variant-numeric: tabular-nums (always, for all data cells)
```

### Spacing Scale
```
4, 8, 12, 16, 24, 32, 48, 64, 80, 120px
Max content width: 1200px, centered, padding: 0 24px
```

### Component Patterns
- **Cards:** `background: var(--bg-elevated)`, `border-radius: var(--radius-card)`, `border: 1px solid var(--border-subtle)`
- **Inputs:** `background: var(--bg-input)`, no border by default, `2px solid var(--accent-blue)` on focus, text turns accent-blue when user has edited from default
- **Pills/Tabs:** `border-radius: var(--radius-pill)`, active = white bg + dark text
- **Buttons primary:** Blue pill, `padding: 12px 28px`
- **Buttons secondary:** Outline, same pill shape

---

## 3. DATA MODEL & TYPES

```typescript
// lib/types.ts

export type EfficiencyType = 'mpg' | 'kwh';

export interface Car {
  id: string;              // uuid
  name: string;            // "BMW 3 Series"
  year: string;            // "2019"
  note: string;            // "3 owners · ~100k mi"
  emoji: string;           // "🚘"
  accentColor: string;     // "#0071e3" — used for glow ring and chart segment
  price: number;           // on-road all-in price
  efficiencyType: EfficiencyType;
  efficiency: number;      // MPG if gas, mi/kWh if EV
  fuelPrice: number;       // $/gal or $/kWh
  insurance: number;       // $/month
  maintenance: number;     // $/month estimated
  resaleValue: number;     // estimated resale value at end of timeline
}

export interface GlobalInputs {
  downPayment: number;     // $ applied to all cars
  apr: number;             // decimal e.g. 0.085 = 8.5%
  loanTermMonths: number;  // typically 36, 48, 60
  yearsOwned: number;      // Years to keep the vehicle before selling
  dailyMiles: number;
  driveDaysPerMonth: number;
}

export interface ComparisonSession {
  id: string;              // uuid, used in share URL
  name: string;            // user-named, e.g. "My LA Car Search Mar 2026"
  createdAt: string;       // ISO date
  updatedAt: string;
  cars: Car[];
  globalInputs: GlobalInputs;
}
```

---

## 4. DEFAULT DATA

```typescript
// lib/defaults.ts

export const DEFAULT_GLOBAL_INPUTS: GlobalInputs = {
  downPayment: 3000,
  apr: 0.085,
  dailyMiles: 40,
  driveDaysPerMonth: 24,
};

export const DEFAULT_CARS: Car[] = [
  {
    id: 'bmw-2019',
    name: 'BMW 3/4/5 Series',
    year: '2019',
    note: '3 owners · ~100k mi',
    emoji: '🚘',
    accentColor: '#0071e3',
    price: 20500,
    efficiencyType: 'mpg',
    efficiency: 24,
    fuelPrice: 5.45,
    insurance: 438,
    maintenance: 200,
    resaleValue: 11000,
  },
  {
    id: 'tesla-m3-2022',
    name: 'Tesla Model 3 AWD',
    year: '2022',
    note: '~44k mi · Supercharger only',
    emoji: '⚡',
    accentColor: '#30d158',
    price: 24000,
    efficiencyType: 'kwh',
    efficiency: 3.8,
    fuelPrice: 0.46,
    insurance: 410,
    maintenance: 50,
    resaleValue: 11000,
  },
  {
    id: 'camry-hybrid-2022',
    name: 'Toyota Camry Hybrid',
    year: '2022',
    note: '~45k mi',
    emoji: '🍃',
    accentColor: '#ffd60a',
    price: 26200,
    efficiencyType: 'mpg',
    efficiency: 47,
    fuelPrice: 4.90,
    insurance: 335,
    maintenance: 75,
    resaleValue: 19000,
  },
  {
    id: 'accord-2022',
    name: 'Honda Accord',
    year: '2022',
    note: '~50k mi',
    emoji: '🚗',
    accentColor: '#ff9f0a',
    price: 24200,
    efficiencyType: 'mpg',
    efficiency: 32,
    fuelPrice: 4.90,
    insurance: 343,
    maintenance: 80,
    resaleValue: 17000,
  },
  {
    id: 'civic-2022',
    name: 'Honda Civic',
    year: '2022',
    note: '~45k mi',
    emoji: '🏎️',
    accentColor: '#ff453a',
    price: 21000,
    efficiencyType: 'mpg',
    efficiency: 36,
    fuelPrice: 4.90,
    insurance: 328,
    maintenance: 70,
    resaleValue: 14500,
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 's1',
    label: '2yr Loan → Sell at 12mo',
    shortLabel: 'S1',
    icon: '🔵',
    loanTermMonths: 24,
    sellAtMonths: 12,
    isWarning: true,
    description: 'You take a 24-month loan but sell at 12 months — you still owe 12 payments to the bank at the time of sale. The remaining balance gets deducted from your resale proceeds.',
  },
  {
    id: 's2',
    label: '2yr Loan → Sell at 24mo',
    shortLabel: 'S2',
    icon: '🟢',
    loanTermMonths: 24,
    sellAtMonths: 24,
    badge: 'Cleanest Exit',
    isWarning: false,
    description: 'Loan term and selling date perfectly align. Zero remaining balance at sale — you keep all the resale proceeds. The simplest, cleanest exit.',
  },
  {
    id: 's3',
    label: '1yr Loan → Sell at 12mo',
    shortLabel: 'S3',
    icon: '🟡',
    loanTermMonths: 12,
    sellAtMonths: 12,
    isWarning: false,
    description: 'Aggressive payoff — higher monthly EMI for 12 months, but the loan is fully paid when you sell. Similar net cost to S2 but higher monthly burden.',
  },
  {
    id: 's4',
    label: '1yr Loan → Sell at 24mo',
    shortLabel: 'S4',
    icon: '🟣',
    loanTermMonths: 12,
    sellAtMonths: 24,
    badge: 'EMI-Free Yr 2',
    isWarning: false,
    description: 'Pay off the loan in 12 months (high EMI), then drive completely EMI-free for 12 more months before selling. Often the lowest net cost per month overall.',
  },
  {
    id: 's5',
    label: '3yr Loan → Sell at 12mo',
    shortLabel: 'S5',
    icon: '🔴',
    loanTermMonths: 36,
    sellAtMonths: 12,
    isWarning: true,
    description: 'Standard 36-month dealer loan, but you sell after just 12 months. You still owe 24 more payments — a large remaining balance must be paid from your resale proceeds.',
  },
  {
    id: 's6',
    label: '3yr Loan → Sell at 24mo',
    shortLabel: 'S6',
    icon: '⚪',
    loanTermMonths: 36,
    sellAtMonths: 24,
    isWarning: true,
    description: 'Typical 36-month loan, sell at 2 years. Still owe 12 more payments at the time of sale. Bank gets a cut of your resale before you pocket anything.',
  },
];
```

## 5. CALCULATION ENGINE & DETAILED BREAKDOWN

### Location: `components/ComparisonSpreadsheet.tsx` (or extracted local helpers)
### Rule: The calculator must provide an exact step-by-step breakdown.

The engine computes a `calcTrueCostYear(car, globalInputs)` returning a nested breakdown used directly in the UI.

**Required Breakdown Structure:**
1. **Purchase & Financing:** Vehicle Price, Downpayment, Loan Amount, Monthly EMI, Total Paid to Bank (Principal + Interest).
2. **Value at Sale:** Resale Value, Remaining Loan Balance (if sold before loan payoff), Net Proceeds to User.
3. **Capital Cost:** Total Depreciation + Total Interest Paid.
4. **Operating Costs:** Fuel, Insurance, Maintenance (yearly totals).
5. **Final 'True Cost' Number:** Capital Cost + Operating Costs.

---

## 6. USER SCENARIOS (Behavior Specifications)

> These are the core user journeys. The AI agent must implement each one fully and test it.

---

### SCENARIO A — First Visit (New User, No Session)

**Situation:** User lands on CarCompare for the first time with no prior data.

**What happens:**
1. App checks `localStorage` for a saved session → finds nothing
2. App initializes with `DEFAULT_CARS` (5 pre-loaded cars) and `DEFAULT_GLOBAL_INPUTS`
3. Hero section animates in: title fades up, subtitle fades up 200ms later, a glowing gradient orb pulses in the background
4. Page renders fully. All 5 car cards are visible in a responsive grid.
5. Below the grid, the "Comparison Overview" spreadsheet is visible, outlining the true cost of each car side-by-side.
6. The global inputs bar is visible with default values: Down $3,000 | APR 8.5% | Loan 60 mo | Keep 5 yrs
7. No modals, no onboarding overlays — the data speaks for itself

**Test cases:**
- [ ] `localStorage` is empty on first load → default data shown
- [ ] All 5 cards are rendered with correct default values
- [ ] Page title is "CarCompare — Used Car Cost Calculator"
- [ ] No console errors

---

### SCENARIO B — User Edits a Global Input

**Situation:** User changes the APR from 8.5% to 7.0% (they found a better rate at a credit union).

**What triggers this:**
- User clicks the APR input in the sticky global inputs bar
- Types "7" or "7.0"
- Presses Tab or clicks away

**What happens:**
1. As user types, recalculation fires on every keystroke (`onChange`)
2. All EMI values across all 5 car cards update instantly — no button press needed
3. All net ownership costs in the Comparison Spreadsheet recalculate and update
4. Changed input field shows value in `var(--accent-blue)` to signal "this is different from default"
5. Session is auto-saved to `localStorage`

**Edge cases to handle:**
- User types "0" → APR = 0, EMI = principal / term (straight division), no division by zero crash
- User types a negative number → clamp to 0
- User types > 50% → show warning tooltip "APR seems very high — double check"
- User clears the field entirely → revert to last valid value, don't crash
- User types letters → ignore non-numeric input

**Test cases:**
- [ ] APR 0.085 → 0.07: EMI changes accordingly (verify with formula)
- [ ] APR change updates ALL 5 cars simultaneously
- [ ] APR = 0 does not crash the app
- [ ] APR input shows blue text after user edits it
- [ ] Session auto-saves to localStorage after edit

---

### SCENARIO C — User Expands Cost Breakdown Rows

**Situation:** User is viewing the Comparison Overview and wants to see exactly how much they are paying to the bank vs keeping in equity.

**What triggers this:** Click on "Purchase & Financing" or "Capital Cost" row headers.

**What happens:**
1. The row expands smoothly to reveal child rows (e.g., Downpayment, Loan Amount, Monthly EMI, Total Paid to Bank).
2. The user can see exactly where their money is going for each vehicle side-by-side.

**Test cases:**
- [ ] Clicking a parent row opens/closes child rows.
- [ ] Values in child rows sum up to match the top-level parent row expectations (e.g. Capital Cost = Depreciation + Interest).

---

### SCENARIO D — User Edits a Per-Car Input Inline

**Situation:** User found a better deal on the BMW — $19,000 instead of $20,500. They want to update the price and see how it changes the comparison.

**What triggers this:** User clicks on the price value in the BMW card → it becomes an editable input field

**What happens:**
1. Click on the price value in any car card → it transforms into an `<input>` (inline edit pattern)
2. Field is pre-filled with current value, text is selected for easy overtype
3. User types "19000"
4. On blur (click away) or Enter key:
   - Input reverts to styled text display showing "$19,000"
   - BMW's loan principal updates: $19,000 - $3,000 = $16,000
   - BMW's EMI recalculates
   - BMW's net costs recalculate in the spreadsheet
   - Only BMW's card updates — other cars are unaffected
5. The edited value shows in accent blue to signal "this is a custom edit"
6. Session auto-saves to localStorage

**Which car fields are inline-editable:**
- On-road price
- Insurance/month
- Maintenance/month
- Fuel price ($/gal or $/kWh)
- Efficiency (MPG or mi/kWh)
- Resale Value

**Which are NOT inline-editable (shown as static info):**
- Car name, year, note, emoji (only editable in the "Edit Car" modal)

**Edge cases:**
- User types 0 for price → clamp to minimum $1,000, show tooltip
- User types 0 for efficiency → clamp to 1 to avoid division by zero
- User types a number for a field that's currently showing a formula-derived value → show warning "This field is calculated — are you sure you want to override?"

**Test cases:**
- [ ] Click on BMW price → becomes editable input
- [ ] Changing BMW price to $19,000: principal = $16,000, EMI (24mo, 8.5%) ≈ $728/mo (was $795)
- [ ] Other 4 cars are not affected by BMW price change
- [ ] Edited field shows in blue to signal custom override
- [ ] localStorage updates after edit
- [ ] Press Escape during edit → cancels, reverts to previous value

---

### SCENARIO E — User Adds a New Car

**Situation:** User wants to add a 2021 Toyota RAV4 Hybrid they found on Craigslist for $28,000.

**What triggers this:** Click "+ Add Car" button below the car grid

**What happens:**
1. A modal/drawer slides up from the bottom (mobile) or appears centered (desktop)
2. Form fields:
   - Car name (text) *required*
   - Year (text) *required*
   - Notes (text, e.g. "1 owner · 52k mi") *optional*
   - Emoji picker (grid of 12 common car emojis to pick from, or text input)
   - Accent color (6 preset swatches to choose from)
   - On-road price ($) *required*
   - Fuel type: radio buttons "⛽ Gas/Hybrid" or "⚡ Electric (kWh)"
   - If Gas: MPG field appears, Fuel price ($/gal) pre-fills to $4.90
   - If Electric: mi/kWh field appears, Fuel price ($/kWh) pre-fills to $0.46
   - Insurance/month ($) *required*
   - Maintenance/month ($) *required*
   - Est. Resale Value ($) *required*
3. User fills in the form and clicks "Add Car"
4. Validation runs — all required fields must be non-empty and numeric where expected
5. New car is appended to the car array
6. Modal closes
7. New car card appears at the end of the grid with a subtle "slide in from right" animation
8. The spreadsheet recalculates including the new car
9. Session saves to localStorage

**Edge cases:**
- User closes modal without completing → no car added, no state change
- User adds more than 6 cars → grid reflows gracefully (don't break layout)
- User adds a car with the same name as existing car → allowed (different id)

**Test cases:**
- [ ] Adding RAV4 Hybrid: name="Toyota RAV4 Hybrid", year="2021", price=$28,000, mpg=38, fuelPrice=$4.90, insurance=$320, maint=$80, resale=$23,000
- [ ] After adding, 6 cards are visible in the grid
- [ ] Closing modal without submitting adds 0 cars

---

### SCENARIO F — User Removes a Car

**Situation:** User decides the BMW is too risky at 100k miles and removes it from the comparison.

**What triggers this:** Hover over BMW card → "×" remove button appears in top-right corner → click it

**What happens:**
1. A confirmation appears: "Remove BMW 3/4/5 Series from comparison?" with [Cancel] and [Remove] buttons — do NOT remove without confirmation
2. User clicks [Remove]
3. BMW card animates out (`opacity → 0`, `height → 0`, 200ms)
4. Remaining 4 cards reflow in the grid
5. Spreadsheet recalculates without BMW
6. Session saves to localStorage
7. An "Undo" toast notification appears at bottom: "BMW removed — [Undo]" visible for 5 seconds

**Undo behavior:**
- User clicks [Undo] within 5 seconds → BMW reappears in its original position, all results restored
- If 5 seconds pass without undo → BMW is gone, toast disappears

**Test cases:**
- [ ] Remove button only visible on hover
- [ ] Confirmation dialog appears before removal
- [ ] After removal, 4 cars remain in grid
- [ ] Undo toast appears and works within 5 seconds
- [ ] After 5 seconds, undo is no longer possible
- [ ] Cannot remove the last car (minimum 2 cars required for comparison)

---

### SCENARIO G — User Shares a Comparison

**Situation:** User has customized their comparison (changed some prices, added a car, active on S4) and wants to send it to their friend to get a second opinion.

**What triggers this:** Click "Share" button in the top-right of the page

**What happens:**
1. App encodes the current full state into a URL-safe string:
   - All car data (including custom edits)
   - Global inputs (down payment, APR, miles, days)
   - Session name if user named it
2. The URL becomes: `https://carcompare.vercel.app/compare/[base64-encoded-state]`
   - OR: `https://carcompare.vercel.app/?session=[id]` if using a stored session
3. A modal appears: "Comparison link ready!" with:
   - The URL displayed in a copyable input field
   - [Copy Link] button → copies to clipboard, shows "Copied!" for 2 seconds
   - [Share via WhatsApp] button → opens WhatsApp with pre-filled message: "Check out this car comparison I made: [url]"
   - [Share via Email] button → opens default mail client with subject "My Car Comparison" and the URL in the body
4. The URL is immediately shareable — anyone who opens it sees the EXACT same data

**Recipient experience (opening a shared link):**
1. App reads the encoded state from URL
2. Populates cars, global inputs from the shared state
3. Shows a subtle banner at top: "📋 Viewing a shared comparison — [Edit your own copy]"
4. Clicking "Edit your own copy" → decouples from the shared URL, creates a new localStorage session with this data as the starting point

**URL encoding rules:**
- Must survive copy-paste (no special chars that break)
- Must be under 2000 characters for most car counts (use efficient encoding)
- If URL is too long (>2000 chars), fall back to saving session to localStorage and sharing a session ID in URL instead
- Never store sensitive data in URL (there is none in this app, so this is fine)

**Test cases:**
- [ ] Share button generates a valid URL
- [ ] Opening the shared URL restores all cars with all custom edits
- [ ] Copy Link button copies to clipboard and shows "Copied!"
- [ ] WhatsApp link opens with correct pre-filled text
- [ ] "Edit your own copy" creates a new session and removes the shared banner
- [ ] Shared URL works on mobile browser

---

### SCENARIO H — User Names and Saves a Session

**Situation:** User has built their perfect comparison and wants to save it with a name so they can come back later.

**What triggers this:** Click on "Untitled Comparison" text at the top → it becomes editable

**What happens:**
1. Session name field at top of page (below hero) is always visible, defaulting to "Untitled Comparison"
2. User clicks it → becomes an inline editable input
3. User types "My LA Car Search — March 2026"
4. On Enter or blur → saves to localStorage under this session
5. A subtle "Saved" checkmark appears next to the name for 1.5 seconds then fades

**Comparison History (bottom of page, collapsible section):**
- Shows last 5 named sessions from localStorage
- Each row: session name | date saved | number of cars | active scenario | [Load] button | [Delete] button
- Clicking [Load] replaces the current comparison with the saved one (with confirmation if current session has unsaved changes)
- Sessions are stored in localStorage as an array of `ComparisonSession` objects

**Test cases:**
- [ ] Session name is editable inline
- [ ] Saved sessions appear in history list (up to 5 most recent)
- [ ] Loading a saved session restores all cars, inputs, and active scenario
- [ ] Deleting a session removes it from the list
- [ ] If localStorage is full, oldest session is dropped to make room

---

### SCENARIO I — User Exports to PDF

**Situation:** User wants a PDF of their comparison to show to a car dealer or send to their parents.

**What triggers this:** Click "Export PDF" button

**What happens:**
1. Triggers standard `window.print()` behavior or utilizes a specialized PDF-generation library.
1. App uses the browser's `window.print()` with a custom `@media print` stylesheet — no external library needed
2. Print stylesheet:
   - Hides: hero section, global inputs bar (but prints the values as text), scenario tabs (prints active scenario label), share button, export button, comparison history, footer links
   - Shows: a clean print header with "CarCompare — [Session Name]" + date generated
   - Prints: all car cards in a 2-column print grid, scenario matrix table, insights panel
   - Switches to white background, dark text for print
   - Forces page break before the matrix table if needed
3. Browser's native print dialog opens → user can "Save as PDF"

**Test cases:**
- [ ] Print dialog opens on click
- [ ] Print preview shows white background (not dark)
- [ ] Car cards are readable in print layout
- [ ] Session name and date appear in print header
- [ ] Navigation elements are hidden in print

---

### SCENARIO J — Insights Panel Auto-Updates

**Situation:** As the user changes any input or switches scenarios, the Insights Panel at the bottom of the page automatically updates with contextually relevant tips.

**Always shown:**
- "🏆 Best Deal in [active scenario]: [Car Name] at $[net cost] net over [X] months ($[net/mo]/mo)"
- "💡 [Car Name] has the lowest monthly payment at $[totalMonthly]/mo"

**Conditionally shown (only when relevant):**

| Condition | Message shown |
|-----------|---------------|
| Any car has remaining balance > $500 in active scenario | "⚠️ [Car Name] has $X,XXX remaining loan balance at [X]mo sale — this comes out of your resale proceeds" |
| Tesla is in the list | "⚡ Tesla tip: Adding a Level 2 home charger (~$800–1,200 installed) cuts charging cost from $128/mo to ~$40/mo — pays for itself in ~10 months" |
| APR is >= 8% | "🏦 Your APR is [X]%. At a 760 credit score, try PenFed or Navy Federal before signing — rates of 6.5–7.0% could save you $400–600 over the loan term" |
| S1 or S5 or S6 is active (warning scenarios) | "⚠️ In this scenario, some cars still have a loan balance at sale. The bank gets paid first from your resale proceeds." |
| S4 is active | "🟣 Scenario 4 magic: Pay off your loan in year 1, then drive EMI-free in year 2. This is often the lowest total cost if you can handle higher payments in year 1." |
| User has only 2 cars left | "💡 Add more cars to get a better comparison — the more options you compare, the clearer the best deal becomes" |
| Any car's net cost is within $500 of another | "📊 [Car A] and [Car B] are very close in net cost ($X difference) — the tiebreaker may be how much you value [Car A's feature] vs [Car B's feature]" |

**Test cases:**
- [ ] Best deal insight updates when scenario changes
- [ ] Best deal insight updates when any input changes
- [ ] Tesla tip only shows when Tesla is in the cars list
- [ ] APR tip only shows when APR >= 8%
- [ ] Removing Tesla from cars list → Tesla tip disappears
- [ ] All insights update within 50ms of any state change (no perceptible lag)

---

### SCENARIO K — Mobile User Experience

**Situation:** User opens CarCompare on their iPhone 14 (390px wide screen).

**What must work on mobile:**
1. Hero section: headline scales down gracefully, orb effect still renders
2. Global inputs bar: scrolls horizontally if inputs don't fit, OR stacks to 2×2 grid
3. Scenario tabs: horizontally scrollable row, no wrapping
4. Car cards: stack to 1 column (full width)
5. Scenario matrix table: horizontally scrollable, car names are sticky left column
6. Add Car modal: slides up as a bottom sheet (not centered modal)
7. Share button: tapping opens native share sheet on mobile (`navigator.share()` API if available, fallback to copy link)
8. Cost breakdown bars: work at full width
9. All tap targets: minimum 44×44px (Apple HIG standard)

**Test cases (test at 390px viewport width):**
- [ ] No horizontal overflow on any section (except intentionally scrollable matrix)
- [ ] All 5 car cards are readable at 390px
- [ ] Scenario tabs are scrollable horizontally
- [ ] Add Car modal opens as bottom sheet
- [ ] Share uses `navigator.share()` if available
- [ ] All buttons are at least 44px tall

---

## 7. PAGE STRUCTURE & COMPONENTS

Build these sections in order, top to bottom:

### 7.1 `<HeroSection>`
- Full-width, `min-height: 60vh`
- Dark bg with: gradient orb (CSS radial, `#2997ff` → transparent, blurred), subtle dot grid texture
- Animated in on load: `translateY(20px) → translateY(0)`, `opacity 0 → 1`, staggered 100ms per element
- Content: eyebrow label ("USED CAR COST CALCULATOR"), H1 headline ("Find Your Best Car Deal"), subtitle text, one live stat that updates: "Currently analyzing [N] cars across 6 scenarios"
- No CTA button needed — just scroll down

### 7.2 `<GlobalInputsBar>` — sticky
- Sticks to top of viewport after user scrolls past hero
- Glassmorphism: `backdrop-filter: blur(20px)`, `background: rgba(0,0,0,0.7)`
- 4 inputs: Down Payment ($) | APR (%) | Daily Miles | Drive Days/Month
- Each shows: small label above, editable value below
- "Reset to defaults" link at far right
- Changes trigger instant recalculation of everything

### 7.3 `<ScenarioTabs>`
- 6 pill tabs in a horizontal row
- Each: `icon + shortLabel + badge` (if scenario has a badge)
- Active: white bg, dark text
- Warning scenarios (S1, S5, S6): show subtle orange dot indicator
- Smooth crossfade when switching

### 7.4 `<CarGrid>` + `<CarCard>`
- Responsive grid: `repeat(auto-fill, minmax(300px, 1fr))`
- Each `<CarCard>` contains:
  - **Card header:** emoji with color glow ring + name + year + note + [×] remove (hover only)
  - **Price row:** label + editable price value
  - **Monthly costs strip:** 4 small pills showing EMI | Fuel | Insurance | Maintenance
  - **Animated cost bar:** stacked horizontal segments, proportional widths, animates on scenario change
    - Segments: EMI (blue) | Fuel (orange) | Insurance (purple) | Maintenance (red)
    - Labels below each segment if wide enough
  - **Divider**
  - **Scenario results block** (updates per active scenario):
    - "Total Monthly All-In" — large, prominent
    - "Cash out over [X] months" — secondary
    - "Resale at [X]mo" — editable inline, shows in blue if edited
    - Remaining Balance row — only shows if > $100, red text with warning icon
    - "Net Cash from Sale" — secondary
    - **"Net Ownership Cost" — LARGEST NUMBER on card, green if best, size: 28-32px bold**
    - "= $[net/mo]/mo equivalent"
  - **Bottom badges:** 👑 Best Deal (if lowest net cost in scenario) | ⚠️ Balance Risk (if hasRemainingBalance)
- If `isBestInScenario`: card gets `box-shadow: var(--shadow-glow-green)`, green border accent

### 7.5 `<ScenarioMatrix>`
- A compact table below the cards
- Rows = cars, Columns = 6 scenarios (S1–S6)
- Cells = net ownership cost, formatted as "$XX,XXX"
- Best cell per column: green bg
- Worst cell per column: subtle red tint bg
- Active scenario column: highlighted with blue header
- Car names in leftmost column with their emoji
- Title: "All Scenarios at a Glance"

### 7.6 `<CostBreakdownChart>`
- Pure CSS stacked bar chart (no Chart.js, no D3)
- For the active scenario: 5 side-by-side grouped bars, one per car
- Each bar is divided into: EMI / Fuel / Insurance / Maintenance
- Segments animate (width transitions) on scenario change
- Legend below the chart
- X-axis: car names, Y-axis: dollar amounts in $5k increments

### 7.7 `<InsightsPanel>`
- Dark card with auto-generated insights from Scenario J
- Title: "💡 Key Insights"
- Each insight is a row with icon + text
- Updates reactively with all other state changes

### 7.8 `<ComparisonHistory>` (collapsible)
- Shows last 5 saved sessions from localStorage
- "Your Saved Comparisons" title with collapse/expand toggle
- Each row: name | date | #cars | scenario | [Load] [Delete]

### 7.9 Footer
- Sources text (see Section 9)
- "Built with ❤️ for smarter car buying"
- Links: [Share] [Export PDF] [Reset]

---

## 8. STATE MANAGEMENT

```typescript
// The single source of truth — all state flows from here

interface AppState {
  session: ComparisonSession;
  activeScenarioId: string;
  allResults: ScenarioResult[];    // computed from session.cars + session.globalInputs
  history: ComparisonSession[];    // from localStorage
  isSharedView: boolean;           // true if viewing a shared URL
}

// State update rules:
// 1. Any change to cars or globalInputs → immediately recompute allResults
// 2. Any change to allResults → immediately re-derive isBestInScenario flags
// 3. Any change to session → debounce 500ms → save to localStorage
// 4. Never save to localStorage in shared view mode (don't overwrite user's own sessions)
```

---

## 9. URL STATE ENCODING

```typescript
// lib/urlState.ts

// Encode state to URL-safe base64
export function encodeStateToUrl(session: ComparisonSession): string {
  const minimal = {
    n: session.name,
    a: session.activeScenarioId,
    g: session.globalInputs,
    c: session.cars.map(car => ({
      id: car.id, nm: car.name, yr: car.year, nt: car.note,
      em: car.emoji, cl: car.accentColor,
      pr: car.price, et: car.efficiencyType,
      ef: car.efficiency, fp: car.fuelPrice,
      ins: car.insurance, mn: car.maintenance,
      r12: car.resale12, r24: car.resale24,
    })),
  };
  return btoa(encodeURIComponent(JSON.stringify(minimal)));
}

// Decode URL state back to session
export function decodeStateFromUrl(encoded: string): ComparisonSession | null {
  try {
    const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
    // map back to full Car objects...
    return reconstructSession(decoded);
  } catch {
    return null; // invalid URL, fall back to defaults
  }
}
```

---

## 10. SOURCES TEXT (use verbatim in footer)

```
Data sources (March 2026): Prices based on real LA market listings —
BMW $20.5k (Beverly Hills BMW, friend deal) · Tesla M3 LR AWD: Edmunds LA avg + CA tax (~10.25%) ·
Camry Hybrid, Accord, Civic: CarGurus LA listings + CA tax. APR: Experian Q1 2026, 760 credit score
prime bracket (8.5%). Insurance: Insure.com CA 2026 estimates (28yr, full coverage, clean record) —
CA does not use gender as a rating factor. Fuel: GasBuddy LA, Mar 2026 — premium $5.45/gal,
regular $4.90/gal. EV: Tesla Supercharger CA avg $0.46/kWh (EnergySage 2025), 0.263 kWh/mi,
10% charging loss overhead. Resale: User-verified private-party LA listings, Mar 2026.
All figures are estimates — verify with current listings before making a financial decision.
```

---

## 11. QUALITY & TEST CHECKLIST

The agent must verify ALL of the following before marking the build complete:

### Calculation Accuracy
- [ ] BMW (price $20,500, down $3,000, APR 8.5%, 24mo): EMI = $795/mo ±$2
- [ ] Tesla fuel (40mi/day × 24days, 3.8 mi/kWh, $0.46/kWh, 1.10 loss) = $128/mo ±$2
- [ ] Camry fuel (40×24, 47 MPG, $4.90/gal) = $100/mo ±$2
- [ ] S2 remaining balance for any car (24mo loan, sell at 24mo) = $0 exactly
- [ ] S4 (1yr loan, sell at 24mo): EMI only paid for 12 months, running costs for 24 months
- [ ] S1 BMW (24mo loan, sell at 12mo): remaining balance ≈ $9,187 ±$50
- [ ] Civic S2 net cost ≈ $20,828 ±$50 (should be cheapest in S2)
- [ ] Camry S2 net cost ≈ $21,560 ±$50

### Behavior
- [ ] Changing any input causes instant recalculation (< 50ms perceived lag)
- [ ] Best deal badge moves correctly when scenario changes
- [ ] Add car → car appears, all scenarios update
- [ ] Remove car → confirmation → car gone → undo works for 5 seconds
- [ ] Share URL → open URL in incognito → same data appears
- [ ] Session persists after browser refresh (localStorage)
- [ ] Reset to defaults works completely

### Design
- [ ] Dark theme throughout (no white backgrounds except print)
- [ ] No layout breaks at 390px, 768px, 1200px, 1440px
- [ ] All interactive elements have hover states
- [ ] All transitions are smooth (no jarring snaps)
- [ ] Numbers use tabular-nums
- [ ] Scroll-triggered animations fire once on enter (not every scroll)

### Accessibility
- [ ] All inputs have associated `<label>` elements
- [ ] Color is never the ONLY differentiator (badges + text always accompany color)
- [ ] Keyboard navigation works: Tab through all interactive elements
- [ ] Focus rings are visible (don't remove `outline`)

---

## 12. FUTURE FEATURES (design for extensibility, don't build yet)

When the agent writes the code, structure it to make these easy to add later:

- **User auth (Supabase):** `ComparisonSession` already has an `id` — just needs a `userId` field and a cloud save function
- **Real-time market prices:** `car.price`, `car.fuelPrice`, `car.resale12/24` could be fetched from an API — just swap the defaults source
- **Multiple comparison tabs:** `AppState.history` already exists — just add UI to switch between active sessions
- **Car notes / pros-cons:** Each `Car` could have a `notes: string` field for user annotations
- **Depreciation curve:** `resale12` and `resale24` could expand to a `resale: Record<number, number>` map for any month
- **Email PDF:** Export button could POST to a Vercel serverless function that generates PDF server-side

---

*End of PRD. Build exactly this. Ask no clarifying questions — everything is specified above. When in doubt, refer to the behavior scenarios in Section 6.*
