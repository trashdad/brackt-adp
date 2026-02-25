export default function SearchBar({ value, onChange }) {
  return (
    <input
      type="text"
      placeholder="Search by name..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-xs px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
    />
  );
}
