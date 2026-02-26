export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full max-w-xs group">
      <input
        type="text"
        placeholder="SEARCH_BY_NAME..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-black/40 border-2 border-black font-mono text-[12px] tracking-tight focus:outline-none focus:ring-2 focus:ring-retro-cyan/30 placeholder:text-gray-600 text-white uppercase"
      />
      <div className="absolute inset-0 border-b-2 border-white/5 pointer-events-none" />
    </div>
  );
}
