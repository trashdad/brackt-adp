export default function ColumnHeader({ label, sortKey, currentSortKey, sortDir, onSort, className = '' }) {
  const isActive = sortKey === currentSortKey;
  const arrow = isActive ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  return (
    <th
      className={`px-4 py-4 text-left font-retro text-[7px] tracking-widest cursor-pointer select-none transition-all border-r border-white/5 last:border-r-0 ${
        isActive ? 'text-retro-cyan bg-white/5' : 'text-retro-light/40 hover:text-white hover:bg-white/10'
      } ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        {isActive && <span className="text-[10px] text-retro-cyan drop-shadow-[0_0_4px_rgba(0,245,255,0.5)]">{arrow}</span>}
      </div>
    </th>
  );
}
