import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { NumericTextBoxComponent, TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { SetPositionCommand } from '../../editor/legacy/core/commands/SetPositionCommand.js';
import { SetRotationCommand } from '../../editor/legacy/core/commands/SetRotationCommand.js';
import { SetScaleCommand } from '../../editor/legacy/core/commands/SetScaleCommand.js';
import { SetValueCommand } from '../../editor/legacy/core/commands/SetValueCommand.js';

function toFixedValues(vectorLike, digits = 3) {
  return {
    x: Number(vectorLike.x).toFixed(digits),
    y: Number(vectorLike.y).toFixed(digits),
    z: Number(vectorLike.z).toFixed(digits)
  };
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ObjectSection({ editor, selected }) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotationDeg, setRotationDeg] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });
  const [visible, setVisible] = useState(true);
  const [castShadow, setCastShadow] = useState(false);
  const [receiveShadow, setReceiveShadow] = useState(false);
  const [frustumCulled, setFrustumCulled] = useState(true);
  const [matrixAutoUpdate, setMatrixAutoUpdate] = useState(true);
  const [renderOrder, setRenderOrder] = useState(0);

  const canEdit = useMemo(() => !!selected && !!selected.parent, [selected]);

  useEffect(() => {
    if (!selected) {
      setName('');
      setPosition({ x: 0, y: 0, z: 0 });
      setRotationDeg({ x: 0, y: 0, z: 0 });
      setScale({ x: 1, y: 1, z: 1 });
      setVisible(true);
      setCastShadow(false);
      setReceiveShadow(false);
      setFrustumCulled(true);
      setMatrixAutoUpdate(true);
      setRenderOrder(0);
      return;
    }

    setName(selected.name || '');
    const pos = toFixedValues(selected.position);
    setPosition({ x: parseNumber(pos.x, 0), y: parseNumber(pos.y, 0), z: parseNumber(pos.z, 0) });
    setRotationDeg({
      x: parseNumber(THREE.MathUtils.radToDeg(selected.rotation.x).toFixed(2), 0),
      y: parseNumber(THREE.MathUtils.radToDeg(selected.rotation.y).toFixed(2), 0),
      z: parseNumber(THREE.MathUtils.radToDeg(selected.rotation.z).toFixed(2), 0)
    });
    const scl = toFixedValues(selected.scale);
    setScale({ x: parseNumber(scl.x, 1), y: parseNumber(scl.y, 1), z: parseNumber(scl.z, 1) });
    setVisible(!!selected.visible);
    setCastShadow(!!selected.castShadow);
    setReceiveShadow(!!selected.receiveShadow);
    setFrustumCulled(!!selected.frustumCulled);
    setMatrixAutoUpdate(!!selected.matrixAutoUpdate);
    setRenderOrder(Number(selected.renderOrder ?? 0));
  }, [selected]);

  const parseVec3 = (value) => new THREE.Vector3(Number(value.x), Number(value.y), Number(value.z));

  const commitName = () => {
    if (!canEdit) return;
    if ((selected.name || '') === name) return;
    editor.execute(new SetValueCommand(editor, selected, 'name', name));
  };

  const commitPosition = () => {
    if (!canEdit) return;
    editor.execute(new SetPositionCommand(editor, selected, parseVec3(position)));
  };

  const commitRotation = () => {
    if (!canEdit) return;

    const next = new THREE.Euler(
      THREE.MathUtils.degToRad(Number(rotationDeg.x)),
      THREE.MathUtils.degToRad(Number(rotationDeg.y)),
      THREE.MathUtils.degToRad(Number(rotationDeg.z)),
      selected.rotation.order
    );

    editor.execute(new SetRotationCommand(editor, selected, next));
  };

  const commitScale = () => {
    if (!canEdit) return;
    editor.execute(new SetScaleCommand(editor, selected, parseVec3(scale)));
  };

  const commitRenderOrder = () => {
    if (!canEdit) return;
    const next = Number(renderOrder);
    if (Number.isNaN(next)) return;
    editor.execute(new SetValueCommand(editor, selected, 'renderOrder', next));
  };

  const toggleValue = (attribute, value, setter) => {
    setter(value);
    if (!canEdit) return;
    editor.execute(new SetValueCommand(editor, selected, attribute, value));
  };

  return (
    <section className="sidebar-section object-syncfusion">
      <h2>Object</h2>

      {!selected && <p>No object selected.</p>}

      {selected && (
        <div className="sidebar-content">
          <label>
            Name
            <TextBoxComponent value={name} change={(args) => setName(String(args.value ?? ''))} blur={commitName} enabled={canEdit} />
          </label>

          <fieldset>
            <legend><span className="e-icons e-list-unordered" /> Flags</legend>
            <label className="toggle-row">
              <CheckBoxComponent checked={visible} change={(args) => toggleValue('visible', !!args.checked, setVisible)} disabled={!canEdit} label="Visible" />
            </label>
            <label className="toggle-row">
              <CheckBoxComponent checked={castShadow} change={(args) => toggleValue('castShadow', !!args.checked, setCastShadow)} disabled={!canEdit} label="Cast Shadow" />
            </label>
            <label className="toggle-row">
              <CheckBoxComponent checked={receiveShadow} change={(args) => toggleValue('receiveShadow', !!args.checked, setReceiveShadow)} disabled={!canEdit} label="Receive Shadow" />
            </label>
            <label className="toggle-row">
              <CheckBoxComponent checked={frustumCulled} change={(args) => toggleValue('frustumCulled', !!args.checked, setFrustumCulled)} disabled={!canEdit} label="Frustum Culled" />
            </label>
            <label className="toggle-row">
              <CheckBoxComponent checked={matrixAutoUpdate} change={(args) => toggleValue('matrixAutoUpdate', !!args.checked, setMatrixAutoUpdate)} disabled={!canEdit} label="Matrix Auto Update" />
            </label>
            <label>
              Render Order
              <NumericTextBoxComponent value={renderOrder} step={1} format="n0" change={(args) => setRenderOrder(parseNumber(args.value, 0))} blur={commitRenderOrder} enabled={canEdit} />
            </label>
          </fieldset>

          <fieldset>
            <legend><span className="e-icons e-move" /> Position</legend>
            <div className="triplet-grid">
              <NumericTextBoxComponent value={position.x} step={0.1} format="n3" change={(args) => setPosition((v) => ({ ...v, x: parseNumber(args.value, v.x) }))} enabled={canEdit} />
              <NumericTextBoxComponent value={position.y} step={0.1} format="n3" change={(args) => setPosition((v) => ({ ...v, y: parseNumber(args.value, v.y) }))} enabled={canEdit} />
              <NumericTextBoxComponent value={position.z} step={0.1} format="n3" change={(args) => setPosition((v) => ({ ...v, z: parseNumber(args.value, v.z) }))} enabled={canEdit} />
            </div>
            <ButtonComponent iconCss="e-icons e-check" content="Apply Position" onClick={commitPosition} disabled={!canEdit} />
          </fieldset>

          <fieldset>
            <legend><span className="e-icons e-undo" /> Rotation (deg)</legend>
            <div className="triplet-grid">
              <NumericTextBoxComponent value={rotationDeg.x} step={0.5} format="n2" change={(args) => setRotationDeg((v) => ({ ...v, x: parseNumber(args.value, v.x) }))} enabled={canEdit} />
              <NumericTextBoxComponent value={rotationDeg.y} step={0.5} format="n2" change={(args) => setRotationDeg((v) => ({ ...v, y: parseNumber(args.value, v.y) }))} enabled={canEdit} />
              <NumericTextBoxComponent value={rotationDeg.z} step={0.5} format="n2" change={(args) => setRotationDeg((v) => ({ ...v, z: parseNumber(args.value, v.z) }))} enabled={canEdit} />
            </div>
            <ButtonComponent iconCss="e-icons e-check" content="Apply Rotation" onClick={commitRotation} disabled={!canEdit} />
          </fieldset>

          <fieldset>
            <legend><span className="e-icons e-resize" /> Scale</legend>
            <div className="triplet-grid">
              <NumericTextBoxComponent value={scale.x} step={0.1} format="n3" change={(args) => setScale((v) => ({ ...v, x: parseNumber(args.value, v.x) }))} enabled={canEdit} />
              <NumericTextBoxComponent value={scale.y} step={0.1} format="n3" change={(args) => setScale((v) => ({ ...v, y: parseNumber(args.value, v.y) }))} enabled={canEdit} />
              <NumericTextBoxComponent value={scale.z} step={0.1} format="n3" change={(args) => setScale((v) => ({ ...v, z: parseNumber(args.value, v.z) }))} enabled={canEdit} />
            </div>
            <ButtonComponent iconCss="e-icons e-check" content="Apply Scale" onClick={commitScale} disabled={!canEdit} />
          </fieldset>

          <ButtonComponent iconCss="e-icons e-focus" content="Focus" onClick={() => editor.focus(selected)} disabled={!selected} />
        </div>
      )}
    </section>
  );
}