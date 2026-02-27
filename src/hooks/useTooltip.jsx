import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Shared tooltip positioning hook.
 * Returns mouse handlers + a Portal-based render function
 * so the tooltip DOM lives at document.body (immune to
 * overflow / transform / will-change ancestors).
 *
 * @param {number} width      – tooltip pixel width
 * @param {number} estHeight  – estimated height for flip logic
 * @param {number} margin     – viewport edge margin
 */
export function useTooltip(width = 260, estHeight = 160, margin = 8) {
  const [pos, setPos] = useState(null);
  const rafId = useRef(null);

  // Throttle to one position update per animation frame
  const handleMouseMove = useCallback((e) => {
    if (rafId.current) cancelAnimationFrame(rafId.current);

    // Capture values synchronously from the event
    const clientX = e.clientX;
    const clientY = e.clientY;

    rafId.current = requestAnimationFrame(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Horizontal: offset 12px right of cursor, clamp to viewport
      let x = clientX + 12;
      if (x + width + margin > vw) {
        x = clientX - width - 12; // flip to left of cursor
      }
      x = Math.max(margin, Math.min(x, vw - width - margin));

      // Vertical: prefer below cursor, flip above if not enough room
      const fitsBelow = clientY + 16 + estHeight + margin < vh;
      const y = fitsBelow ? clientY + 16 : clientY - estHeight - 16;

      setPos({ x, y: Math.max(margin, y), above: !fitsBelow });
    });
  }, [width, estHeight, margin]);

  const handleMouseLeave = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    setPos(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  /**
   * Renders tooltip content into a portal at document.body.
   * @param {React.ReactNode} content – the tooltip JSX
   * @param {string} extraClass – additional Tailwind classes
   */
  function renderTooltip(content, extraClass = '') {
    if (!pos) return null;

    return createPortal(
      <div
        role="tooltip"
        style={{
          position: 'fixed',
          top: pos.y,
          left: pos.x,
          width,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
        className={`bg-[#0a0a14] text-white text-xs border-2 border-black shadow-[4px_4px_0_0_#000] ${extraClass}`}
      >
        {content}
      </div>,
      document.body,
    );
  }

  return { pos, handleMouseMove, handleMouseLeave, renderTooltip };
}
