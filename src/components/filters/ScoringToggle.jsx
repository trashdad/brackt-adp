export default function ScoringToggle({ showDrafted, onToggle }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={!showDrafted}
        onChange={() => onToggle(!showDrafted)}
        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
      />
      Hide drafted
    </label>
  );
}
