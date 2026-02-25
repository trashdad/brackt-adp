export default function ColumnHeader({ label, sortKey, currentSortKey, sortDir, onSort, className = '' }) {
  const isActive = sortKey === currentSortKey;
  const arrow = isActive ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : '';

  return (
    <th
      className={`px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 ${className}`}
      onClick={() => onSort(sortKey)}
    >
      {label}{arrow}
    </th>
  );
}
