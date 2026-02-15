import { useState } from 'react';
import { MoveObjectCommand } from '../editor/legacy/core/commands/MoveObjectCommand.js';

function formatLabel(object) {
  if (object.name && object.name.trim().length > 0) {
    return object.name;
  }

  return object.type;
}

function isAncestor(potentialAncestor, object) {
  let current = object?.parent;

  while (current) {
    if (current === potentialAncestor) return true;
    current = current.parent;
  }

  return false;
}

function canMoveObject(object) {
  if (!object) return false;
  if (!object.parent) return false;
  return true;
}

function canDropOnTarget(dragObject, targetObject, mode) {
  if (!dragObject || !targetObject) return false;
  if (!canMoveObject(dragObject)) return false;

  if (dragObject === targetObject) return false;
  if (isAncestor(dragObject, targetObject)) return false;

  if (mode === 'before') {
    const targetParent = targetObject.parent;
    if (!targetParent) return false;

    const oldParent = dragObject.parent;
    const oldIndex = oldParent.children.indexOf(dragObject);
    const targetIndex = targetParent.children.indexOf(targetObject);

    if (oldParent === targetParent && (oldIndex === targetIndex || oldIndex + 1 === targetIndex)) {
      return false;
    }

    return true;
  }

  if (mode === 'child') {
    if (dragObject.parent === targetObject) {
      const oldIndex = targetObject.children.indexOf(dragObject);
      if (oldIndex === targetObject.children.length - 1) {
        return false;
      }
    }

    return true;
  }

  return false;
}

function OutlinerRow({ editor, selected, object, depth, dragState, setDragState }) {
  const isSelected = selected?.uuid === object.uuid;
  const isDragOver = dragState.overUuid === object.uuid;
  const showBeforePreview = isDragOver && dragState.mode === 'before';
  const showChildPreview = isDragOver && dragState.mode === 'child';

  const handleDragStart = (event) => {
    if (!canMoveObject(object)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', object.uuid);
    setDragState({ draggingUuid: object.uuid, overUuid: null, mode: null });
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    const draggingObject = editor.objectByUuid(dragState.draggingUuid);
    if (!draggingObject) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    const mode = ratio < 0.35 ? 'before' : 'child';

    if (!canDropOnTarget(draggingObject, object, mode)) {
      event.dataTransfer.dropEffect = 'none';
      setDragState((state) => ({ ...state, overUuid: null, mode: null }));
      return;
    }

    event.dataTransfer.dropEffect = 'move';
    setDragState((state) => ({ ...state, overUuid: object.uuid, mode }));
  };

  const handleDrop = (event) => {
    event.preventDefault();

    const draggingObject = editor.objectByUuid(dragState.draggingUuid);
    if (!draggingObject) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    const mode = ratio < 0.35 ? 'before' : 'child';

    if (!canDropOnTarget(draggingObject, object, mode)) {
      setDragState({ draggingUuid: null, overUuid: null, mode: null });
      return;
    }

    if (mode === 'before') {
      editor.execute(new MoveObjectCommand(editor, draggingObject, object.parent, object));
    } else {
      editor.execute(new MoveObjectCommand(editor, draggingObject, object, null));
    }

    setDragState({ draggingUuid: null, overUuid: null, mode: null });
  };

  const handleDragEnd = () => {
    setDragState({ draggingUuid: null, overUuid: null, mode: null });
  };

  return (
    <>
      <div className="outliner-row-wrap">
        {showBeforePreview && (
          <div className="outliner-drop-line" style={{ marginLeft: `${8 + depth * 14}px` }} />
        )}

        <button
          className={`outliner-row${isSelected ? ' selected' : ''}${showChildPreview ? ' drag-over-child' : ''}`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => editor.select(object)}
          draggable={canMoveObject(object)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        >
          <span className="outliner-name">{formatLabel(object)}</span>
          <span className="outliner-type">{object.type}</span>
          {showChildPreview && <span className="outliner-drop-chip">as child</span>}
        </button>
      </div>

      {object.children.map((child) => (
        <OutlinerRow
          key={child.uuid}
          editor={editor}
          selected={selected}
          object={child}
          depth={depth + 1}
          dragState={dragState}
          setDragState={setDragState}
        />
      ))}
    </>
  );
}

export function EditorOutliner({ editor, selected, sceneVersion }) {
  const _sceneVersion = sceneVersion;
  const [dragState, setDragState] = useState({ draggingUuid: null, overUuid: null, mode: null });

  const handleRootDragOver = (event) => {
    event.preventDefault();

    const draggingObject = editor.objectByUuid(dragState.draggingUuid);
    if (!draggingObject || !canMoveObject(draggingObject)) return;

    if (draggingObject.parent === editor.scene && editor.scene.children.at(-1) === draggingObject) {
      event.dataTransfer.dropEffect = 'none';
      setDragState((state) => ({ ...state, overUuid: '__root__', mode: null }));
      return;
    }

    event.dataTransfer.dropEffect = 'move';
    setDragState((state) => ({ ...state, overUuid: '__root__', mode: null }));
  };

  const handleRootDrop = (event) => {
    event.preventDefault();

    const draggingObject = editor.objectByUuid(dragState.draggingUuid);
    if (!draggingObject || !canMoveObject(draggingObject)) {
      setDragState({ draggingUuid: null, overUuid: null, mode: null });
      return;
    }

    const noChange = draggingObject.parent === editor.scene && editor.scene.children.at(-1) === draggingObject;

    if (!noChange) {
      editor.execute(new MoveObjectCommand(editor, draggingObject, editor.scene, null));
    }

    setDragState({ draggingUuid: null, overUuid: null, mode: null });
  };

  const handleRootDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDragState((state) => ({ ...state, overUuid: null, mode: null }));
    }
  };

  const isRootOver = dragState.overUuid === '__root__';

  return (
    <div className="outliner-tree" data-scene-version={_sceneVersion}>
      {editor.scene.children.map((child) => (
        <OutlinerRow
          key={child.uuid}
          editor={editor}
          selected={selected}
          object={child}
          depth={0}
          dragState={dragState}
          setDragState={setDragState}
        />
      ))}

      <div
        className={`outliner-root-drop${isRootOver ? ' active' : ''}`}
        onDragOver={handleRootDragOver}
        onDrop={handleRootDrop}
        onDragLeave={handleRootDragLeave}
      >
        Drop here to move to scene root
      </div>
    </div>
  );
}
