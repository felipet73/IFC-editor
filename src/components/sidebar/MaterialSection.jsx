import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ColorPickerComponent, NumericTextBoxComponent, TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { SetMaterialColorCommand } from '../../editor/legacy/core/commands/SetMaterialColorCommand.js';
import { SetMaterialCommand } from '../../editor/legacy/core/commands/SetMaterialCommand.js';
import { SetMaterialMapCommand } from '../../editor/legacy/core/commands/SetMaterialMapCommand.js';
import { SetMaterialRangeCommand } from '../../editor/legacy/core/commands/SetMaterialRangeCommand.js';
import { SetMaterialValueCommand } from '../../editor/legacy/core/commands/SetMaterialValueCommand.js';
import { SetMaterialVectorCommand } from '../../editor/legacy/core/commands/SetMaterialVectorCommand.js';

const MATERIAL_CLASSES = {
  LineBasicMaterial: THREE.LineBasicMaterial,
  LineDashedMaterial: THREE.LineDashedMaterial,
  MeshBasicMaterial: THREE.MeshBasicMaterial,
  MeshDepthMaterial: THREE.MeshDepthMaterial,
  MeshNormalMaterial: THREE.MeshNormalMaterial,
  MeshLambertMaterial: THREE.MeshLambertMaterial,
  MeshMatcapMaterial: THREE.MeshMatcapMaterial,
  MeshPhongMaterial: THREE.MeshPhongMaterial,
  MeshToonMaterial: THREE.MeshToonMaterial,
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  MeshPhysicalMaterial: THREE.MeshPhysicalMaterial,
  RawShaderMaterial: THREE.RawShaderMaterial,
  ShaderMaterial: THREE.ShaderMaterial,
  ShadowMaterial: THREE.ShadowMaterial,
  SpriteMaterial: THREE.SpriteMaterial,
  PointsMaterial: THREE.PointsMaterial
};

const MESH_MATERIAL_OPTIONS = [
  'MeshBasicMaterial',
  'MeshDepthMaterial',
  'MeshNormalMaterial',
  'MeshLambertMaterial',
  'MeshMatcapMaterial',
  'MeshPhongMaterial',
  'MeshToonMaterial',
  'MeshStandardMaterial',
  'MeshPhysicalMaterial',
  'RawShaderMaterial',
  'ShaderMaterial',
  'ShadowMaterial'
];

const LINE_MATERIAL_OPTIONS = ['LineBasicMaterial', 'LineDashedMaterial', 'RawShaderMaterial', 'ShaderMaterial'];
const SPRITE_MATERIAL_OPTIONS = ['SpriteMaterial', 'RawShaderMaterial', 'ShaderMaterial'];
const POINTS_MATERIAL_OPTIONS = ['PointsMaterial', 'RawShaderMaterial', 'ShaderMaterial'];

const COLOR_PROPERTIES = [
  { key: 'color', label: 'Color' },
  { key: 'specular', label: 'Specular' },
  { key: 'emissive', label: 'Emissive', intensityKey: 'emissiveIntensity' },
  { key: 'sheenColor', label: 'Sheen Color' },
  { key: 'attenuationColor', label: 'Attenuation Color' }
];

const NUMBER_PROPERTIES = [
  { key: 'shininess', label: 'Shininess' },
  { key: 'reflectivity', label: 'Reflectivity' },
  { key: 'ior', label: 'IOR' },
  { key: 'roughness', label: 'Roughness' },
  { key: 'metalness', label: 'Metalness' },
  { key: 'clearcoat', label: 'Clearcoat' },
  { key: 'clearcoatRoughness', label: 'Clearcoat Roughness' },
  { key: 'dispersion', label: 'Dispersion' },
  { key: 'iridescence', label: 'Iridescence' },
  { key: 'iridescenceIOR', label: 'Thin-Film IOR' },
  { key: 'sheen', label: 'Sheen' },
  { key: 'sheenRoughness', label: 'Sheen Roughness' },
  { key: 'transmission', label: 'Transmission' },
  { key: 'attenuationDistance', label: 'Attenuation Distance' },
  { key: 'thickness', label: 'Thickness' },
  { key: 'envMapIntensity', label: 'Env Map Intensity' },
  { key: 'opacity', label: 'Opacity' },
  { key: 'alphaTest', label: 'Alpha Test' },
  { key: 'size', label: 'Size' }
];

const BOOLEAN_PROPERTIES = [
  { key: 'vertexColors', label: 'Vertex Colors' },
  { key: 'sizeAttenuation', label: 'Size Attenuation' },
  { key: 'flatShading', label: 'Flat Shading' },
  { key: 'transparent', label: 'Transparent' },
  { key: 'forceSinglePass', label: 'Force Single Pass' },
  { key: 'depthTest', label: 'Depth Test' },
  { key: 'depthWrite', label: 'Depth Write' },
  { key: 'wireframe', label: 'Wireframe' }
];

const CONSTANT_PROPERTIES = [
  {
    key: 'side',
    label: 'Side',
    options: [
      { value: THREE.FrontSide, label: 'Front' },
      { value: THREE.BackSide, label: 'Back' },
      { value: THREE.DoubleSide, label: 'Double' }
    ]
  },
  {
    key: 'blending',
    label: 'Blending',
    options: [
      { value: THREE.NoBlending, label: 'No' },
      { value: THREE.NormalBlending, label: 'Normal' },
      { value: THREE.AdditiveBlending, label: 'Additive' },
      { value: THREE.SubtractiveBlending, label: 'Subtractive' },
      { value: THREE.MultiplyBlending, label: 'Multiply' },
      { value: THREE.CustomBlending, label: 'Custom' }
    ]
  },
  {
    key: 'depthPacking',
    label: 'Depth Packing',
    options: [
      { value: THREE.BasicDepthPacking, label: 'Basic' },
      { value: THREE.RGBADepthPacking, label: 'RGBA' }
    ]
  }
];

const MAP_DEFINITIONS = [
  { key: 'map', label: 'Map', color: true },
  { key: 'specularMap', label: 'Specular Map' },
  { key: 'emissiveMap', label: 'Emissive Map', color: true },
  { key: 'matcap', label: 'Matcap' },
  { key: 'alphaMap', label: 'Alpha Map' },
  { key: 'bumpMap', label: 'Bump Map', scalarKey: 'bumpScale', scalarLabel: 'Scale' },
  { key: 'normalMap', label: 'Normal Map', vector2Key: 'normalScale', vector2Label: 'Scale' },
  { key: 'clearcoatMap', label: 'Clearcoat Map' },
  { key: 'clearcoatNormalMap', label: 'Clearcoat Normal Map', vector2Key: 'clearcoatNormalScale', vector2Label: 'Scale' },
  { key: 'clearcoatRoughnessMap', label: 'Clearcoat Rough. Map' },
  { key: 'displacementMap', label: 'Displace Map', scalarKey: 'displacementScale', scalarLabel: 'Scale' },
  { key: 'roughnessMap', label: 'Rough. Map' },
  { key: 'metalnessMap', label: 'Metal Map' },
  { key: 'iridescenceMap', label: 'Irid. Map' },
  { key: 'sheenColorMap', label: 'Sheen Color Map', color: true },
  { key: 'sheenRoughnessMap', label: 'Sheen Rough. Map' },
  { key: 'iridescenceThicknessMap', label: 'Thin-Film Thickness Map', rangeKey: 'iridescenceThicknessRange', rangeLabel: 'nm' },
  { key: 'envMap', label: 'Env Map', color: true },
  { key: 'lightMap', label: 'Light Map' },
  { key: 'aoMap', label: 'AO Map', scalarKey: 'aoMapIntensity', scalarLabel: 'Intensity' },
  { key: 'gradientMap', label: 'Gradient Map' },
  { key: 'transmissionMap', label: 'Transmission Map' },
  { key: 'thicknessMap', label: 'Thickness Map' }
];

const SHADER_VERTEX_PREFIX = [
  'uniform mat4 projectionMatrix;',
  'uniform mat4 modelViewMatrix;',
  '',
  'attribute vec3 position;',
  ''
].join('\n');

function parseNumeric(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) || parsed === Infinity ? parsed : null;
}

function getHexColor(value, fallback) {
  if (!value) return fallback;
  const text = String(value).trim();
  if (text.startsWith('#') && text.length >= 4) return text;
  return fallback;
}

function cloneTexture(texture) {
  if (!texture || !texture.isTexture) return texture;
  const cloned = texture.clone();
  cloned.needsUpdate = true;
  return cloned;
}

function cloneMaterialValue(value) {
  if (Array.isArray(value)) return [...value];
  if (value && value.isTexture) return cloneTexture(value);
  if (value && typeof value.clone === 'function') return value.clone();
  if (value && typeof value === 'object') return JSON.parse(JSON.stringify(value));
  return value;
}

function copyMaterialForTypeChange(source, target) {
  const transferableKeys = [
    'name',
    'color',
    'emissive',
    'specular',
    'sheenColor',
    'attenuationColor',
    'shininess',
    'reflectivity',
    'ior',
    'roughness',
    'metalness',
    'clearcoat',
    'clearcoatRoughness',
    'dispersion',
    'iridescence',
    'iridescenceIOR',
    'iridescenceThicknessRange',
    'sheen',
    'sheenRoughness',
    'transmission',
    'attenuationDistance',
    'thickness',
    'vertexColors',
    'flatShading',
    'blending',
    'opacity',
    'transparent',
    'forceSinglePass',
    'alphaTest',
    'depthTest',
    'depthWrite',
    'wireframe',
    'side',
    'size',
    'sizeAttenuation',
    'normalScale',
    'clearcoatNormalScale',
    'envMapIntensity',
    'aoMapIntensity',
    'bumpScale',
    'displacementScale',
    'map',
    'specularMap',
    'emissiveMap',
    'matcap',
    'alphaMap',
    'bumpMap',
    'normalMap',
    'clearcoatMap',
    'clearcoatNormalMap',
    'clearcoatRoughnessMap',
    'displacementMap',
    'roughnessMap',
    'metalnessMap',
    'iridescenceMap',
    'sheenColorMap',
    'sheenRoughnessMap',
    'iridescenceThicknessMap',
    'envMap',
    'lightMap',
    'aoMap',
    'gradientMap',
    'transmissionMap',
    'thicknessMap',
    'userData'
  ];

  for (const key of transferableKeys) {
    if (!(key in source) || !(key in target)) continue;
    target[key] = cloneMaterialValue(source[key]);
  }
}

function loadTextureFromFile(file) {
  const loader = new THREE.TextureLoader();
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.name = file.name;
        resolve({ texture, url });
      },
      undefined,
      (error) => reject(error)
    );
  });
}

function getMaterialOptionsForObject(object) {
  if (!object) return [];
  if (object.isMesh) return MESH_MATERIAL_OPTIONS;
  if (object.isSprite) return SPRITE_MATERIAL_OPTIONS;
  if (object.isPoints) return POINTS_MATERIAL_OPTIONS;
  if (object.isLine) return LINE_MATERIAL_OPTIONS;
  return [];
}

export function MaterialSection({ editor, selected }) {
  const [revision, setRevision] = useState(0);
  const [slotIndex, setSlotIndex] = useState(0);
  const [draft, setDraft] = useState({});
  const [materialType, setMaterialType] = useState('MeshStandardMaterial');
  const [mapStatus, setMapStatus] = useState('');
  const [userDataText, setUserDataText] = useState('{}');
  const [userDataError, setUserDataError] = useState('');
  const inputRefs = useRef({});

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    editor.signals.materialChanged.add(bump);
    editor.signals.objectChanged.add(bump);

    return () => {
      editor.signals.materialChanged.remove(bump);
      editor.signals.objectChanged.remove(bump);
    };
  }, [editor]);

  const materials = useMemo(() => {
    if (!selected || !selected.material) return [];
    const list = Array.isArray(selected.material) ? selected.material : [selected.material];
    return list.filter(Boolean);
  }, [selected, revision]);

  useEffect(() => {
    setSlotIndex(0);
  }, [selected]);

  useEffect(() => {
    if (!materials.length) return;
    if (slotIndex <= materials.length - 1) return;
    setSlotIndex(Math.max(0, materials.length - 1));
  }, [materials, slotIndex]);

  const material = materials[slotIndex] ?? null;
  const materialOptions = useMemo(() => getMaterialOptionsForObject(selected), [selected]);

  useEffect(() => {
    if (!material) return;

    const nextDraft = {};

    for (const item of COLOR_PROPERTIES) {
      if (!(item.key in material) || !material[item.key]) continue;
      nextDraft[item.key] = `#${material[item.key].getHexString()}`;
      if (item.intensityKey && item.intensityKey in material) {
        nextDraft[item.intensityKey] = String(material[item.intensityKey]);
      }
    }

    for (const item of NUMBER_PROPERTIES) {
      if (!(item.key in material)) continue;
      nextDraft[item.key] = String(material[item.key]);
    }

    for (const item of BOOLEAN_PROPERTIES) {
      if (!(item.key in material)) continue;
      nextDraft[item.key] = !!material[item.key];
    }

    for (const item of CONSTANT_PROPERTIES) {
      if (!(item.key in material)) continue;
      nextDraft[item.key] = String(material[item.key]);
    }

    if ('normalScale' in material && material.normalScale) {
      nextDraft.normalScaleX = String(material.normalScale.x);
      nextDraft.normalScaleY = String(material.normalScale.y);
    }

    if ('clearcoatNormalScale' in material && material.clearcoatNormalScale) {
      nextDraft.clearcoatNormalScaleX = String(material.clearcoatNormalScale.x);
      nextDraft.clearcoatNormalScaleY = String(material.clearcoatNormalScale.y);
    }

    if ('iridescenceThicknessRange' in material && Array.isArray(material.iridescenceThicknessRange)) {
      nextDraft.iridescenceThicknessRangeMin = String(material.iridescenceThicknessRange[0]);
      nextDraft.iridescenceThicknessRangeMax = String(material.iridescenceThicknessRange[1]);
    }

    setDraft(nextDraft);
    setMaterialType(material.type || 'MeshStandardMaterial');
    setMapStatus('');

    try {
      setUserDataText(JSON.stringify(material.userData ?? {}, null, 2));
      setUserDataError('');
    } catch (error) {
      setUserDataText('{}');
      setUserDataError('Invalid userData in current material');
    }
  }, [material]);

  if (!selected) {
    return (
      <section className="sidebar-section">
        <h2>Material</h2>
        <p>No object selected.</p>
      </section>
    );
  }

  if (!material) {
    return (
      <section className="sidebar-section">
        <h2>Material</h2>
        <p>Selected object has no material.</p>
      </section>
    );
  }

  const setMatValue = (attributeName, newValue) => {
    editor.execute(new SetMaterialValueCommand(editor, selected, attributeName, newValue, slotIndex));
  };

  const setMatColor = (attributeName, hexColor) => {
    const value = Number.parseInt(hexColor.replace('#', ''), 16);
    editor.execute(new SetMaterialColorCommand(editor, selected, attributeName, value, slotIndex));
  };

  const setMatVector = (attributeName, nextValues) => {
    editor.execute(new SetMaterialVectorCommand(editor, selected, attributeName, nextValues, slotIndex));
  };

  const setMatRange = (attributeName, minValue, maxValue) => {
    editor.execute(new SetMaterialRangeCommand(editor, selected, attributeName, minValue, maxValue, slotIndex));
  };

  const handleMaterialTypeChange = (nextType) => {
    setMaterialType(nextType);
    if (material.type === nextType) return;

    const MaterialCtor = MATERIAL_CLASSES[nextType];
    if (!MaterialCtor) return;

    const nextMaterial = new MaterialCtor();

    if (nextMaterial.type === 'RawShaderMaterial') {
      nextMaterial.vertexShader = `${SHADER_VERTEX_PREFIX}${nextMaterial.vertexShader}`;
    }

    copyMaterialForTypeChange(material, nextMaterial);

    editor.removeMaterial(material);
    editor.execute(new SetMaterialCommand(editor, selected, nextMaterial, slotIndex));
    editor.addMaterial(nextMaterial);
  };

  const handleMapSelect = async (definition, file) => {
    if (!file) return;

    try {
      setMapStatus(`Loading ${definition.label}...`);
      const { texture, url } = await loadTextureFromFile(file);

      if (definition.color && texture.isDataTexture !== true && texture.colorSpace !== THREE.SRGBColorSpace) {
        texture.colorSpace = THREE.SRGBColorSpace;
      }

      if (definition.key === 'envMap') {
        texture.mapping = THREE.EquirectangularReflectionMapping;
      }

      editor.execute(new SetMaterialMapCommand(editor, selected, definition.key, texture, slotIndex));
      URL.revokeObjectURL(url);
      setMapStatus(`${definition.label} loaded`);
    } catch (error) {
      console.error(error);
      setMapStatus(`Failed loading ${definition.label}`);
    }
  };

  const clearMap = (mapName) => {
    editor.execute(new SetMaterialMapCommand(editor, selected, mapName, null, slotIndex));
    setMapStatus(`${mapName} cleared`);
  };

  const onDraftChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const commitNumber = (key) => {
    const parsed = parseNumeric(draft[key]);
    if (parsed === null) return;
    setMatValue(key, parsed);
  };

  const commitVector2 = (baseKey) => {
    const x = parseNumeric(draft[`${baseKey}X`]);
    const y = parseNumeric(draft[`${baseKey}Y`]);
    if (x === null || y === null) return;
    setMatVector(baseKey, [x, y]);
  };

  const commitRange = (baseKey) => {
    const minValue = parseNumeric(draft[`${baseKey}Min`]);
    const maxValue = parseNumeric(draft[`${baseKey}Max`]);
    if (minValue === null || maxValue === null) return;
    setMatRange(baseKey, minValue, maxValue);
  };

  const renewUuid = () => {
    setMatValue('uuid', THREE.MathUtils.generateUUID());
  };

  const applyUserData = () => {
    try {
      const parsed = JSON.parse(userDataText || '{}');
      setMatValue('userData', parsed);
      setUserDataError('');
    } catch (error) {
      setUserDataError(error.message);
    }
  };

  const exportJson = () => {
    let output = material.toJSON();

    try {
      output = JSON.stringify(output, null, '\t');
      output = output.replace(/[\n\t]+([\d.e\-[\]]+)/g, '$1');
    } catch (error) {
      output = JSON.stringify(output);
    }

    editor.utils.save(new Blob([output]), `${material.name || 'material'}.json`);
  };

  return (
    <section className="sidebar-section material-syncfusion">
      <h2>Material</h2>

      {materials.length > 1 && (
        <fieldset>
          <legend>Slot</legend>
          <label>
            Active Slot
            <DropDownListComponent
              dataSource={materials.map((entry, index) => ({ id: index, text: `${index + 1}: ${entry.name || entry.type}` }))}
              fields={{ text: 'text', value: 'id' }}
              value={slotIndex}
              change={(args) => setSlotIndex(Number(args.value ?? 0))}
            />
          </label>
        </fieldset>
      )}

      <fieldset>
        <legend>Identity</legend>
        <label>
          Type
          <DropDownListComponent
            dataSource={[
              ...materialOptions.map((typeName) => ({ id: typeName, text: typeName.toUpperCase() })),
              ...(!materialOptions.includes(materialType) ? [{ id: materialType, text: materialType.toUpperCase() }] : [])
            ]}
            fields={{ text: 'text', value: 'id' }}
            value={materialType}
            change={(args) => handleMaterialTypeChange(String(args.value || materialType))}
          />
        </label>

        <div className="material-inline-row">
          <span>UUID</span>
          <code>{material.uuid}</code>
          <ButtonComponent iconCss="e-icons e-refresh" content="New" onClick={renewUuid} />
        </div>

        <label>
          Name
          <TextBoxComponent
            value={draft.name ?? material.name ?? ''}
            change={(args) => onDraftChange('name', String(args.value ?? ''))}
            blur={() => setMatValue('name', draft.name ?? '')}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Properties</legend>

        {COLOR_PROPERTIES.map((item) => {
          if (!(item.key in material)) return null;
          return (
            <div className="material-color-row" key={item.key}>
              <label>
                {item.label}
                <ColorPickerComponent
                  mode="Palette"
                  value={draft[item.key] ?? '#ffffff'}
                  change={(args) => {
                    const nextColor = getHexColor(args?.currentValue?.hex || args?.value, draft[item.key] ?? '#ffffff');
                    onDraftChange(item.key, nextColor);
                    setMatColor(item.key, nextColor);
                  }}
                />
              </label>

              {item.intensityKey && item.intensityKey in material && (
                <label>
                  Intensity
                  <NumericTextBoxComponent
                    value={draft[item.intensityKey] ?? '1'}
                    change={(args) => onDraftChange(item.intensityKey, String(args.value ?? '1'))}
                    blur={() => {
                      const parsed = parseNumeric(draft[item.intensityKey]);
                      if (parsed !== null) setMatValue(item.intensityKey, parsed);
                    }}
                  />
                </label>
              )}
            </div>
          );
        })}

        <div className="material-number-grid">
          {NUMBER_PROPERTIES.map((item) => {
            if (!(item.key in material)) return null;
            return (
              <label key={item.key}>
                {item.label}
                <NumericTextBoxComponent
                  value={parseNumeric(draft[item.key]) ?? 0}
                  change={(args) => onDraftChange(item.key, String(args.value ?? ''))}
                  blur={() => commitNumber(item.key)}
                />
              </label>
            );
          })}
        </div>

        {'normalScale' in material && material.normalScale && (
          <div className="material-vector-row">
            <span>Normal Scale</span>
            <NumericTextBoxComponent
              value={parseNumeric(draft.normalScaleX) ?? parseNumeric(material.normalScale.x) ?? 0}
              change={(args) => onDraftChange('normalScaleX', String(args.value ?? ''))}
              blur={() => commitVector2('normalScale')}
              placeholder="X"
            />
            <NumericTextBoxComponent
              value={parseNumeric(draft.normalScaleY) ?? parseNumeric(material.normalScale.y) ?? 0}
              change={(args) => onDraftChange('normalScaleY', String(args.value ?? ''))}
              blur={() => commitVector2('normalScale')}
              placeholder="Y"
            />
          </div>
        )}

        {'clearcoatNormalScale' in material && material.clearcoatNormalScale && (
          <div className="material-vector-row">
            <span>Clearcoat Normal Scale</span>
            <NumericTextBoxComponent
              value={parseNumeric(draft.clearcoatNormalScaleX) ?? parseNumeric(material.clearcoatNormalScale.x) ?? 0}
              change={(args) => onDraftChange('clearcoatNormalScaleX', String(args.value ?? ''))}
              blur={() => commitVector2('clearcoatNormalScale')}
              placeholder="X"
            />
            <NumericTextBoxComponent
              value={parseNumeric(draft.clearcoatNormalScaleY) ?? parseNumeric(material.clearcoatNormalScale.y) ?? 0}
              change={(args) => onDraftChange('clearcoatNormalScaleY', String(args.value ?? ''))}
              blur={() => commitVector2('clearcoatNormalScale')}
              placeholder="Y"
            />
          </div>
        )}

        {'iridescenceThicknessRange' in material && Array.isArray(material.iridescenceThicknessRange) && (
          <div className="material-range-row">
            <span>Thin-Film Thickness</span>
            <NumericTextBoxComponent
              value={parseNumeric(draft.iridescenceThicknessRangeMin) ?? parseNumeric(material.iridescenceThicknessRange[0]) ?? 0}
              change={(args) => onDraftChange('iridescenceThicknessRangeMin', String(args.value ?? ''))}
              blur={() => commitRange('iridescenceThicknessRange')}
              placeholder="min"
            />
            <NumericTextBoxComponent
              value={parseNumeric(draft.iridescenceThicknessRangeMax) ?? parseNumeric(material.iridescenceThicknessRange[1]) ?? 0}
              change={(args) => onDraftChange('iridescenceThicknessRangeMax', String(args.value ?? ''))}
              blur={() => commitRange('iridescenceThicknessRange')}
              placeholder="max"
            />
          </div>
        )}

        {CONSTANT_PROPERTIES.map((item) => {
          if (!(item.key in material)) return null;
          return (
            <label key={item.key}>
              {item.label}
              <DropDownListComponent
                dataSource={item.options.map((option) => ({ id: String(option.value), text: option.label }))}
                fields={{ text: 'text', value: 'id' }}
                value={draft[item.key] ?? String(material[item.key])}
                change={(args) => {
                  const next = String(args.value ?? material[item.key]);
                  onDraftChange(item.key, next);
                  setMatValue(item.key, Number(next));
                }}
              />
            </label>
          );
        })}

        {BOOLEAN_PROPERTIES.map((item) => {
          if (!(item.key in material)) return null;
          return (
            <label className="toggle-row" key={item.key}>
              <CheckBoxComponent
                checked={!!draft[item.key]}
                change={(args) => {
                  onDraftChange(item.key, !!args.checked);
                  setMatValue(item.key, !!args.checked);
                }}
                label={item.label}
              />
            </label>
          );
        })}
      </fieldset>

      <fieldset>
        <legend>Maps</legend>
        {MAP_DEFINITIONS.map((definition) => {
          if (!(definition.key in material)) return null;

          const texture = material[definition.key];
          const vector2Value = definition.vector2Key && material[definition.vector2Key] ? material[definition.vector2Key] : null;
          const rangeValue = definition.rangeKey && Array.isArray(material[definition.rangeKey]) ? material[definition.rangeKey] : null;

          return (
            <div className="material-map-row" key={definition.key}>
              <span>{definition.label}</span>

              <CheckBoxComponent
                checked={!!texture}
                change={(args) => {
                  if (!args.checked) {
                    clearMap(definition.key);
                    return;
                  }

                  if (!texture) {
                    inputRefs.current[definition.key]?.click();
                  }
                }}
              />

              <ButtonComponent
                iconCss="e-icons e-upload-1"
                content={texture ? 'Replace' : 'Load'}
                onClick={() => inputRefs.current[definition.key]?.click()}
              />

              <ButtonComponent iconCss="e-icons e-close" content="Clear" onClick={() => clearMap(definition.key)} disabled={!texture} />

              <input
                ref={(el) => {
                  inputRefs.current[definition.key] = el;
                }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  handleMapSelect(definition, file);
                }}
              />

              {definition.scalarKey && definition.scalarKey in material && (
                <NumericTextBoxComponent
                  className="material-map-extra"
                  value={parseNumeric(draft[definition.scalarKey]) ?? parseNumeric(material[definition.scalarKey]) ?? 0}
                  change={(args) => onDraftChange(definition.scalarKey, String(args.value ?? ''))}
                  blur={() => commitNumber(definition.scalarKey)}
                  placeholder={definition.scalarLabel}
                />
              )}

              {definition.vector2Key && vector2Value && (
                <div className="material-map-extra-vector">
                  <NumericTextBoxComponent
                    value={parseNumeric(draft[`${definition.vector2Key}X`]) ?? parseNumeric(vector2Value.x) ?? 0}
                    change={(args) => onDraftChange(`${definition.vector2Key}X`, String(args.value ?? ''))}
                    blur={() => commitVector2(definition.vector2Key)}
                    placeholder={`${definition.vector2Label} X`}
                  />
                  <NumericTextBoxComponent
                    value={parseNumeric(draft[`${definition.vector2Key}Y`]) ?? parseNumeric(vector2Value.y) ?? 0}
                    change={(args) => onDraftChange(`${definition.vector2Key}Y`, String(args.value ?? ''))}
                    blur={() => commitVector2(definition.vector2Key)}
                    placeholder={`${definition.vector2Label} Y`}
                  />
                </div>
              )}

              {definition.rangeKey && rangeValue && (
                <div className="material-map-extra-range">
                  <NumericTextBoxComponent
                    value={parseNumeric(draft[`${definition.rangeKey}Min`]) ?? parseNumeric(rangeValue[0]) ?? 0}
                    change={(args) => onDraftChange(`${definition.rangeKey}Min`, String(args.value ?? ''))}
                    blur={() => commitRange(definition.rangeKey)}
                    placeholder={`min ${definition.rangeLabel}`}
                  />
                  <NumericTextBoxComponent
                    value={parseNumeric(draft[`${definition.rangeKey}Max`]) ?? parseNumeric(rangeValue[1]) ?? 0}
                    change={(args) => onDraftChange(`${definition.rangeKey}Max`, String(args.value ?? ''))}
                    blur={() => commitRange(definition.rangeKey)}
                    placeholder={`max ${definition.rangeLabel}`}
                  />
                </div>
              )}
            </div>
          );
        })}
        {mapStatus && <small>{mapStatus}</small>}
      </fieldset>

      <fieldset>
        <legend>User Data</legend>
        <textarea
          value={userDataText}
          onChange={(event) => {
            const value = event.target.value;
            setUserDataText(value);
            try {
              JSON.parse(value || '{}');
              setUserDataError('');
            } catch (error) {
              setUserDataError(error.message);
            }
          }}
          onBlur={applyUserData}
          rows={4}
        />
        {userDataError && <small className="inline-error">{userDataError}</small>}
      </fieldset>

      <ButtonComponent iconCss="e-icons e-download" content="Export JSON" onClick={exportJson} />
    </section>
  );
}
