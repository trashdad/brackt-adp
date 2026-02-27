export default function DraftedBadge({ draftedBy, onClick }) {
  return (
    <button
      onClick={onClick}
      title="Click to UNDRAFT"
      className="inline-flex items-center px-2 py-0.5 border border-black/20 bg-gray-200 text-gray-400 font-retro text-[9px] hover:bg-retro-red/20 hover:text-retro-red hover:border-retro-red/40 transition-colors"
    >
      TAKEN{draftedBy ? `_BY_${draftedBy.toUpperCase()}` : ''}
    </button>
  );
}
