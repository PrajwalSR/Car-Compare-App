'use client';

interface ExportButtonProps {
    sessionName: string;
}

export default function ExportButton({ sessionName }: ExportButtonProps) {
    function handleExport() {
        // Set print header text before printing
        const header = document.getElementById('print-header-title');
        if (header) {
            const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            header.textContent = `CarCompare — ${sessionName} · Generated ${now}`;
        }
        window.print();
    }

    return (
        <button
            className="btn-secondary export-btn-wrap"
            onClick={handleExport}
            id="export-pdf-btn"
            aria-label="Export to PDF"
        >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
            Export PDF
        </button>
    );
}
