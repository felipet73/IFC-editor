import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { TreeViewComponent } from '@syncfusion/ej2-react-navigations';
import { MoveObjectCommand } from '../editor/legacy/core/commands/MoveObjectCommand.js';

const ROOT_ID = '__scene__';

function getNodeId(nodeData) {
  if (!nodeData) return '';
  if (Array.isArray(nodeData)) return String(nodeData[0]?.id || '');
  return String(nodeData.id || '');
}

function getIconClass(object) {
  if (!object) return 'outliner-icon outliner-icon-root';
  if (object.isCamera) return 'outliner-icon outliner-icon-camera';
  if (object.isLight) return 'outliner-icon outliner-icon-light';
  if (object.isMesh) return 'outliner-icon outliner-icon-mesh';
  if (object.isGroup) return 'outliner-icon outliner-icon-group';
  return 'outliner-icon outliner-icon-object';
}

function toTreeNode(object) {
  return {
    id: object.uuid,
    name: object.name && object.name.trim() ? object.name : object.type,
    icon: getIconClass(object),
    expanded: true,
    children: object.children.map((child) => toTreeNode(child))
  };
}

function toTreeData(editor) {
  return [
    {
      id: ROOT_ID,
      name: editor.scene.name || 'Scene',
      icon: 'outliner-icon outliner-icon-root',
      expanded: true,
      children: editor.scene.children.map((child) => toTreeNode(child))
    }
  ];
}

function isAncestor(potentialAncestor, object) {
  let current = object?.parent;
  while (current) {
    if (current === potentialAncestor) return true;
    current = current.parent;
  }
  return false;
}

function computeAfterReference(targetObject) {
  if (!targetObject?.parent) return null;
  const siblings = targetObject.parent.children;
  const index = siblings.indexOf(targetObject);
  return siblings[index + 1] || null;
}

export const EditorOutlinerTree = memo(function EditorOutlinerTree({ editor, sceneGraphVersion }) {
  const _sceneGraphVersion = sceneGraphVersion;
  const hostRef = useRef(null);
  const [treeHeight, setTreeHeight] = useState(240);
  const [labelsVersion, setLabelsVersion] = useState(0);
  const treeData = useMemo(() => toTreeData(editor), [editor, sceneGraphVersion, labelsVersion]);
  const [selectedUuid, setSelectedUuid] = useState(() => {
    if (!editor.selected) return '';
    return editor.selected === editor.scene ? ROOT_ID : editor.selected.uuid;
  });

  useEffect(() => {
    const onSelected = (object) => {
      if (!object) {
        setSelectedUuid('');
        return;
      }
      setSelectedUuid(object === editor.scene ? ROOT_ID : object.uuid);
    };

    const onCleared = () => setSelectedUuid('');

    editor.signals.objectSelected.add(onSelected);
    editor.signals.editorCleared.add(onCleared);
    return () => {
      editor.signals.objectSelected.remove(onSelected);
      editor.signals.editorCleared.remove(onCleared);
    };
  }, [editor]);

  useEffect(() => {
    let rafId = 0;
    let queued = false;

    const bumpLabels = () => {
      if (queued) return;
      queued = true;
      rafId = window.requestAnimationFrame(() => {
        queued = false;
        setLabelsVersion((value) => value + 1);
      });
    };

    editor.signals.objectChanged.add(bumpLabels);
    editor.signals.editorCleared.add(bumpLabels);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      editor.signals.objectChanged.remove(bumpLabels);
      editor.signals.editorCleared.remove(bumpLabels);
    };
  }, [editor]);

  const selectedNodes = useMemo(() => {
    if (!selectedUuid) return [];
    return [selectedUuid];
  }, [selectedUuid]);

  useEffect(() => {
    if (!selectedUuid) return;
    const host = hostRef.current;
    if (!host) return;

    const scrollToSelected = () => {
      const selectedNode =
        host.querySelector('.outliner-treeview.e-treeview .e-list-item.e-active') ||
        host.querySelector('.outliner-treeview.e-treeview .e-list-item[aria-selected="true"]');

      if (selectedNode instanceof HTMLElement) {
        selectedNode.scrollIntoView({ block: 'nearest' });
      }
    };

    const rafId = window.requestAnimationFrame(scrollToSelected);
    const timeoutId = window.setTimeout(scrollToSelected, 80);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [selectedUuid, sceneGraphVersion]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const measure = () => {
      const shell = host.closest('.right-dock-shell');
      if (!shell) {
        const fallback = Math.max(120, Math.floor(host.clientHeight));
        setTreeHeight((prev) => (prev === fallback ? prev : fallback));
        return;
      }

      const shellRect = shell.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const available = Math.floor(shellRect.bottom - hostRect.top - 8);
      const next = Math.max(120, available);
      setTreeHeight((prev) => (prev === next ? prev : next));
    };

    const rafId = window.requestAnimationFrame(measure);
    const timeoutId = window.setTimeout(measure, 120);
    window.addEventListener('resize', measure);
    window.addEventListener('editor-timeline-height', measure);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', measure);
      window.removeEventListener('editor-timeline-height', measure);
    };
  }, [sceneGraphVersion]);

  const handleNodeSelected = (args) => {
    const id = getNodeId(args.nodeData);
    if (!id) return;
    if (id === ROOT_ID) {
      editor.select(editor.scene);
      return;
    }
    const object = editor.objectByUuid(id);
    if (object) editor.select(object);
  };

  const handleNodeDragStop = (args) => {
    const draggedId = getNodeId(args.draggedNodeData);
    const droppedId = getNodeId(args.droppedNodeData);
    const draggedObject = editor.objectByUuid(draggedId);
    if (!draggedObject || !draggedObject.parent) return;

    let newParent = null;
    let newBefore = null;

    if (args.position === 'Inside') {
      if (droppedId === ROOT_ID || !droppedId) {
        newParent = editor.scene;
      } else {
        const droppedObject = editor.objectByUuid(droppedId);
        if (!droppedObject) return;
        newParent = droppedObject;
      }
    } else {
      if (!droppedId || droppedId === ROOT_ID) return;
      const droppedObject = editor.objectByUuid(droppedId);
      if (!droppedObject?.parent) return;
      newParent = droppedObject.parent;
      newBefore = args.position === 'Before' ? droppedObject : computeAfterReference(droppedObject);
    }

    if (!newParent || draggedObject === newParent || isAncestor(draggedObject, newParent)) {
      args.cancel = true;
      return;
    }

    const oldParent = draggedObject.parent;
    const oldIndex = oldParent.children.indexOf(draggedObject);
    const nextBefore = newBefore || null;

    if (oldParent === newParent) {
      const nextIndex = nextBefore ? newParent.children.indexOf(nextBefore) : newParent.children.length;
      if (nextIndex === oldIndex || nextIndex === oldIndex + 1) {
        args.cancel = true;
        return;
      }
    }

    args.cancel = true;
    editor.execute(new MoveObjectCommand(editor, draggedObject, newParent, nextBefore));
  };

  return (
    <div ref={hostRef} className="outliner-tree-host" data-scene-version={_sceneGraphVersion} style={{ height: `${treeHeight}px` }}>
      <TreeViewComponent
        cssClass="outliner-treeview"
        height={`${treeHeight}px`}
        fields={{ dataSource: treeData, id: 'id', text: 'name', child: 'children', iconCss: 'icon' }}
        selectedNodes={selectedNodes}
        allowDragAndDrop={true}
        nodeSelected={handleNodeSelected}
        nodeDragStop={handleNodeDragStop}
      />
    </div>
  );
});
