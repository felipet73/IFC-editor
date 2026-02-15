import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { TabComponent } from '@syncfusion/ej2-react-navigations';
import { EditorOutlinerTree } from './EditorOutlinerTree.jsx';

const STORAGE_KEY = 'editor-react.right-dock';

function clampDockWidth(value) {
  const width = Number.isFinite(value) ? value : 360;
  const max = Math.max(260, Math.floor(window.innerWidth * 0.4));
  return Math.min(max, Math.max(260, Math.round(width)));
}

function readInitial() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { width: 360, collapsed: false, tabIndex: 0 };
    const parsed = JSON.parse(raw);
    return {
      width: Number.isFinite(parsed.width) ? parsed.width : 360,
      collapsed: !!parsed.collapsed,
      tabIndex: Number.isFinite(parsed.tabIndex) ? parsed.tabIndex : 0
    };
  } catch {
    return { width: 360, collapsed: false, tabIndex: 0 };
  }
}

export const EditorRightDock = memo(function EditorRightDock({ editor, sceneGraphVersion }) {
  const initial = useMemo(() => readInitial(), []);
  const [dockWidth, setDockWidth] = useState(() => clampDockWidth(initial.width));
  const [collapsed, setCollapsed] = useState(initial.collapsed);
  const [tabIndex, setTabIndex] = useState(initial.tabIndex);
  const resizeRef = useRef({ active: false, startX: 0, startWidth: 360 });

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        width: dockWidth,
        collapsed,
        tabIndex
      })
    );
  }, [dockWidth, collapsed, tabIndex]);

  useEffect(() => {
    const effective = collapsed ? 28 : dockWidth;
    document.documentElement.style.setProperty('--right-dock-width', `${effective}px`);
    window.dispatchEvent(new CustomEvent('editor-right-dock-width', { detail: effective }));
    return () => {
      document.documentElement.style.removeProperty('--right-dock-width');
    };
  }, [dockWidth, collapsed]);

  useEffect(() => {
    const onResize = () => setDockWidth((prev) => clampDockWidth(prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onPointerMove = (event) => {
      const state = resizeRef.current;
      if (!state.active || collapsed) return;
      const delta = state.startX - event.clientX;
      setDockWidth(clampDockWidth(state.startWidth + delta));
    };

    const onPointerUp = () => {
      resizeRef.current.active = false;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [collapsed]);

  const onResizeGripPointerDown = (event) => {
    if (event.button !== 0 || collapsed) return;
    event.preventDefault();
    resizeRef.current = { active: true, startX: event.clientX, startWidth: dockWidth };
  };

  return (
    <section className="right-dock-overlay">
      <div className={`right-dock-shell${collapsed ? ' collapsed' : ''}`} style={{ width: `${collapsed ? 28 : dockWidth}px` }}>
        {!collapsed && <div className="right-dock-resize-grip" onPointerDown={onResizeGripPointerDown} title="Resize right panel" />}
        <button className="right-dock-collapse-btn" onClick={() => setCollapsed((value) => !value)} title={collapsed ? 'Expand' : 'Collapse'}>
          <span className={`e-icons ${collapsed ? 'e-chevron-left' : 'e-chevron-right'}`} />
        </button>
        {!collapsed && (
          <div className="right-dock-pane-content">
            <TabComponent
              selectedItem={tabIndex}
              selected={(args) => setTabIndex(args.selectedIndex ?? 0)}
              height="100%"
              heightAdjustMode="Fill"
              animation={{
                previous: { effect: 'None', duration: 0, easing: 'linear' },
                next: { effect: 'None', duration: 0, easing: 'linear' }
              }}
              cssClass="right-dock-tabs"
              items={[
                {
                  header: { text: 'Project Explorer' },
                  content: () => (
                    <div className="right-dock-tab-content right-dock-outliner-tab">
                      <div className="right-dock-tree-host">
                        <EditorOutlinerTree editor={editor} sceneGraphVersion={sceneGraphVersion} />
                      </div>
                    </div>
                  )
                },
                {
                  header: { text: 'Video' },
                  content: () => (
                    <div className="right-dock-tab-content">
                      <h4>Video Options</h4>
                      <p>Aqui iran opciones fijas de render/video por tabs.</p>
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}
      </div>
    </section>
  );
});
