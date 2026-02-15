import { useRef } from 'react';
import { GeometrySection } from './sidebar/GeometrySection.jsx';
import { useFloatingPanel } from './useFloatingPanel.js';

export function EditorGeometryPanel({ editor, selected }) {
  const panelRef = useRef(null);
  const { isCollapsed, setIsCollapsed, offsetX, offsetY, onGripPointerDown } = useFloatingPanel(panelRef, {
    storageKey: 'geometry',
    defaultX: 370,
    defaultY: 430,
    defaultCollapsed: false
  });

  return (
    <section className={`geometry-panel${isCollapsed ? ' collapsed' : ''}`} ref={panelRef} style={{ left: `${offsetX}px`, top: `${offsetY}px` }}>
      <header className="geometry-panel-header">
        <button type="button" className="geometry-panel-grip" onPointerDown={onGripPointerDown} title="Drag Geometry Panel" aria-label="Drag Geometry Panel">
          <span className="e-icons e-menu" aria-hidden="true" />
        </button>
        <h3>Geometry</h3>
        <button type="button" className="geometry-panel-toggle" onClick={() => setIsCollapsed((v) => !v)} title={isCollapsed ? 'Expand' : 'Collapse'} aria-label={isCollapsed ? 'Expand Geometry Panel' : 'Collapse Geometry Panel'}>
          <span className={`e-icons ${isCollapsed ? 'e-chevron-down' : 'e-chevron-up'}`} aria-hidden="true" />
        </button>
      </header>

      {!isCollapsed && (
        <div className="geometry-panel-body">
          <GeometrySection editor={editor} selected={selected} />
        </div>
      )}
    </section>
  );
}
