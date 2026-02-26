export default function ColumnHeader({ label, sortKey, currentSortKey, sortDir, onSort, className = '' }) {
  const isActive = sortKey === currentSortKey;
  const arrow = isActive ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  return (
    <th
      className={`px-3 py-3 text-left font-retro text-[8px] tracking-tighter cursor-pointer select-none transition-colors border-r border-black/10 last:border-r-0 ${
        isActive ? 'text-snes-lavender bg-black/10' : 'text-gray-100 hover:text-white hover:bg-white/5'
      } ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && <span className="text-[10px] text-snes-purple">{arrow}</span>}
      </div>
    </th>
  );
}
