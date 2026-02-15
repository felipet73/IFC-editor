import * as THREE from 'three';
import { useEffect, useMemo, useState } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { NumericTextBoxComponent, TextAreaComponent } from '@syncfusion/ej2-react-inputs';
import { SetGeometryCommand } from '../../editor/legacy/core/commands/SetGeometryCommand.js';

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getShapePointsFromGeometry(geometry) {
  const p = geometry?.parameters ?? {};
  if (geometry?.type === 'LatheGeometry' && Array.isArray(p.points)) {
    return p.points.map((point) => [point.x, point.y]);
  }

  if (geometry?.type === 'ExtrudeGeometry') {
    const source = p.shapes ?? p.shape;
    const shape = Array.isArray(source) ? source[0] : source;
    if (shape?.getPoints) {
      return shape.getPoints(12).map((point) => [point.x, point.y]);
    }
  }

  return [[0, 0], [0.4, 0], [0.4, 1], [0, 1]];
}

function getTubePointsFromGeometry(geometry) {
  const p = geometry?.parameters ?? {};
  if (geometry?.type === 'TubeGeometry' && p.path?.points) {
    return p.path.points.map((point) => [point.x, point.y, point.z]);
  }

  return [[-1, 0, 0], [-0.3, 0.7, 0.2], [0.6, -0.4, 0.1], [1, 0.1, 0]];
}

function getGeometryFormDefaults(geometry) {
  const p = geometry?.parameters ?? {};

  return {
    width: String(p.width ?? 1),
    height: String(p.height ?? 1),
    depth: String(p.depth ?? 1),
    widthSegments: String(p.widthSegments ?? 1),
    heightSegments: String(p.heightSegments ?? 1),
    depthSegments: String(p.depthSegments ?? 1),

    radius: String(p.radius ?? 1),
    radiusTop: String(p.radiusTop ?? 1),
    radiusBottom: String(p.radiusBottom ?? 1),

    radialSegments: String(p.radialSegments ?? 8),
    tubularSegments: String(p.tubularSegments ?? 6),
    arc: String(p.arc ?? (Math.PI * 2)),

    thetaStart: String(p.thetaStart ?? 0),
    thetaLength: String(p.thetaLength ?? Math.PI),
    phiStart: String(p.phiStart ?? 0),
    phiLength: String(p.phiLength ?? (Math.PI * 2)),

    tube: String(p.tube ?? 0.4),
    openEnded: String(!!p.openEnded),

    innerRadius: String(p.innerRadius ?? 0.5),
    outerRadius: String(p.outerRadius ?? 1),

    pValue: String(p.p ?? 2),
    qValue: String(p.q ?? 3),

    capSegments: String(p.capSegments ?? 4),

    lathePointsJson: JSON.stringify(getShapePointsFromGeometry(geometry), null, 2),
    extrudeShapeJson: JSON.stringify(getShapePointsFromGeometry(geometry), null, 2),
    curvePointsJson: JSON.stringify(getTubePointsFromGeometry(geometry), null, 2),

    steps: String(p.options?.steps ?? p.steps ?? 1),
    curveSegments: String(p.options?.curveSegments ?? p.curveSegments ?? 12),
    bevelEnabled: String(!!(p.options?.bevelEnabled ?? p.bevelEnabled ?? false)),
    bevelThickness: String(p.options?.bevelThickness ?? p.bevelThickness ?? 0.1),
    bevelSize: String(p.options?.bevelSize ?? p.bevelSize ?? 0.1),
    bevelSegments: String(p.options?.bevelSegments ?? p.bevelSegments ?? 2),

    closed: String(!!p.closed)
  };
}

function parsePoints2(jsonText, fallback) {
  try {
    const raw = JSON.parse(jsonText);
    if (!Array.isArray(raw)) return fallback;

    const points = raw
      .filter((entry) => Array.isArray(entry) && entry.length >= 2)
      .map((entry) => new THREE.Vector2(Number(entry[0]), Number(entry[1])));

    return points.length >= 2 ? points : fallback;
  } catch {
    return fallback;
  }
}

function parsePoints3(jsonText, fallback) {
  try {
    const raw = JSON.parse(jsonText);
    if (!Array.isArray(raw)) return fallback;

    const points = raw
      .filter((entry) => Array.isArray(entry) && entry.length >= 3)
      .map((entry) => new THREE.Vector3(Number(entry[0]), Number(entry[1]), Number(entry[2])));

    return points.length >= 2 ? points : fallback;
  } catch {
    return fallback;
  }
}

function buildGeometry(type, values) {
  if (type === 'BoxGeometry') {
    return new THREE.BoxGeometry(
      parseNumber(values.width, 1),
      parseNumber(values.height, 1),
      parseNumber(values.depth, 1),
      parseInteger(values.widthSegments, 1),
      parseInteger(values.heightSegments, 1),
      parseInteger(values.depthSegments, 1)
    );
  }

  if (type === 'SphereGeometry') {
    return new THREE.SphereGeometry(
      parseNumber(values.radius, 1),
      parseInteger(values.widthSegments, 32),
      parseInteger(values.heightSegments, 16),
      parseNumber(values.phiStart, 0),
      parseNumber(values.phiLength, Math.PI * 2),
      parseNumber(values.thetaStart, 0),
      parseNumber(values.thetaLength, Math.PI)
    );
  }

  if (type === 'PlaneGeometry') {
    return new THREE.PlaneGeometry(
      parseNumber(values.width, 1),
      parseNumber(values.height, 1),
      parseInteger(values.widthSegments, 1),
      parseInteger(values.heightSegments, 1)
    );
  }

  if (type === 'CylinderGeometry') {
    return new THREE.CylinderGeometry(
      parseNumber(values.radiusTop, 1),
      parseNumber(values.radiusBottom, 1),
      parseNumber(values.height, 1),
      parseInteger(values.radialSegments, 8),
      parseInteger(values.heightSegments, 1),
      values.openEnded === 'true'
    );
  }

  if (type === 'TorusGeometry') {
    return new THREE.TorusGeometry(
      parseNumber(values.radius, 1),
      parseNumber(values.tube, 0.4),
      parseInteger(values.radialSegments, 8),
      parseInteger(values.tubularSegments, 6),
      parseNumber(values.arc, Math.PI * 2)
    );
  }

  if (type === 'CapsuleGeometry') {
    return new THREE.CapsuleGeometry(
      parseNumber(values.radius, 1),
      parseNumber(values.height, 1),
      parseInteger(values.capSegments, 4),
      parseInteger(values.radialSegments, 8)
    );
  }

  if (type === 'TorusKnotGeometry') {
    return new THREE.TorusKnotGeometry(
      parseNumber(values.radius, 1),
      parseNumber(values.tube, 0.35),
      parseInteger(values.tubularSegments, 64),
      parseInteger(values.radialSegments, 8),
      parseInteger(values.pValue, 2),
      parseInteger(values.qValue, 3)
    );
  }

  if (type === 'CircleGeometry') {
    return new THREE.CircleGeometry(
      parseNumber(values.radius, 1),
      parseInteger(values.segments ?? values.radialSegments, 32),
      parseNumber(values.thetaStart, 0),
      parseNumber(values.thetaLength, Math.PI * 2)
    );
  }

  if (type === 'RingGeometry') {
    return new THREE.RingGeometry(
      parseNumber(values.innerRadius, 0.5),
      parseNumber(values.outerRadius, 1),
      parseInteger(values.thetaSegments ?? values.radialSegments, 32),
      parseInteger(values.phiSegments ?? values.tubularSegments, 1),
      parseNumber(values.thetaStart, 0),
      parseNumber(values.thetaLength, Math.PI * 2)
    );
  }

  if (type === 'LatheGeometry') {
    const points = parsePoints2(values.lathePointsJson, [new THREE.Vector2(0, 0), new THREE.Vector2(0.5, 1)]);
    return new THREE.LatheGeometry(
      points,
      parseInteger(values.radialSegments, 12),
      parseNumber(values.phiStart, 0),
      parseNumber(values.phiLength, Math.PI * 2)
    );
  }

  if (type === 'ExtrudeGeometry') {
    const points = parsePoints2(values.extrudeShapeJson, [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1)]);
    const shape = new THREE.Shape(points);

    return new THREE.ExtrudeGeometry(shape, {
      steps: parseInteger(values.steps, 1),
      depth: parseNumber(values.depth, 0.5),
      curveSegments: parseInteger(values.curveSegments, 12),
      bevelEnabled: values.bevelEnabled === 'true',
      bevelThickness: parseNumber(values.bevelThickness, 0.1),
      bevelSize: parseNumber(values.bevelSize, 0.1),
      bevelSegments: parseInteger(values.bevelSegments, 2)
    });
  }

  if (type === 'TubeGeometry') {
    const points = parsePoints3(values.curvePointsJson, [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)]);
    const curve = new THREE.CatmullRomCurve3(points);

    return new THREE.TubeGeometry(
      curve,
      parseInteger(values.tubularSegments, 64),
      parseNumber(values.radius, 0.2),
      parseInteger(values.radialSegments, 8),
      values.closed === 'true'
    );
  }

  return null;
}

function renderNumberField(form, setForm, key, label) {
  return (
    <label key={key} className="geometry-row">
      <span>{label}</span>
      <NumericTextBoxComponent
        value={parseNumber(form[key], 0)}
        change={(args) => setForm((state) => ({ ...state, [key]: String(args.value ?? '') }))}
      />
    </label>
  );
}

function renderJsonField(form, setForm, key, label, onBlur) {
  return (
    <label key={key} className="geometry-json-row">
      <span>{label}</span>
      <TextAreaComponent
        rows={5}
        value={form[key]}
        input={(args) => setForm((state) => ({ ...state, [key]: String(args.value ?? '') }))}
        blur={onBlur}
      />
    </label>
  );
}

export function GeometrySection({ editor, selected }) {
  const geometry = useMemo(() => selected?.geometry ?? null, [selected]);
  const [form, setForm] = useState(getGeometryFormDefaults(geometry));
  const [jsonErrors, setJsonErrors] = useState({
    lathePointsJson: '',
    extrudeShapeJson: '',
    curvePointsJson: ''
  });

  useEffect(() => {
    setForm(getGeometryFormDefaults(geometry));
    setJsonErrors({
      lathePointsJson: '',
      extrudeShapeJson: '',
      curvePointsJson: ''
    });
  }, [geometry]);

  if (!selected) {
    return (
      <section className="sidebar-section geometry-syncfusion">
        <h2>Geometry</h2>
        <p>No object selected.</p>
      </section>
    );
  }

  if (!geometry) {
    return (
      <section className="sidebar-section geometry-syncfusion">
        <h2>Geometry</h2>
        <p>Selected object has no geometry.</p>
      </section>
    );
  }

  const supported = [
    'BoxGeometry', 'SphereGeometry', 'PlaneGeometry', 'CylinderGeometry', 'TorusGeometry',
    'CapsuleGeometry', 'TorusKnotGeometry', 'CircleGeometry', 'RingGeometry',
    'LatheGeometry', 'ExtrudeGeometry', 'TubeGeometry'
  ];

  if (!supported.includes(geometry.type)) {
    return (
      <section className="sidebar-section geometry-syncfusion">
        <h2>Geometry</h2>
        <p>{geometry.type} not yet editable in this React migration.</p>
      </section>
    );
  }

  const booleanOptions = [
    { id: 'false', text: 'False' },
    { id: 'true', text: 'True' }
  ];

  const validateJsonField = (fieldName, dimensions, minPoints) => {
    try {
      const raw = JSON.parse(form[fieldName]);
      if (!Array.isArray(raw)) throw new Error('Expected a JSON array.');
      if (raw.length < minPoints) throw new Error(`At least ${minPoints} points are required.`);

      for (const entry of raw) {
        if (!Array.isArray(entry) || entry.length < dimensions) {
          throw new Error(`Each point must have at least ${dimensions} numbers.`);
        }

        for (let i = 0; i < dimensions; i++) {
          const value = Number(entry[i]);
          if (!Number.isFinite(value)) throw new Error('Point values must be numeric.');
        }
      }

      setJsonErrors((state) => ({ ...state, [fieldName]: '' }));
      return '';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON.';
      setJsonErrors((state) => ({ ...state, [fieldName]: message }));
      return message;
    }
  };

  const normalizeJsonField = (fieldName, dimensions, minPoints) => {
    const error = validateJsonField(fieldName, dimensions, minPoints);
    if (error) return;

    const raw = JSON.parse(form[fieldName]);
    const normalized = raw.map((entry) => entry.slice(0, dimensions).map((value) => Number(value)));
    const pretty = JSON.stringify(normalized, null, 2);
    setForm((state) => ({ ...state, [fieldName]: pretty }));
  };

  const applyGeometry = () => {
    if (geometry.type === 'LatheGeometry' && validateJsonField('lathePointsJson', 2, 2)) return;
    if (geometry.type === 'ExtrudeGeometry' && validateJsonField('extrudeShapeJson', 2, 3)) return;
    if (geometry.type === 'TubeGeometry' && validateJsonField('curvePointsJson', 3, 2)) return;

    const next = buildGeometry(geometry.type, form);
    if (!next) return;
    editor.execute(new SetGeometryCommand(editor, selected, next));
  };

  return (
    <section className="sidebar-section geometry-syncfusion">
      <h2>Geometry</h2>

      <fieldset>
        <legend>{geometry.type}</legend>

        {(geometry.type === 'BoxGeometry' || geometry.type === 'PlaneGeometry') && (
          <div className="geometry-number-grid">
            {renderNumberField(form, setForm, 'width', 'Width')}
            {renderNumberField(form, setForm, 'height', 'Height')}
            {geometry.type === 'BoxGeometry' && renderNumberField(form, setForm, 'depth', 'Depth')}
            {renderNumberField(form, setForm, 'widthSegments', 'Width Segments')}
            {renderNumberField(form, setForm, 'heightSegments', 'Height Segments')}
            {geometry.type === 'BoxGeometry' && renderNumberField(form, setForm, 'depthSegments', 'Depth Segments')}
          </div>
        )}

        {geometry.type === 'SphereGeometry' && (
          <div className="geometry-number-grid">
            {renderNumberField(form, setForm, 'radius', 'Radius')}
            {renderNumberField(form, setForm, 'widthSegments', 'Width Segments')}
            {renderNumberField(form, setForm, 'heightSegments', 'Height Segments')}
            {renderNumberField(form, setForm, 'phiStart', 'Phi Start')}
            {renderNumberField(form, setForm, 'phiLength', 'Phi Length')}
            {renderNumberField(form, setForm, 'thetaStart', 'Theta Start')}
            {renderNumberField(form, setForm, 'thetaLength', 'Theta Length')}
          </div>
        )}

        {geometry.type === 'CylinderGeometry' && (
          <div className="geometry-number-grid">
            {renderNumberField(form, setForm, 'radiusTop', 'Radius Top')}
            {renderNumberField(form, setForm, 'radiusBottom', 'Radius Bottom')}
            {renderNumberField(form, setForm, 'height', 'Height')}
            {renderNumberField(form, setForm, 'radialSegments', 'Radial Segments')}
            {renderNumberField(form, setForm, 'heightSegments', 'Height Segments')}
            <label className="geometry-row">
              <span>Open Ended</span>
              <DropDownListComponent
                dataSource={booleanOptions}
                fields={{ text: 'text', value: 'id' }}
                value={form.openEnded}
                change={(args) => setForm((state) => ({ ...state, openEnded: String(args.value ?? 'false') }))}
              />
            </label>
          </div>
        )}

        {geometry.type === 'TorusGeometry' && (
          <div className="geometry-number-grid">
            {renderNumberField(form, setForm, 'radius', 'Radius')}
            {renderNumberField(form, setForm, 'tube', 'Tube')}
            {renderNumberField(form, setForm, 'radialSegments', 'Radial Segments')}
            {renderNumberField(form, setForm, 'tubularSegments', 'Tubular Segments')}
            {renderNumberField(form, setForm, 'arc', 'Arc')}
          </div>
        )}

        {geometry.type === 'CapsuleGeometry' && (
          <div className="geometry-number-grid">
            {renderNumberField(form, setForm, 'radius', 'Radius')}
            {renderNumberField(form, setForm, 'height', 'Length')}
            {renderNumberField(form, setForm, 'capSegments', 'Cap Segments')}
            {renderNumberField(form, setForm, 'radialSegments', 'Radial Segments')}
          </div>
        )}

        {geometry.type === 'TorusKnotGeometry' && (
          <div className="geometry-number-grid">
            {renderNumberField(form, setForm, 'radius', 'Radius')}
            {renderNumberField(form, setForm, 'tube', 'Tube')}
            {renderNumberField(form, setForm, 'tubularSegments', 'Tubular Segments')}
            {renderNumberField(form, setForm, 'radialSegments', 'Radial Segments')}
            {renderNumberField(form, setForm, 'pValue', 'P')}
            {renderNumberField(form, setForm, 'qValue', 'Q')}
          </div>
        )}

        {geometry.type === 'CircleGeometry' && (
          <div className="geometry-number-grid">
            {renderNumberField(form, setForm, 'radius', 'Radius')}
            {renderNumberField(form, setForm, 'radialSegments', 'Segments')}
            {renderNumberField(form, setForm, 'thetaStart', 'Theta Start')}
            {renderNumberField(form, setForm, 'thetaLength', 'Theta Length')}
          </div>
        )}

        {geometry.type === 'RingGeometry' && (
          <div className="geometry-number-grid">
            {renderNumberField(form, setForm, 'innerRadius', 'Inner Radius')}
            {renderNumberField(form, setForm, 'outerRadius', 'Outer Radius')}
            {renderNumberField(form, setForm, 'radialSegments', 'Theta Segments')}
            {renderNumberField(form, setForm, 'tubularSegments', 'Phi Segments')}
            {renderNumberField(form, setForm, 'thetaStart', 'Theta Start')}
            {renderNumberField(form, setForm, 'thetaLength', 'Theta Length')}
          </div>
        )}

        {geometry.type === 'LatheGeometry' && (
          <>
            {renderJsonField(form, setForm, 'lathePointsJson', 'Points [[x,y], ...]', () => normalizeJsonField('lathePointsJson', 2, 2))}
            {jsonErrors.lathePointsJson && <small className="inline-error">{jsonErrors.lathePointsJson}</small>}
            <div className="geometry-number-grid">
              {renderNumberField(form, setForm, 'radialSegments', 'Segments')}
              {renderNumberField(form, setForm, 'phiStart', 'Phi Start')}
              {renderNumberField(form, setForm, 'phiLength', 'Phi Length')}
            </div>
          </>
        )}

        {geometry.type === 'ExtrudeGeometry' && (
          <>
            {renderJsonField(form, setForm, 'extrudeShapeJson', 'Shape [[x,y], ...]', () => normalizeJsonField('extrudeShapeJson', 2, 3))}
            {jsonErrors.extrudeShapeJson && <small className="inline-error">{jsonErrors.extrudeShapeJson}</small>}
            <div className="geometry-number-grid">
              {renderNumberField(form, setForm, 'depth', 'Depth')}
              {renderNumberField(form, setForm, 'steps', 'Steps')}
              {renderNumberField(form, setForm, 'curveSegments', 'Curve Segments')}
              <label className="geometry-row">
                <span>Bevel Enabled</span>
                <DropDownListComponent
                  dataSource={booleanOptions}
                  fields={{ text: 'text', value: 'id' }}
                  value={form.bevelEnabled}
                  change={(args) => setForm((state) => ({ ...state, bevelEnabled: String(args.value ?? 'false') }))}
                />
              </label>
              {renderNumberField(form, setForm, 'bevelThickness', 'Bevel Thickness')}
              {renderNumberField(form, setForm, 'bevelSize', 'Bevel Size')}
              {renderNumberField(form, setForm, 'bevelSegments', 'Bevel Segments')}
            </div>
          </>
        )}

        {geometry.type === 'TubeGeometry' && (
          <>
            {renderJsonField(form, setForm, 'curvePointsJson', 'Curve [[x,y,z], ...]', () => normalizeJsonField('curvePointsJson', 3, 2))}
            {jsonErrors.curvePointsJson && <small className="inline-error">{jsonErrors.curvePointsJson}</small>}
            <div className="geometry-number-grid">
              {renderNumberField(form, setForm, 'tubularSegments', 'Tubular Segments')}
              {renderNumberField(form, setForm, 'radius', 'Radius')}
              {renderNumberField(form, setForm, 'radialSegments', 'Radial Segments')}
              <label className="geometry-row">
                <span>Closed</span>
                <DropDownListComponent
                  dataSource={booleanOptions}
                  fields={{ text: 'text', value: 'id' }}
                  value={form.closed}
                  change={(args) => setForm((state) => ({ ...state, closed: String(args.value ?? 'false') }))}
                />
              </label>
            </div>
          </>
        )}

        <ButtonComponent iconCss="e-icons e-check" content="Apply Geometry" onClick={applyGeometry} />
      </fieldset>
    </section>
  );
}
