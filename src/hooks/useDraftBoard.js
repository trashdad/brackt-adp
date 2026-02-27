import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { loadLocalDraftState, saveLocalDraftState } from '../utils/storage';

export default function useDraftBoard(entries) {
  const [draftState, setDraftState] = useState(() => loadLocalDraftState());
  const initialized = useRef(false);

  const syncDraft = useCallback(async () => {
    try {
      const res = await fetch('/api/draft-state');
      if (!res.ok) throw new Error('OFFLINE');
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        setDraftState(data);
        saveLocalDraftState(data);
      }
    } catch {
      // Fallback to local
      setDraftState(loadLocalDraftState());
    } finally {
      initialized.current = true;
    }
  }, []);

  // Load shared draft state from server on mount
  useEffect(() => {
    syncDraft();
  }, [syncDraft]);

  // Persist to server AND local on every change
  useEffect(() => {
    if (!initialized.current) return;
    saveLocalDraftState(draftState);

    fetch('/api/draft-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftState),
    }).catch((err) => {
      console.warn('[BRACKT] Draft sync failed, using local storage:', err.message);
    });
  }, [draftState]);

  const toggleDrafted = useCallback((entryId) => {
    setDraftState((prev) => {
      const next = { ...prev };
      if (next[entryId]) {
        delete next[entryId];
      } else {
        next[entryId] = { drafted: true, draftedBy: null };
      }
      return next;
    });
  }, []);

  const setDraftedBy = useCallback((entryId, draftedBy) => {
    setDraftState((prev) => ({
      ...prev,
      [entryId]: { drafted: true, draftedBy },
    }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraftState({});
  }, []);

  // Merge draft state into entries (memoized to avoid re-creating on every render)
  const boardEntries = useMemo(() => entries.map((e) => ({
    ...e,
    drafted: !!draftState[e.id]?.drafted,
    draftedBy: draftState[e.id]?.draftedBy || null,
  })), [entries, draftState]);

  return { boardEntries, toggleDrafted, setDraftedBy, resetDraft, syncDraft, draftState };
}
