import { useRef } from 'react';
import { ProjectRendererSection } from './sidebar/ProjectRendererSection.jsx';
import { useFloatingPanel } from './useFloatingPanel.js';

export function EditorProjectRendererPanel({ editor }) {
  const panelRef = useRef(null);
  const { isCollapsed, setIsCollapsed, offsetX, offsetY, onGripPointerDown } = useFloatingPanel(panelRef, {
    storageKey: 'project-renderer',
    defaultX: 10,
    defaultY: 430,
    defaultCollapsed: true
  });

  return (
    <section className={`project-renderer-panel${isCollapsed ? ' collapsed' : ''}`} ref={panelRef} style={{ left: `${offsetX}px`, top: `${offsetY}px` }}>
      <header className="project-renderer-panel-header">
        <button type="button" className="project-renderer-panel-grip" onPointerDown={onGripPointerDown} title="Drag Project Renderer Panel" aria-label="Drag Project Renderer Panel">
          <span className="e-icons e-menu" aria-hidden="true" />
        </button>
        <h3>Project / Renderer</h3>
        <button type="button" className="project-renderer-panel-toggle" onClick={() => setIsCollapsed((v) => !v)} title={isCollapsed ? 'Expand' : 'Collapse'} aria-label={isCollapsed ? 'Expand Project Renderer Panel' : 'Collapse Project Renderer Panel'}>
          <span className={`e-icons ${isCollapsed ? 'e-chevron-down' : 'e-chevron-up'}`} aria-hidden="true" />
        </button>
      </header>

      {!isCollapsed && (
        <div className="project-renderer-panel-body">
          <ProjectRendererSection editor={editor} />
        </div>
      )}
    </section>
  );
}
