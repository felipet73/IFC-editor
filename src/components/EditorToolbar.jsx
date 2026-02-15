import { useEffect, useMemo, useRef, useState } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { ToolbarComponent } from '@syncfusion/ej2-react-navigations';

const SNAP_STEPS = [0.5, 1, 2, 5, 10];

export function EditorToolbar({ editor }) {
  const dockRef = useRef(null);
  const panelRef = useRef(null);
  const dragStateRef = useRef({ active: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [mode, setMode] = useState('translate');
  const [space, setSpace] = useState('world');
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [snapValue, setSnapValue] = useState(1);

  useEffect(() => {
    const onMode = (value) => setMode(value || 'translate');
    const onSpace = (value) => setSpace(value || 'world');
    const onSnap = (value) => {
      if (value === null || value === undefined) {
        setSnapEnabled(false);
        return;
      }
      setSnapEnabled(true);
      setSnapValue(Number(value) || 1);
    };

    editor.signals.transformModeChanged.add(onMode);
    editor.signals.spaceChanged.add(onSpace);
    editor.signals.snapChanged.add(onSnap);

    return () => {
      editor.signals.transformModeChanged.remove(onMode);
      editor.signals.spaceChanged.remove(onSpace);
      editor.signals.snapChanged.remove(onSnap);
    };
  }, [editor]);

  useEffect(() => {
    const clampOffsetX = (value) => {
      if (!dockRef.current || !panelRef.current) return 0;
      const maxOffset = Math.max(0, dockRef.current.clientWidth - panelRef.current.offsetWidth);
      return Math.min(maxOffset, Math.max(0, value));
    };
    const clampOffsetY = (value) => {
      if (!dockRef.current || !panelRef.current) return 0;
      const maxOffset = Math.max(0, dockRef.current.clientHeight - panelRef.current.offsetHeight);
      return Math.min(maxOffset, Math.max(0, value));
    };

    const onPointerMove = (event) => {
      const drag = dragStateRef.current;
      if (!drag.active) return;
      const nextX = drag.startOffsetX + (event.clientX - drag.startX);
      const nextY = drag.startOffsetY + (event.clientY - drag.startY);
      setOffsetX(clampOffsetX(nextX));
      setOffsetY(clampOffsetY(nextY));
    };

    const onPointerUp = () => {
      dragStateRef.current.active = false;
    };

    const onResize = () => {
      setOffsetX((current) => clampOffsetX(current));
      setOffsetY((current) => clampOffsetY(current));
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (!dockRef.current || !panelRef.current) return;
    const maxOffsetX = Math.max(0, dockRef.current.clientWidth - panelRef.current.offsetWidth);
    const maxOffsetY = Math.max(0, dockRef.current.clientHeight - panelRef.current.offsetHeight);
    setOffsetX((current) => Math.min(current, maxOffsetX));
    setOffsetY((current) => Math.min(current, maxOffsetY));
  }, [isCollapsed]);

  const onDragGripPointerDown = (event) => {
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

  const applyMode = (value) => {
    setMode(value);
    editor.signals.transformModeChanged.dispatch(value);
  };

  const toggleLocal = () => {
    const next = space === 'local' ? 'world' : 'local';
    setSpace(next);
    editor.signals.spaceChanged.dispatch(next);
  };

  const toggleSnap = () => {
    const next = !snapEnabled;
    setSnapEnabled(next);
    editor.signals.snapChanged.dispatch(next ? Number(snapValue) : null);
  };

  const cycleSnapValue = () => {
    const index = SNAP_STEPS.indexOf(Number(snapValue));
    const next = SNAP_STEPS[(index + 1) % SNAP_STEPS.length];
    setSnapValue(next);
    if (snapEnabled) {
      editor.signals.snapChanged.dispatch(next);
    }
  };

  const items = useMemo(
    () => [
      {
        id: 'translate',
        prefixIcon: 'e-icons e-transform-right',
        tooltipText: 'Translate (W)',
        cssClass: mode === 'translate' ? 'toolbar-item-active' : ''
      },
      {
        id: 'rotate',
        prefixIcon: 'e-icons e-repeat',
        tooltipText: 'Rotate (E)',
        cssClass: mode === 'rotate' ? 'toolbar-item-active' : ''
      },
      {
        id: 'scale',
        prefixIcon: 'e-icons e-resize',
        tooltipText: 'Scale (R)',
        cssClass: mode === 'scale' ? 'toolbar-item-active' : ''
      },
      { type: 'Separator' },
      {
        id: 'local',
        text: 'Local',
        prefixIcon: 'e-icons e-locate',
        tooltipText: 'Toggle Local / World',
        cssClass: space === 'local' ? 'toolbar-item-active' : ''
      },
      {
        id: 'snap',
        text: 'Snap',
        prefixIcon: 'e-icons e-checkbox-check',
        tooltipText: 'Toggle Snap',
        cssClass: snapEnabled ? 'toolbar-item-active' : ''
      },
      {
        id: 'snap-step',
        text: `Step ${snapValue}`,
        prefixIcon: 'e-icons e-select',
        tooltipText: 'Cycle Snap Step'
      },
      { type: 'Separator' },
      {
        id: 'collapse',
        text: 'Collapse',
        prefixIcon: 'e-icons e-chevron-up',
        tooltipText: 'Collapse Toolbar'
      }
    ],
    [mode, snapEnabled, snapValue, space]
  );

  const handleToolbarClick = (args) => {
    const id = args.item?.id;
    if (!id) return;

    if (id === 'translate' || id === 'rotate' || id === 'scale') {
      applyMode(id);
      return;
    }
    if (id === 'local') {
      toggleLocal();
      return;
    }
    if (id === 'snap') {
      toggleSnap();
      return;
    }
    if (id === 'snap-step') {
      cycleSnapValue();
      return;
    }
    if (id === 'collapse') {
      setIsCollapsed(true);
    }
  };

  return (
    <div className="editor-toolbar-dock" ref={dockRef}>
      <div className="editor-toolbar-panel" ref={panelRef} style={{ left: `${offsetX}px`, top: `${offsetY}px` }}>
        <button
          type="button"
          className="toolbar-drag-grip"
          onPointerDown={onDragGripPointerDown}
          title="Drag toolbar"
          aria-label="Drag toolbar"
        >
          <span className="e-icons e-menu" aria-hidden="true" />
        </button>
        {isCollapsed ? (
          <div className="editor-toolbar-collapsed">
            <ButtonComponent
              cssClass="toolbar-float-btn"
              iconCss="e-icons e-chevron-down"
              content="Tools"
              isPrimary={true}
              onClick={() => setIsCollapsed(false)}
            />
          </div>
        ) : (
          <ToolbarComponent
            cssClass="editor-toolbar-control"
            items={items}
            clicked={handleToolbarClick}
            overflowMode="Scrollable"
          />
        )}
      </div>
    </div>
  );
}
