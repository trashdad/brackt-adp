import { useState, useCallback, useEffect, useRef } from 'react';
import { loadLocalDraftState, saveLocalDraftState } from '../utils/storage';

export default function useDraftBoard(entries) {
  const [draftState, setDraftState] = useState(() => loadLocalDraftState());
  const initialized = useRef(false);

  // Load shared draft state from server on mount
  useEffect(() => {
    fetch('/api/draft-state')
      .then((r) => {
        if (!r.ok) throw new Error('OFFLINE');
        return r.json();
      })
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setDraftState(data);
          saveLocalDraftState(data);
        }
        initialized.current = true;
      })
      .catch(() => {
        // Fallback already loaded in useState initializer
        initialized.current = true;
      });
  }, []);

  // Persist to server AND local on every change
  useEffect(() => {
    if (!initialized.current) return;
    saveLocalDraftState(draftState);
    
    fetch('/api/draft-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftState),
    }).catch(() => {
      // Server offline - local storage handles it
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
  const boardEntries = entries.map((e) => ({
    ...e,
    drafted: !!draftState[e.id]?.drafted,
    draftedBy: draftState[e.id]?.draftedBy || null,
  }));

  return { boardEntries, toggleDrafted, setDraftedBy, resetDraft, draftState };
}
