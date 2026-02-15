import { useRef } from 'react';
import { ProjectToolsSection } from './sidebar/ProjectToolsSection.jsx';
import { useFloatingPanel } from './useFloatingPanel.js';

export function EditorProjectOutputPanel({ editor }) {
  const panelRef = useRef(null);
  const { isCollapsed, setIsCollapsed, offsetX, offsetY, onGripPointerDown } = useFloatingPanel(panelRef, {
    storageKey: 'project-output',
    defaultX: 10,
    defaultY: 150,
    defaultCollapsed: false
  });

  return (
    <section className={`project-output-panel${isCollapsed ? ' collapsed' : ''}`} ref={panelRef} style={{ left: `${offsetX}px`, top: `${offsetY}px` }}>
      <header className="project-output-panel-header">
        <button type="button" className="project-output-panel-grip" onPointerDown={onGripPointerDown} title="Drag Project Output Panel" aria-label="Drag Project Output Panel">
          <span className="e-icons e-menu" aria-hidden="true" />
        </button>
        <h3>Project / Output</h3>
        <button type="button" className="project-output-panel-toggle" onClick={() => setIsCollapsed((v) => !v)} title={isCollapsed ? 'Expand' : 'Collapse'} aria-label={isCollapsed ? 'Expand Project Output Panel' : 'Collapse Project Output Panel'}>
          <span className={`e-icons ${isCollapsed ? 'e-chevron-down' : 'e-chevron-up'}`} aria-hidden="true" />
        </button>
      </header>

      {!isCollapsed && (
        <div className="project-output-panel-body">
          <ProjectToolsSection editor={editor} />
        </div>
      )}
    </section>
  );
}
