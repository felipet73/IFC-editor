import { useRef } from 'react';
import { MaterialSection } from './sidebar/MaterialSection.jsx';
import { useFloatingPanel } from './useFloatingPanel.js';

export function EditorMaterialPanel({ editor, selected }) {
  const panelRef = useRef(null);
  const { isCollapsed, setIsCollapsed, offsetX, offsetY, onGripPointerDown } = useFloatingPanel(panelRef, {
    storageKey: 'material',
    defaultX: 760,
    defaultY: 420,
    defaultCollapsed: true
  });

  return (
    <section className={`material-panel${isCollapsed ? ' collapsed' : ''}`} ref={panelRef} style={{ left: `${offsetX}px`, top: `${offsetY}px` }}>
      <header className="material-panel-header">
        <button type="button" className="material-panel-grip" onPointerDown={onGripPointerDown} title="Drag Material Panel" aria-label="Drag Material Panel">
          <span className="e-icons e-menu" aria-hidden="true" />
        </button>
        <h3>Material</h3>
        <button type="button" className="material-panel-toggle" onClick={() => setIsCollapsed((v) => !v)} title={isCollapsed ? 'Expand' : 'Collapse'} aria-label={isCollapsed ? 'Expand Material Panel' : 'Collapse Material Panel'}>
          <span className={`e-icons ${isCollapsed ? 'e-chevron-down' : 'e-chevron-up'}`} aria-hidden="true" />
        </button>
      </header>

      {!isCollapsed && (
        <div className="material-panel-body">
          <MaterialSection editor={editor} selected={selected} />
        </div>
      )}
    </section>
  );
}
