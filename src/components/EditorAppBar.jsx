import { useEffect, useMemo, useRef, useState } from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';

const TOP_NAV_ITEMS = ['Workspace', 'Projects', 'Assets', 'Collaboration'];

const ONLINE_USERS = [
  { id: 'u1', name: 'Felipe M', color: '#4da3ff' },
  { id: 'u2', name: 'Lucia R', color: '#62d9a8' },
  { id: 'u3', name: 'Ana K', color: '#f0b35c' }
];

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

const SHADING_OPTIONS = [
  { id: 'solid', label: 'SOLID' },
  { id: 'wireframe', label: 'WIREFRAME' },
  { id: 'normals', label: 'NORMALS' },
  { id: 'realistic', label: 'REALISTIC' }
];

export function EditorAppBar({ editor }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cameraVersion, setCameraVersion] = useState(0);
  const [cameraUuid, setCameraUuid] = useState(editor.viewportCamera?.uuid ?? editor.camera.uuid);
  const [shading, setShading] = useState(editor.viewportShading || 'solid');
  const menuRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    const bump = () => setCameraVersion((value) => value + 1);
    const onViewportCameraChanged = () => setCameraUuid(editor.viewportCamera?.uuid ?? editor.camera.uuid);
    const onObjectChanged = (object) => {
      if (object?.isCamera) bump();
    };

    editor.signals.cameraAdded.add(bump);
    editor.signals.cameraRemoved.add(bump);
    editor.signals.cameraResetted.add(bump);
    editor.signals.objectChanged.add(onObjectChanged);
    editor.signals.viewportCameraChanged.add(onViewportCameraChanged);
    if (!editor.viewportShading) {
      editor.setViewportShading('solid');
      setShading('solid');
    }

    return () => {
      editor.signals.cameraAdded.remove(bump);
      editor.signals.cameraRemoved.remove(bump);
      editor.signals.cameraResetted.remove(bump);
      editor.signals.objectChanged.remove(onObjectChanged);
      editor.signals.viewportCameraChanged.remove(onViewportCameraChanged);
    };
  }, [editor]);

  const cameraOptions = useMemo(() => {
    const options = [];
    for (const key in editor.cameras) {
      const camera = editor.cameras[key];
      options.push({ uuid: camera.uuid, label: (camera.name || camera.type || 'CAMERA').toUpperCase() });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [editor, cameraVersion]);

  const applyViewportCamera = (args) => {
    const uuid = String(args.value || '');
    if (!uuid) return;
    setCameraUuid(uuid);
    editor.setViewportCamera(uuid);
  };

  const applyShading = (args) => {
    const value = String(args.value || 'solid');
    setShading(value);
    editor.setViewportShading(value);
  };

  return (
    <header className="editor-appbar">
      <div className="appbar-brand">
        <div className="appbar-logo">3D</div>
        <div className="appbar-brand-copy">
          <strong>Studio</strong>
          <span>Editor Platform</span>
        </div>
      </div>

      <nav className="appbar-nav" aria-label="Global Navigation">
        {TOP_NAV_ITEMS.map((item) => (
          <button key={item} type="button" className="appbar-nav-item">
            {item}
          </button>
        ))}
      </nav>

      <div className="appbar-actions">
        <div className="appbar-viewport-controls">
          <DropDownListComponent
            cssClass="appbar-ddl"
            dataSource={cameraOptions}
            fields={{ text: 'label', value: 'uuid' }}
            value={cameraUuid}
            change={applyViewportCamera}
            width="180px"
          />
          <DropDownListComponent
            cssClass="appbar-ddl"
            dataSource={SHADING_OPTIONS}
            fields={{ text: 'label', value: 'id' }}
            value={shading}
            change={applyShading}
            width="150px"
          />
        </div>

        <label className="appbar-search">
          <span className="e-icons e-search" aria-hidden="true" />
          <input type="search" placeholder="Search commands, assets or users..." />
        </label>

        <button type="button" className="appbar-help">
          <span className="e-icons e-circle-info" aria-hidden="true" />
          Help
        </button>

        <div className="appbar-users" aria-label="Online users">
          {ONLINE_USERS.map((user) => (
            <div
              key={user.id}
              className="appbar-user-chip"
              title={user.name}
              style={{ '--chip-color': user.color }}
            >
              {getInitials(user.name)}
            </div>
          ))}
        </div>

        <div className="appbar-profile" ref={menuRef}>
          <button type="button" className="appbar-avatar-btn" onClick={() => setIsMenuOpen((state) => !state)}>
            <span className="appbar-avatar">FM</span>
            <span className="appbar-avatar-name">Felipe</span>
            <span className="e-icons e-chevron-down" aria-hidden="true" />
          </button>

          {isMenuOpen && (
            <div className="appbar-profile-menu" role="menu">
              <button type="button" role="menuitem">
                Profile
              </button>
              <button type="button" role="menuitem">
                Configurations
              </button>
              <button type="button" role="menuitem">
                Team & Permissions
              </button>
              <button type="button" role="menuitem">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
