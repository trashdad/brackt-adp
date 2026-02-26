export default function ScoringToggle({ showDrafted, onToggle }) {
  return (
    <label className="flex items-center gap-3 font-retro text-[8px] text-gray-700 cursor-pointer select-none group">
      <div className="relative">
        <input
          type="checkbox"
          checked={!showDrafted}
          onChange={() => onToggle(!showDrafted)}
          className="sr-only"
        />
        <div className={`w-6 h-6 border-4 border-black transition-all ${
          !showDrafted ? 'bg-snes-purple' : 'bg-white'
        }`}>
          {!showDrafted && (
            <div className="absolute inset-1.5 bg-white border border-black shadow-[inset_-1px_-1px_0_0_rgba(0,0,0,0.5)]" />
          )}
        </div>
      </div>
      <span className="group-hover:text-snes-blue uppercase tracking-tighter">HIDE_DRAFTED</span>
    </label>
  );
}
