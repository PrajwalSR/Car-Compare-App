// lib/storage.ts
import { ComparisonSession } from './types';

const SESSION_KEY = 'carcompare_session';
const HISTORY_KEY = 'carcompare_history';
const MAX_HISTORY = 5;

export function saveSession(session: ComparisonSession): void {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
        // localStorage might be full or unavailable
    }
}

export function loadSession(): ComparisonSession | null {
    try {
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
    } catch {
        // ignore
    }
}
