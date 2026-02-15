import { useRef } from 'react';
import { ObjectSection } from './sidebar/ObjectSection.jsx';
import { useFloatingPanel } from './useFloatingPanel.js';

export function EditorObjectPanel({ editor, selected }) {
  const panelRef = useRef(null);
  const { isCollapsed, setIsCollapsed, offsetX, offsetY, onGripPointerDown } = useFloatingPanel(panelRef, {
    storageKey: 'object',
    defaultX: 760,
    defaultY: 60,
    defaultCollapsed: false
  });

  return (
    <section className={`object-panel${isCollapsed ? ' collapsed' : ''}`} ref={panelRef} style={{ left: `${offsetX}px`, top: `${offsetY}px` }}>
      <header className="object-panel-header">
        <button type="button" className="object-panel-grip" onPointerDown={onGripPointerDown} title="Drag Object Panel" aria-label="Drag Object Panel">
          <span className="e-icons e-menu" aria-hidden="true" />
        </button>
        <h3>Object</h3>
        <button type="button" className="object-panel-toggle" onClick={() => setIsCollapsed((v) => !v)} title={isCollapsed ? 'Expand' : 'Collapse'} aria-label={isCollapsed ? 'Expand Object Panel' : 'Collapse Object Panel'}>
          <span className={`e-icons ${isCollapsed ? 'e-chevron-down' : 'e-chevron-up'}`} aria-hidden="true" />
        </button>
      </header>

      {!isCollapsed && (
        <div className="object-panel-body">
          <ObjectSection editor={editor} selected={selected} />
        </div>
      )}
    </section>
  );
}
