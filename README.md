# 🚗 Car Compare App

A highly interactive, premium React application for comparing the true lifetime cost of vehicle ownership. Built with Next.js 16, TypeScript, and Vanilla CSS.

## Overview

Unlike standard auto loan calculators that only look at monthly payments, this application evaluates the **Total Cost of Ownership (TCO)**. It breaks down costs across four key dimensions over an adjustable ownership horizon:

1. **Purchase & Financing:** Downpayments, principal balance, and interest paid.
2. **Value at Sale:** Asset depreciation and net cash retrieved when selling the car.
3. **Capital Cost:** Total value lost to depreciation and loan interest.
4. **Operating Costs:** Monthly fuel/energy, insurance, and maintenance.

## Tech Stack

*   **Framework:** Next.js 16 (App Router / Turbopack)
*   **Language:** TypeScript
*   **Styling:** Vanilla CSS (Custom Variable Design System in `globals.css`)
*   **State Management:** React hooks + Base64 URL state sharing

## Core Architecture

The codebase handles complex state while maintaining a smooth, spreadsheet-like editing experience:

*   **`app/page.tsx`**: Main entry point. Manages global state, session handling, and URL parameter decoding.
*   **`components/ComparisonSpreadsheet.tsx`**: The primary UI engine. 
    *   **Sub-component Isolation**: Row and cell level components are defined outside the main render loop to preserve React component identity, effectively preventing focus-loss bugs during rapid input.
    *   **Dynamic UI Logic**: Features "Zero-Noise" filtering that blanks out non-applicable fields (e.g., Lease payments for financed cars) to maintain interface clarity.
*   **`components/AddCarModal.tsx`**: A sleek modal with comprehensive validation for adding new vehicles.
*   **`lib/urlState.ts`**: Enables instant sharing of comparison scenarios via Base64 encoded URL strings.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the results.

## Design Philosophy

*   **Premium Aesthetics**: Replaces generic emojis with high-quality SVG icons and leverages curated HSL color tokens for a professional, durable feel.
*   **Zero-Noise Data**: Prioritizes scannability by hiding irrelevant zeros and noise, ensuring the user only sees data applicable to their specific scenarios.
*   **Responsive Excellence**: Built with a mobile-first philosophy. UI elements use relative sizing (`clamp`, `min`, `max`) to ensure a seamless experience across all devices.
*   **Stability Over Abstraction**: Uses stable top-level components to ensure that complex state updates (like typing in a spreadsheet) never interrupt the user's flow.
