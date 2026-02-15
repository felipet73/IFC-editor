import { useRef } from 'react';
import { HistorySettingsSection } from './sidebar/HistorySettingsSection.jsx';
import { useFloatingPanel } from './useFloatingPanel.js';

export function EditorHistoryPanel({ editor, historyVersion }) {
  const panelRef = useRef(null);
  const { isCollapsed, setIsCollapsed, offsetX, offsetY, onGripPointerDown } = useFloatingPanel(panelRef, {
    storageKey: 'history',
    defaultX: 1210,
    defaultY: 60,
    defaultCollapsed: true
  });

  return (
    <section className={`history-panel${isCollapsed ? ' collapsed' : ''}`} ref={panelRef} style={{ left: `${offsetX}px`, top: `${offsetY}px` }}>
      <header className="history-panel-header">
        <button type="button" className="history-panel-grip" onPointerDown={onGripPointerDown} title="Drag History Panel" aria-label="Drag History Panel">
          <span className="e-icons e-menu" aria-hidden="true" />
        </button>
        <h3>Settings / History</h3>
        <button type="button" className="history-panel-toggle" onClick={() => setIsCollapsed((v) => !v)} title={isCollapsed ? 'Expand' : 'Collapse'} aria-label={isCollapsed ? 'Expand History Panel' : 'Collapse History Panel'}>
          <span className={`e-icons ${isCollapsed ? 'e-chevron-down' : 'e-chevron-up'}`} aria-hidden="true" />
        </button>
      </header>

      {!isCollapsed && (
        <div className="history-panel-body">
          <HistorySettingsSection editor={editor} historyVersion={historyVersion} />
        </div>
      )}
    </section>
  );
}
