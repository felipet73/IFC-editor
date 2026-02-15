import { useEffect, useRef, useState } from 'react';

function loadPanelState(storageKey, defaults) {
  try {
    const raw = window.localStorage.getItem(`editor-react.panel.${storageKey}`);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      x: Number.isFinite(parsed?.x) ? parsed.x : defaults.x,
      y: Number.isFinite(parsed?.y) ? parsed.y : defaults.y,
      collapsed: typeof parsed?.collapsed === 'boolean' ? parsed.collapsed : defaults.collapsed
    };
  } catch {
    return defaults;
  }
}

export function useFloatingPanel(panelRef, options) {
  const { storageKey, defaultX, defaultY, defaultCollapsed = false } = options;
  const defaults = { x: defaultX, y: defaultY, collapsed: defaultCollapsed };
  const initial = typeof window !== 'undefined' ? loadPanelState(storageKey, defaults) : defaults;

  const dragStateRef = useRef({ active: false, startX: 0, startY: 0, startOffsetX: initial.x, startOffsetY: initial.y });
  const [isCollapsed, setIsCollapsed] = useState(initial.collapsed);
  const [offsetX, setOffsetX] = useState(initial.x);
  const [offsetY, setOffsetY] = useState(initial.y);

  const clampOffsets = (x, y) => {
    const viewport = panelRef.current?.parentElement;
    const panel = panelRef.current;
    if (!viewport || !panel) return { x: 0, y: 0 };
    const maxX = Math.max(0, viewport.clientWidth - panel.offsetWidth - 8);
    const maxY = Math.max(0, viewport.clientHeight - panel.offsetHeight - 8);
    return {
      x: Math.min(maxX, Math.max(0, x)),
      y: Math.min(maxY, Math.max(0, y))
    };
  };

  useEffect(() => {
    const onPointerMove = (event) => {
      const drag = dragStateRef.current;
      if (!drag.active) return;
      const nextX = drag.startOffsetX + (event.clientX - drag.startX);
      const nextY = drag.startOffsetY + (event.clientY - drag.startY);
      const clamped = clampOffsets(nextX, nextY);
      setOffsetX(clamped.x);
      setOffsetY(clamped.y);
    };

    const onPointerUp = () => {
      dragStateRef.current.active = false;
    };

    const onResize = () => {
      const clamped = clampOffsets(offsetX, offsetY);
      setOffsetX(clamped.x);
      setOffsetY(clamped.y);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
    };
  }, [offsetX, offsetY]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `editor-react.panel.${storageKey}`,
      JSON.stringify({ x: offsetX, y: offsetY, collapsed: isCollapsed })
    );
  }, [storageKey, offsetX, offsetY, isCollapsed]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      const clamped = clampOffsets(offsetX, offsetY);
      if (clamped.x !== offsetX) setOffsetX(clamped.x);
      if (clamped.y !== offsetY) setOffsetY(clamped.y);
    });
    return () => window.cancelAnimationFrame(id);
  }, [isCollapsed]);

  const onGripPointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY
    };
  };

  return { isCollapsed, setIsCollapsed, offsetX, offsetY, onGripPointerDown };
}
