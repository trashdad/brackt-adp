import { useState, useCallback, useEffect, useRef } from 'react';

export default function useDraftBoard(entries) {
  const [draftState, setDraftState] = useState({});
  const initialized = useRef(false);

  // Load shared draft state from server on mount
  useEffect(() => {
    fetch('/api/draft-state')
      .then((r) => r.json())
      .then((data) => {
        setDraftState(data || {});
        initialized.current = true;
      })
      .catch(() => {
        initialized.current = true;
      });
  }, []);

  // Persist to server on every change (skip until initial load is done)
  useEffect(() => {
    if (!initialized.current) return;
    fetch('/api/draft-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftState),
    }).catch(() => {});
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
  const boardEntries = entries.map((e) => ({
    ...e,
    drafted: !!draftState[e.id]?.drafted,
    draftedBy: draftState[e.id]?.draftedBy || null,
  }));

  return { boardEntries, toggleDrafted, setDraftedBy, resetDraft, draftState };
}
