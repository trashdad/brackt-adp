export default function ScoringToggle({ showDrafted, onToggle }) {
  return (
    <label className="flex items-center gap-4 font-retro text-[12px] text-retro-light/60 cursor-pointer select-none group">
      <div className="relative">
        <input
          type="checkbox"
          checked={!showDrafted}
          onChange={() => onToggle(!showDrafted)}
          className="sr-only"
        />
        <div className={`w-6 h-6 border-2 border-black transition-all ${
          !showDrafted ? 'bg-retro-purple shadow-[0_0_10px_rgba(157,80,187,0.4)]' : 'bg-black/40'
        }`}>
          {!showDrafted && (
            <div className="absolute inset-1.5 bg-white border border-black shadow-[inset_-1px_-1px_0_0_rgba(0,0,0,0.5)]" />
          )}
        </div>
      </div>
      <span className="group-hover:text-retro-cyan uppercase tracking-widest transition-colors">HIDE_DRAFTED</span>
    </label>
  );
}
