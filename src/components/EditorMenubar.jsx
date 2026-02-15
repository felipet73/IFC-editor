import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RibbonComponent } from '@syncfusion/ej2-react-ribbon';
import { RibbonItemSize, RibbonItemType, RibbonLayout } from '@syncfusion/ej2-ribbon';
import { AddObjectCommand } from '../editor/legacy/core/commands/AddObjectCommand.js';
import { RemoveObjectCommand } from '../editor/legacy/core/commands/RemoveObjectCommand.js';
import { SetPositionCommand } from '../editor/legacy/core/commands/SetPositionCommand.js';

function createMesh(kind) {
  const material = new THREE.MeshStandardMaterial({ color: 0x66aaff });

  if (kind === 'box') return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  if (kind === 'capsule') return new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 6, 12), material);
  if (kind === 'circle') return new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), material);
  if (kind === 'cylinder') return new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.25, 24), material);
  if (kind === 'dodecahedron') return new THREE.Mesh(new THREE.DodecahedronGeometry(0.7), material);
  if (kind === 'icosahedron') return new THREE.Mesh(new THREE.IcosahedronGeometry(0.75), material);
  if (kind === 'lathe') {
    const points = [new THREE.Vector2(0.0, -0.8), new THREE.Vector2(0.35, -0.2), new THREE.Vector2(0.2, 0.4), new THREE.Vector2(0.45, 0.9)];
    return new THREE.Mesh(new THREE.LatheGeometry(points, 24), material);
  }
  if (kind === 'octahedron') return new THREE.Mesh(new THREE.OctahedronGeometry(0.75), material);
  if (kind === 'plane') {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshStandardMaterial({ color: 0x778899, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }
  if (kind === 'ring') return new THREE.Mesh(new THREE.RingGeometry(0.35, 0.8, 32), material);
  if (kind === 'sphere') return new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 16), material);
  if (kind === 'sprite') return new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x66aaff }));
  if (kind === 'tetrahedron') return new THREE.Mesh(new THREE.TetrahedronGeometry(0.8), material);
  if (kind === 'torus') return new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.22, 18, 36), material);
  if (kind === 'torusknot') return new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.18, 96, 16), material);
  if (kind === 'tube') {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(-0.2, 0.8, 0.2),
      new THREE.Vector3(0.7, -0.4, -0.1),
      new THREE.Vector3(1.2, 0.3, 0.1)
    ]);
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.15, 12, false), material);
  }

  return null;
}

function createLight(kind) {
  if (kind === 'ambient') return new THREE.AmbientLight(0xffffff, 0.6);

  if (kind === 'directional') {
    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(5, 6, 3);
    return light;
  }

  if (kind === 'hemisphere') return new THREE.HemisphereLight(0xffffff, 0x404040, 1.1);

  if (kind === 'point') {
    const light = new THREE.PointLight(0xffffff, 1.2, 20);
    light.position.set(2, 2, 2);
    return light;
  }

  if (kind === 'spot') {
    const light = new THREE.SpotLight(0xffffff, 1.5, 25, Math.PI / 6, 0.25, 2);
    light.position.set(3, 5, 2);
    return light;
  }

  return null;
}

function createCamera(kind, editor) {
  const width = editor.runtime?.renderer?.domElement?.clientWidth ?? 1280;
  const height = Math.max(1, editor.runtime?.renderer?.domElement?.clientHeight ?? 720);
  const aspect = width / height;

  if (kind === 'perspective') {
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    camera.position.set(3, 2, 4);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  if (kind === 'orthographic') {
    const size = 3;
    const camera = new THREE.OrthographicCamera(-size * aspect, size * aspect, size, -size, 0.1, 1000);
    camera.position.set(3, 2, 4);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  return null;
}

function buildDropDownItems(values) {
  return values.map((value) => ({ id: value.id, text: value.text, iconCss: value.iconCss || '' }));
}

export function EditorMenubar({ editor, selected, historyVersion, savingStatus }) {
  const _historyVersion = historyVersion;
  const ribbonRef = useRef(null);
  const openInputRef = useRef(null);
  const importInputRef = useRef(null);
  const selectedRef = useRef(selected);
  const exportFormatRef = useRef('glb');
  const meshTypeRef = useRef('box');
  const lightTypeRef = useRef('ambient');
  const cameraTypeRef = useRef('perspective');
  const viewStatesRef = useRef({
    gridHelper: true,
    cameraHelpers: true,
    lightHelpers: true,
    skeletonHelpers: true
  });
  const viewStates = viewStatesRef.current;
  const syncRibbonVisualState = () => {
    const ribbon = ribbonRef.current;
    if (!ribbon) return;

    const canDelete = !!selectedRef.current && !!selectedRef.current.parent;
    const canUndo = editor.history.undos.length > 0;
    const canRedo = editor.history.redos.length > 0;

    if (canUndo) ribbon.enableItem('edit-undo');
    else ribbon.disableItem('edit-undo');

    if (canRedo) ribbon.enableItem('edit-redo');
    else ribbon.disableItem('edit-redo');

    if (canDelete) {
      ribbon.enableItem('edit-center');
      ribbon.enableItem('edit-clone');
      ribbon.enableItem('edit-delete');
    } else {
      ribbon.disableItem('edit-center');
      ribbon.disableItem('edit-clone');
      ribbon.disableItem('edit-delete');
    }

    ribbon.updateItem({
      id: 'view-grid',
      buttonSettings: { content: `Grid ${viewStatesRef.current.gridHelper ? 'ON' : 'OFF'}` }
    });
    ribbon.updateItem({
      id: 'view-camera-helpers',
      buttonSettings: { content: `Camera ${viewStatesRef.current.cameraHelpers ? 'ON' : 'OFF'}` }
    });
    ribbon.updateItem({
      id: 'view-light-helpers',
      buttonSettings: { content: `Light ${viewStatesRef.current.lightHelpers ? 'ON' : 'OFF'}` }
    });
    ribbon.updateItem({
      id: 'view-skeleton-helpers',
      buttonSettings: { content: `Skeleton ${viewStatesRef.current.skeletonHelpers ? 'ON' : 'OFF'}` }
    });
  };

  useEffect(() => {
    selectedRef.current = selected;
    syncRibbonVisualState();
  }, [selected]);

  useEffect(() => {
    editor.signals.showHelpersChanged.dispatch(viewStatesRef.current);
  }, [editor]);

  useEffect(() => {
    const onHelperAdded = () => editor.signals.showHelpersChanged.dispatch(viewStatesRef.current);
    editor.signals.helperAdded.add(onHelperAdded);

    return () => {
      editor.signals.helperAdded.remove(onHelperAdded);
    };
  }, [editor]);

  useEffect(() => {
    syncRibbonVisualState();
  }, [historyVersion]);

  useEffect(() => {
    const id = window.setTimeout(() => syncRibbonVisualState(), 0);
    return () => window.clearTimeout(id);
  }, []);

  const loadNewTemplate = async (templateName) => {
    if (!window.confirm('Clear current project?')) return;

    if (templateName === 'empty') {
      editor.clear();
      return;
    }

    try {
      const response = await fetch(`/new-templates/${templateName}.app.json`);
      if (!response.ok) throw new Error(`Template ${templateName} not found.`);

      const json = await response.json();
      editor.clear();
      await editor.fromJSON(json);
    } catch (error) {
      console.error(error);
      window.alert(`Could not load template: ${templateName}`);
    }
  };

  const handleSave = () => {
    const json = editor.toJSON();
    editor.utils.saveString(JSON.stringify(json, null, 2), 'project.json');
  };

  const handleOpenClick = () => {
    openInputRef.current?.click();
  };

  const handleOpenFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      editor.clear();
      await editor.fromJSON(data);
    } catch (error) {
      console.error(error);
      window.alert('Could not open JSON project file.');
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFiles = async (event) => {
    const files = event.target.files;
    event.target.value = '';
    if (!files || files.length === 0) return;
    await editor.loader.loadFiles(files);
  };

  const handleExport = async () => {
    await editor.exporter.exportByFormat(exportFormatRef.current);
  };

  const handleClone = () => {
    const selectedObject = selectedRef.current;
    if (!selectedObject || !selectedObject.parent) return;
    const object = selectedObject.clone(true);
    object.position.x += 1;
    object.name = selectedObject.name ? `${selectedObject.name}_copy` : 'Object_copy';
    editor.execute(new AddObjectCommand(editor, object));
  };

  const handleDelete = () => {
    const selectedObject = selectedRef.current;
    if (!selectedObject || !selectedObject.parent) return;
    editor.execute(new RemoveObjectCommand(editor, selectedObject));
  };

  const handleCenter = () => {
    const selectedObject = selectedRef.current;
    if (!selectedObject || !selectedObject.parent) return;

    const aabb = new THREE.Box3().setFromObject(selectedObject);
    const center = aabb.getCenter(new THREE.Vector3());
    const newPosition = new THREE.Vector3(
      selectedObject.position.x - center.x,
      selectedObject.position.y - center.y,
      selectedObject.position.z - center.z
    );

    editor.execute(new SetPositionCommand(editor, selectedObject, newPosition));
  };

  const handleAddGroup = () => {
    const group = new THREE.Group();
    group.name = 'Group';
    editor.execute(new AddObjectCommand(editor, group));
  };

  const handleAddSceneMeta = () => {
    editor.createSceneDocumentMeta?.();
  };

  const handleAddMesh = () => {
    const object = createMesh(meshTypeRef.current);
    if (!object) return;

    object.name = meshTypeRef.current[0].toUpperCase() + meshTypeRef.current.slice(1);
    if (meshTypeRef.current !== 'plane') object.position.y = 0.5;
    editor.execute(new AddObjectCommand(editor, object));
  };

  const handleAddLight = () => {
    const light = createLight(lightTypeRef.current);
    if (!light) return;

    light.name = `${lightTypeRef.current[0].toUpperCase()}${lightTypeRef.current.slice(1)}Light`;
    editor.execute(new AddObjectCommand(editor, light));
  };

  const handleAddCamera = () => {
    const camera = createCamera(cameraTypeRef.current, editor);
    if (!camera) return;

    camera.name = `${cameraTypeRef.current[0].toUpperCase()}${cameraTypeRef.current.slice(1)}Camera`;
    editor.execute(new AddObjectCommand(editor, camera));
  };

  const toggleViewState = (key) => {
    viewStatesRef.current = { ...viewStatesRef.current, [key]: !viewStatesRef.current[key] };
    editor.signals.showHelpersChanged.dispatch(viewStatesRef.current);
    syncRibbonVisualState();
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const tabs = useMemo(() => {
    const newTemplateItems = buildDropDownItems([
      { id: 'empty', text: 'Empty', iconCss: 'e-icons e-circle-add' },
      { id: 'arkanoid', text: 'Arkanoid', iconCss: 'e-icons e-shapes' },
      { id: 'camera', text: 'Camera', iconCss: 'e-icons e-display' },
      { id: 'particles', text: 'Particles', iconCss: 'e-icons e-group-icon' },
      { id: 'pong', text: 'Pong', iconCss: 'e-icons e-shapes' },
      { id: 'shaders', text: 'Shaders', iconCss: 'e-icons e-style' }
    ]);

    const exportFormatItems = buildDropDownItems([
      { id: 'drc', text: 'DRC (selected mesh)', iconCss: 'e-icons e-export' },
      { id: 'glb', text: 'GLB', iconCss: 'e-icons e-export' },
      { id: 'gltf', text: 'GLTF', iconCss: 'e-icons e-export' },
      { id: 'obj', text: 'OBJ (selected)', iconCss: 'e-icons e-export' },
      { id: 'stl', text: 'STL', iconCss: 'e-icons e-export' },
      { id: 'stl-binary', text: 'STL Binary', iconCss: 'e-icons e-export' },
      { id: 'ply', text: 'PLY', iconCss: 'e-icons e-export' },
      { id: 'ply-binary', text: 'PLY Binary', iconCss: 'e-icons e-export' },
      { id: 'usdz', text: 'USDZ', iconCss: 'e-icons e-export' }
    ]);

    return [
      {
        id: 'tab-file',
        header: 'File',
        groups: [
          {
            id: 'group-file-new',
            header: 'New',
            collections: [
              {
                items: [
                  {
                    type: RibbonItemType.DropDown,
                    allowedSizes: RibbonItemSize.Medium,
                    dropDownSettings: {
                      content: 'Template',
                      iconCss: 'e-icons e-circle-add',
                      items: newTemplateItems,
                      select: (args) => loadNewTemplate(args.item.id)
                    }
                  }
                ]
              }
            ]
          },
          {
            id: 'group-file-io',
            header: 'Project',
            collections: [
              {
                items: [
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Open JSON', iconCss: 'e-icons e-folder-open', clicked: handleOpenClick }
                  },
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Save JSON', iconCss: 'e-icons e-save', clicked: handleSave }
                  },
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Import', iconCss: 'e-icons e-upload-1', clicked: handleImportClick }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'tab-edit',
        header: 'Edit',
        groups: [
          {
            id: 'group-edit-history',
            header: 'History',
            collections: [
              {
                items: [
                  {
                    id: 'edit-undo',
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Undo', iconCss: 'e-icons e-undo', clicked: () => editor.undo() }
                  },
                  {
                    id: 'edit-redo',
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Redo', iconCss: 'e-icons e-redo', clicked: () => editor.redo() }
                  }
                ]
              }
            ]
          },
          {
            id: 'group-edit-object',
            header: 'Object',
            collections: [
              {
                items: [
                  {
                    id: 'edit-center',
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Center', iconCss: 'e-icons e-align-middle', clicked: handleCenter }
                  },
                  {
                    id: 'edit-clone',
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Clone', iconCss: 'e-icons e-copy', clicked: handleClone }
                  },
                  {
                    id: 'edit-delete',
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Delete', iconCss: 'e-icons e-trash', clicked: handleDelete }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'tab-add',
        header: 'Add',
        groups: [
          {
            id: 'group-add-group',
            header: 'Group',
            collections: [
              {
                items: [
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Add Scene', iconCss: 'e-icons e-circle-add', clicked: handleAddSceneMeta }
                  },
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Add Group', iconCss: 'e-icons e-group-2', clicked: handleAddGroup }
                  }
                ]
              }
            ]
          },
          {
            id: 'group-add-mesh',
            header: 'Mesh',
            collections: [
              {
                items: [
                  {
                    type: RibbonItemType.ComboBox,
                    comboBoxSettings: {
                      width: '160px',
                      value: meshTypeRef.current,
                      fields: { text: 'text', value: 'id' },
                      dataSource: [
                        { id: 'box', text: 'Box' },
                        { id: 'capsule', text: 'Capsule' },
                        { id: 'circle', text: 'Circle' },
                        { id: 'cylinder', text: 'Cylinder' },
                        { id: 'dodecahedron', text: 'Dodecahedron' },
                        { id: 'icosahedron', text: 'Icosahedron' },
                        { id: 'lathe', text: 'Lathe' },
                        { id: 'octahedron', text: 'Octahedron' },
                        { id: 'plane', text: 'Plane' },
                        { id: 'ring', text: 'Ring' },
                        { id: 'sphere', text: 'Sphere' },
                        { id: 'sprite', text: 'Sprite' },
                        { id: 'tetrahedron', text: 'Tetrahedron' },
                        { id: 'torus', text: 'Torus' },
                        { id: 'torusknot', text: 'TorusKnot' },
                        { id: 'tube', text: 'Tube' }
                      ],
                      change: (args) => {
                        meshTypeRef.current = String(args.value || 'box');
                      }
                    }
                  },
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Add Mesh', iconCss: 'e-icons e-shapes', clicked: handleAddMesh }
                  }
                ]
              }
            ]
          },
          {
            id: 'group-add-light-camera',
            header: 'Light / Camera',
            collections: [
              {
                items: [
                  {
                    type: RibbonItemType.ComboBox,
                    comboBoxSettings: {
                      width: '150px',
                      value: lightTypeRef.current,
                      fields: { text: 'text', value: 'id' },
                      dataSource: [
                        { id: 'ambient', text: 'Ambient' },
                        { id: 'directional', text: 'Directional' },
                        { id: 'hemisphere', text: 'Hemisphere' },
                        { id: 'point', text: 'Point' },
                        { id: 'spot', text: 'Spot' }
                      ],
                      change: (args) => {
                        lightTypeRef.current = String(args.value || 'ambient');
                      }
                    }
                  },
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Add Light', iconCss: 'e-icons e-circle-add', clicked: handleAddLight }
                  },
                  {
                    type: RibbonItemType.ComboBox,
                    comboBoxSettings: {
                      width: '150px',
                      value: cameraTypeRef.current,
                      fields: { text: 'text', value: 'id' },
                      dataSource: [
                        { id: 'orthographic', text: 'Orthographic' },
                        { id: 'perspective', text: 'Perspective' }
                      ],
                      change: (args) => {
                        cameraTypeRef.current = String(args.value || 'perspective');
                      }
                    }
                  },
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Add Camera', iconCss: 'e-icons e-display', clicked: handleAddCamera }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'tab-export',
        header: 'Export',
        groups: [
          {
            id: 'group-export-format',
            header: 'Formats',
            collections: [
              {
                items: [
                  {
                    type: RibbonItemType.DropDown,
                    allowedSizes: RibbonItemSize.Medium,
                    dropDownSettings: {
                      content: 'Format',
                      iconCss: 'e-icons e-export',
                      items: exportFormatItems,
                      select: (args) => {
                        exportFormatRef.current = args.item.id;
                      }
                    }
                  },
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Export', iconCss: 'e-icons e-download', clicked: handleExport }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'tab-view',
        header: 'View',
        groups: [
          {
            id: 'group-view-helpers',
            header: 'Helpers',
            collections: [
              {
                items: [
                  {
                    id: 'view-grid',
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Grid ON', iconCss: 'e-icons e-group-2', clicked: () => toggleViewState('gridHelper') }
                  },
                  {
                    id: 'view-camera-helpers',
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Camera ON', iconCss: 'e-icons e-display', clicked: () => toggleViewState('cameraHelpers') }
                  },
                  {
                    id: 'view-light-helpers',
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Light ON', iconCss: 'e-icons e-circle-add', clicked: () => toggleViewState('lightHelpers') }
                  },
                  {
                    id: 'view-skeleton-helpers',
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Skeleton ON', iconCss: 'e-icons e-list-unordered', clicked: () => toggleViewState('skeletonHelpers') }
                  },
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Fullscreen', iconCss: 'e-icons e-full-screen', clicked: toggleFullscreen }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'tab-help',
        header: 'Help',
        groups: [
          {
            id: 'group-help-links',
            header: 'Links',
            collections: [
              {
                items: [
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Source', iconCss: 'e-icons e-open-link', clicked: () => window.open('https://github.com/mrdoob/three.js/tree/master/editor', '_blank') }
                  },
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'About', iconCss: 'e-icons e-description', clicked: () => window.open('https://threejs.org', '_blank') }
                  },
                  {
                    type: RibbonItemType.Button,
                    buttonSettings: { content: 'Manual', iconCss: 'e-icons e-description', clicked: () => window.open('https://github.com/mrdoob/three.js/wiki/Editor-Manual', '_blank') }
                  }
                ]
              }
            ]
          }
        ]
      }
    ];
  }, [editor]);

  return (
    <header className="editor-ribbon" data-history={_historyVersion}>
      <RibbonComponent
        ref={ribbonRef}
        tabs={tabs}
        activeLayout={RibbonLayout.Simplified}
        cssClass="editor-ribbon-control"
        helpPaneTemplate={() => (
          <div className={`save-indicator ${savingStatus}`}>
            {savingStatus === 'saving' ? 'Saving...' : savingStatus === 'saved' ? 'Saved' : 'Idle'}
          </div>
        )}
      />

      <input
        ref={openInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleOpenFile}
        style={{ display: 'none' }}
      />
      <input
        ref={importInputRef}
        type="file"
        multiple
        accept=".3dm,.3ds,.3mf,.amf,.dae,.drc,.fbx,.glb,.gltf,.hdr,.exr,.ifc,.kmz,.ldr,.md2,.obj,.pcd,.ply,.stl,.svg,.usdz,.vox,.vtk,.wrl,.xyz,.zip,.json"
        onChange={handleImportFiles}
        style={{ display: 'none' }}
      />
    </header>
  );
}
