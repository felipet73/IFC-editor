import { useRef } from 'react';
import { EditorOutlinerTree } from './EditorOutlinerTree.jsx';
import { useFloatingPanel } from './useFloatingPanel.js';

export function EditorOutlinerPanel({ editor, selected, sceneVersion }) {
  const panelRef = useRef(null);
  const { isCollapsed, setIsCollapsed, offsetX, offsetY, onGripPointerDown } = useFloatingPanel(panelRef, {
    storageKey: 'outliner',
    defaultX: 10,
    defaultY: 60,
    defaultCollapsed: false
  });

  return (
    <section className={`outliner-panel${isCollapsed ? ' collapsed' : ''}`} ref={panelRef} style={{ left: `${offsetX}px`, top: `${offsetY}px` }}>
      <header className="outliner-panel-header">
        <button type="button" className="outliner-panel-grip" onPointerDown={onGripPointerDown} title="Drag Outliner" aria-label="Drag Outliner">
          <span className="e-icons e-menu" aria-hidden="true" />
        </button>
        <h3>Outliner</h3>
        <button type="button" className="outliner-panel-toggle" onClick={() => setIsCollapsed((v) => !v)} title={isCollapsed ? 'Expand' : 'Collapse'} aria-label={isCollapsed ? 'Expand Outliner' : 'Collapse Outliner'}>
          <span className={`e-icons ${isCollapsed ? 'e-chevron-down' : 'e-chevron-up'}`} aria-hidden="true" />
        </button>
      </header>

      {!isCollapsed && (
        <div className="outliner-panel-body">
          <EditorOutlinerTree editor={editor} sceneGraphVersion={sceneVersion} />
        </div>
      )}
    </section>
  );
}
