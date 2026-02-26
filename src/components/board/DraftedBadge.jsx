export default function DraftedBadge({ draftedBy }) {
  return (
    <span className="inline-flex items-center px-2 py-1 border-2 border-black/20 bg-gray-200 text-gray-400 font-retro text-[7px] shadow-[1px_1px_0_0_rgba(0,0,0,0.1)]">
      TAKEN{draftedBy ? `_BY_${draftedBy.toUpperCase()}` : ''}
    </span>
  );
}
