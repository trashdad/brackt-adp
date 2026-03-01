export default function DraftedBadge({ draftedBy, onClick, locked }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      title={locked ? 'LOCKED' : 'Click to UNDRAFT'}
      className={`inline-flex items-center px-2 py-0.5 border border-black/20 bg-gray-200 text-gray-400 font-retro text-[9px] transition-colors ${
        locked ? 'cursor-not-allowed opacity-50' : 'hover:bg-retro-red/20 hover:text-retro-red hover:border-retro-red/40'
      }`}
    >
      TAKEN{draftedBy ? `_BY_${draftedBy.toUpperCase()}` : ''}
    </button>
  );
}
