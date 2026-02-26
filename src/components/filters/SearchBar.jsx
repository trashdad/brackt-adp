export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full max-w-xs group">
      <input
        type="text"
        placeholder="SEARCH_BY_NAME..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-white border-4 border-black font-retro text-[8px] tracking-tight focus:outline-none focus:ring-4 focus:ring-snes-purple/30 placeholder:text-gray-300"
      />
      <div className="absolute inset-0 border-b-4 border-black/10 pointer-events-none" />
    </div>
  );
}
