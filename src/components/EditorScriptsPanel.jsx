import { useRef } from 'react';
import { ScriptSection } from './sidebar/ScriptSection.jsx';
import { useFloatingPanel } from './useFloatingPanel.js';

export function EditorScriptsPanel({ editor, selected }) {
  const panelRef = useRef(null);
  const { isCollapsed, setIsCollapsed, offsetX, offsetY, onGripPointerDown } = useFloatingPanel(panelRef, {
    storageKey: 'scripts',
    defaultX: 1210,
    defaultY: 330,
    defaultCollapsed: true
  });

  return (
    <section className={`scripts-panel${isCollapsed ? ' collapsed' : ''}`} ref={panelRef} style={{ left: `${offsetX}px`, top: `${offsetY}px` }}>
      <header className="scripts-panel-header">
        <button type="button" className="scripts-panel-grip" onPointerDown={onGripPointerDown} title="Drag Scripts Panel" aria-label="Drag Scripts Panel">
          <span className="e-icons e-menu" aria-hidden="true" />
        </button>
        <h3>Scripts</h3>
        <button type="button" className="scripts-panel-toggle" onClick={() => setIsCollapsed((v) => !v)} title={isCollapsed ? 'Expand' : 'Collapse'} aria-label={isCollapsed ? 'Expand Scripts Panel' : 'Collapse Scripts Panel'}>
          <span className={`e-icons ${isCollapsed ? 'e-chevron-down' : 'e-chevron-up'}`} aria-hidden="true" />
        </button>
      </header>

      {!isCollapsed && (
        <div className="scripts-panel-body">
          <ScriptSection editor={editor} selected={selected} />
        </div>
      )}
    </section>
  );
}
