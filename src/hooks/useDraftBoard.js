import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

export default function useDraftBoard(entries) {
  const [draftState, setDraftState] = useState({});
  const initialized = useRef(false);

  const syncDraft = useCallback(async () => {
    try {
      const res = await fetch('/api/draft-state');
      if (!res.ok) throw new Error('Server unreachable');
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        setDraftState(data);
      }
    } catch (err) {
      console.warn('[BRACKT] Draft sync failed:', err.message);
    } finally {
      initialized.current = true;
    }
  }, []);

  // Load shared draft state from server on mount
  useEffect(() => {
    syncDraft();
  }, [syncDraft]);

  // Persist to server on every change (server is the single source of truth)
  useEffect(() => {
    if (!initialized.current) return;
    fetch('/api/draft-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftState),
    }).catch((err) => {
      console.warn('[BRACKT] Draft sync to server failed:', err.message);
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

  // Merge draft state into entries
  const boardEntries = useMemo(() => entries.map((e) => ({
    ...e,
    drafted: !!draftState[e.id]?.drafted,
    draftedBy: draftState[e.id]?.draftedBy || null,
  })), [entries, draftState]);

  return { boardEntries, toggleDrafted, setDraftedBy, resetDraft, syncDraft, draftState };
}
