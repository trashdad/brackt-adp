import { useState, useMemo } from 'react';

export default function useSorting(items, defaultKey = 'adpRank', defaultDir = 'asc') {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      let aVal = resolveValue(a, sortKey);
      let bVal = resolveValue(b, sortKey);

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggleSort };
}

function resolveValue(obj, key) {
  // Support dotted keys like 'ev.seasonTotal'
  return key.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}
