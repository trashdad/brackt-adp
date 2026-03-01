import { useState } from 'react';
import { useDungeonGate } from '../context/DungeonGateContext';

export default function DungeonGateOverlay() {
  const { resolved, resolveGate, cancelGate } = useDungeonGate();
  const [name, setName] = useState('');

  if (resolved) return null;

  const handleChange = (e) => {
    setName(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 20));
  };

  const handleEnter = () => {
    if (name.trim().length > 0) resolveGate(name);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="snes-panel p-10 bg-gradient-to-br from-[#2D2D44] to-[#1A1A2E] border-2 border-black shadow-[8px_8px_0_0_#000] max-w-sm w-full mx-4 space-y-6">
        <h2 className="font-retro text-[22px] text-retro-cyan text-center tracking-widest drop-shadow-md">
          WHO ARE YOU?
        </h2>
        <input
          type="text"
          value={name}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
          maxLength={20}
          autoFocus
          className="w-full px-4 py-3 bg-black/60 border-2 border-retro-cyan/30 font-mono text-[16px] text-retro-light text-center tracking-wider focus:outline-none focus:border-retro-cyan"
        />
        <div className="flex gap-4">
          <button
            onClick={handleEnter}
            disabled={!name.trim()}
            className="flex-1 font-retro text-[12px] px-5 py-3 bg-gradient-to-br from-retro-purple to-retro-magenta text-white border border-black shadow-[inset_1px_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 transition-all active:translate-y-0.5 disabled:opacity-30 uppercase tracking-widest"
          >
            ENTER
          </button>
          <button
            onClick={cancelGate}
            className="flex-1 font-retro text-[12px] px-5 py-3 bg-white/5 text-retro-red border border-retro-red/30 hover:bg-white/10 transition-all active:translate-y-0.5 uppercase tracking-widest"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
