import { useRef } from 'react';
import { SceneSection } from './sidebar/SceneSection.jsx';
import { useFloatingPanel } from './useFloatingPanel.js';

export function EditorScenePanel({ editor, sceneVersion }) {
  const panelRef = useRef(null);
  const { isCollapsed, setIsCollapsed, offsetX, offsetY, onGripPointerDown } = useFloatingPanel(panelRef, {
    storageKey: 'scene',
    defaultX: 370,
    defaultY: 60,
    defaultCollapsed: false
  });

  return (
    <section className={`scene-panel${isCollapsed ? ' collapsed' : ''}`} ref={panelRef} style={{ left: `${offsetX}px`, top: `${offsetY}px` }}>
      <header className="scene-panel-header">
        <button type="button" className="scene-panel-grip" onPointerDown={onGripPointerDown} title="Drag Scene Panel" aria-label="Drag Scene Panel">
          <span className="e-icons e-menu" aria-hidden="true" />
        </button>
        <h3>Scene</h3>
        <button type="button" className="scene-panel-toggle" onClick={() => setIsCollapsed((v) => !v)} title={isCollapsed ? 'Expand' : 'Collapse'} aria-label={isCollapsed ? 'Expand Scene Panel' : 'Collapse Scene Panel'}>
          <span className={`e-icons ${isCollapsed ? 'e-chevron-down' : 'e-chevron-up'}`} aria-hidden="true" />
        </button>
      </header>

      {!isCollapsed && (
        <div className="scene-panel-body">
          <SceneSection editor={editor} sceneVersion={sceneVersion} />
        </div>
      )}
    </section>
  );
}
