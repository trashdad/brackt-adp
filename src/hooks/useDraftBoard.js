import { useState, useCallback, useEffect } from 'react';
import { loadDraftState, saveDraftState } from '../utils/storage';

export default function useDraftBoard(entries) {
  const [draftState, setDraftState] = useState(() => loadDraftState());

  // Persist on every change
  useEffect(() => {
    saveDraftState(draftState);
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
