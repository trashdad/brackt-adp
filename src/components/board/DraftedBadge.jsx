export default function DraftedBadge({ draftedBy }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 border border-black/20 bg-gray-200 text-gray-400 font-pixel text-[9px]">
      TAKEN{draftedBy ? `_BY_${draftedBy.toUpperCase()}` : ''}
    </span>
  );
}
