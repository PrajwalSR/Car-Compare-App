// lib/storage.ts
import { ComparisonSession } from './types';

const SESSION_KEY = 'carcompare_session';
const HISTORY_KEY = 'carcompare_history';
const VERSION_KEY = 'carcompare_schema_version';
const MAX_HISTORY = 5;

// Bump this whenever the default session shape changes significantly so that
// stale localStorage data is discarded and the new defaults take effect.
const SCHEMA_VERSION = '4';

function isCurrentVersion(): boolean {
    return localStorage.getItem(VERSION_KEY) === SCHEMA_VERSION;
}

function stampVersion(): void {
    localStorage.setItem(VERSION_KEY, SCHEMA_VERSION);
}

export function saveSession(session: ComparisonSession): void {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        stampVersion();
    } catch {
        // localStorage might be full or unavailable
    }
}

export function loadSession(): ComparisonSession | null {
    try {
        // If the stored data is from an older schema, discard it so the app
        // starts fresh with the current DEFAULT_CARS / DEFAULT_GLOBAL_INPUTS.
        if (!isCurrentVersion()) {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(HISTORY_KEY);
            stampVersion();
            return null;
        }
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as ComparisonSession;
    } catch {
        return null;
    }
}

export function saveToHistory(session: ComparisonSession): void {
    try {
        const history = loadHistory();
        const filtered = history.filter((s) => s.id !== session.id);
        const updated = [session, ...filtered].slice(0, MAX_HISTORY);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
        // ignore
    }
}

export function loadHistory(): ComparisonSession[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as ComparisonSession[];
    } catch {
        return [];
    }
}

export function deleteFromHistory(id: string): void {
    try {
        const history = loadHistory().filter((s) => s.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
        // ignore
    }
}

export function clearAll(): void {
    try {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(HISTORY_KEY);
        localStorage.removeItem(VERSION_KEY);
    } catch {
        // ignore
    }
}
