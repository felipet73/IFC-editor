import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ColorPickerComponent, NumericTextBoxComponent, TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { SetValueCommand } from '../../editor/legacy/core/commands/SetValueCommand.js';

const BACKGROUND_MODE_OPTIONS = [
  { id: 'none', text: 'None' },
  { id: 'color', text: 'Color' },
  { id: 'texture', text: 'Texture' },
  { id: 'equirect', text: 'Equirect' }
];

const FOG_TYPE_OPTIONS = [
  { id: 'none', text: 'None' },
  { id: 'linear', text: 'Linear' },
  { id: 'exp2', text: 'Exp2' }
];

const ENVIRONMENT_OPTIONS = [
  { id: 'none', text: 'None' },
  { id: 'room', text: 'Room' },
  { id: 'studio', text: 'Studio' },
  { id: 'sunset', text: 'Sunset' },
  { id: 'night', text: 'Night' }
];

const COLOR_SPACE_OPTIONS = [
  { id: THREE.NoColorSpace, text: 'No Color Space' },
  { id: THREE.LinearSRGBColorSpace, text: 'srgb-linear' },
  { id: THREE.SRGBColorSpace, text: 'srgb' }
];

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getHexColor(value, fallback) {
  if (!value) return fallback;
  const text = String(value).trim();
  if (text.startsWith('#') && text.length >= 4) return text;
  return fallback;
}

async function loadTextureFromFile(file) {
  const url = URL.createObjectURL(file);
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (extension === 'hdr') {
    const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
    const loader = new RGBELoader();

    const texture = await new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    texture.name = file.name;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    return { texture, url };
  }

  if (extension === 'exr') {
    const { EXRLoader } = await import('three/addons/loaders/EXRLoader.js');
    const loader = new EXRLoader();

    const texture = await new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    texture.name = file.name;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    return { texture, url };
  }

  const loader = new THREE.TextureLoader();

  const texture = await new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });

  texture.name = file.name;
  return { texture, url };
}

function buildPresetScene(preset) {
  const scene = new THREE.Scene();

  const sphereGeo = new THREE.SphereGeometry(0.3, 12, 8);
  const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);

  const colors = {
    room: { bg: 0x40444c, key: 0xffffff, fill: 0x88aaff, rim: 0xffd8a8 },
    studio: { bg: 0x2f3640, key: 0xffffff, fill: 0xa0d8ff, rim: 0xf2f2f2 },
    sunset: { bg: 0x3b2c3d, key: 0xffb37a, fill: 0xff6b6b, rim: 0x8cc7ff },
    night: { bg: 0x0f1722, key: 0x8bb7ff, fill: 0x4050aa, rim: 0x89fff1 }
  }[preset] ?? { bg: 0x40444c, key: 0xffffff, fill: 0x88aaff, rim: 0xffd8a8 };

  scene.background = new THREE.Color(colors.bg);

  const hemi = new THREE.HemisphereLight(colors.key, colors.fill, 1.4);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(colors.key, 2.2);
  key.position.set(5, 6, 3);
  scene.add(key);

  const rim = new THREE.DirectionalLight(colors.rim, 1.1);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: colors.bg, roughness: 0.8, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.35;
  scene.add(floor);

  const m1 = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: colors.key, roughness: 0.2, metalness: 0.8 }));
  m1.position.set(-1.0, 0.0, -0.2);
  scene.add(m1);

  const m2 = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: colors.fill, roughness: 0.6, metalness: 0.2 }));
  m2.position.set(1.0, -0.05, 0.4);
  m2.rotation.set(0.4, 0.6, 0.1);
  scene.add(m2);

  return scene;
}

function disposeScene(scene) {
  scene.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      for (const material of child.material) material?.dispose?.();
    } else {
      child.material?.dispose?.();
    }
  });
}

export function SceneSection({ editor, sceneVersion }) {
  const [backgroundMode, setBackgroundMode] = useState('none');
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [backgroundTexture, setBackgroundTexture] = useState(null);
  const [backgroundTextureName, setBackgroundTextureName] = useState('');
  const [backgroundColorSpace, setBackgroundColorSpace] = useState(THREE.NoColorSpace);
  const [backgroundStatus, setBackgroundStatus] = useState('');
  const fileInputRef = useRef(null);
  const [fogType, setFogType] = useState('none');
  const [fogColor, setFogColor] = useState('#c8d2dc');
  const [fogNear, setFogNear] = useState(1);
  const [fogFar, setFogFar] = useState(100);
  const [fogDensity, setFogDensity] = useState(0.02);
  const [environmentMode, setEnvironmentMode] = useState('none');
  const [backgroundIntensity, setBackgroundIntensity] = useState(1);
  const [backgroundBlurriness, setBackgroundBlurriness] = useState(0);

  useEffect(() => {
    const scene = editor.scene;

    if (scene.background?.isColor) {
      setBackgroundMode('color');
      setBackgroundColor(`#${scene.background.getHexString()}`);
    } else if (scene.background?.isTexture) {
      setBackgroundMode(scene.background.mapping === THREE.EquirectangularReflectionMapping ? 'equirect' : 'texture');
      setBackgroundTexture(scene.background);
      setBackgroundTextureName(scene.background.name || 'Texture');
      setBackgroundColorSpace(scene.background.colorSpace || THREE.NoColorSpace);
    } else {
      setBackgroundMode('none');
      setBackgroundTexture(null);
      setBackgroundTextureName('');
      setBackgroundColorSpace(THREE.NoColorSpace);
    }

    if (scene.fog?.isFog) {
      setFogType('linear');
      setFogColor(`#${scene.fog.color.getHexString()}`);
      setFogNear(parseNumber(scene.fog.near, 1));
      setFogFar(parseNumber(scene.fog.far, 100));
    } else if (scene.fog?.isFogExp2) {
      setFogType('exp2');
      setFogColor(`#${scene.fog.color.getHexString()}`);
      setFogDensity(parseNumber(scene.fog.density, 0.02));
    } else {
      setFogType('none');
    }

    if (scene.environment && scene.environment.isTexture) {
      const preset = editor.runtime?.activeEnvironmentPreset;
      setEnvironmentMode(preset || 'room');
    } else {
      setEnvironmentMode('none');
    }

    setBackgroundIntensity(parseNumber(scene.backgroundIntensity, 1));
    setBackgroundBlurriness(parseNumber(scene.backgroundBlurriness, 0));
    setBackgroundStatus('');
  }, [editor, sceneVersion]);

  const setSceneValue = (attribute, value) => {
    editor.execute(new SetValueCommand(editor, editor.scene, attribute, value));
  };

  const applyBackground = () => {
    if (backgroundMode === 'none') {
      setSceneValue('background', null);
      editor.signals.sceneBackgroundChanged.dispatch(null);
      setBackgroundStatus('Background cleared.');
      return;
    }

    if (backgroundMode === 'color') {
      const color = new THREE.Color(backgroundColor);
      setSceneValue('background', color);
      editor.signals.sceneBackgroundChanged.dispatch(color);
      setBackgroundStatus('Background updated.');
      return;
    }

    if (backgroundMode === 'texture' || backgroundMode === 'equirect') {
      if (!backgroundTexture) {
        setBackgroundStatus('Select a texture first.');
        return;
      }

      backgroundTexture.colorSpace = backgroundColorSpace;
      backgroundTexture.mapping = backgroundMode === 'equirect'
        ? THREE.EquirectangularReflectionMapping
        : THREE.UVMapping;
      backgroundTexture.needsUpdate = true;

      setSceneValue('background', backgroundTexture);
      editor.signals.sceneBackgroundChanged.dispatch(backgroundTexture);
      setBackgroundStatus('Background updated.');
      applyEnvironmentControls();
    }
  };

  const handleBackgroundFile = async (file) => {
    if (!file) return;

    try {
      setBackgroundStatus(`Loading ${file.name}...`);
      const { texture, url } = await loadTextureFromFile(file);
      texture.needsUpdate = true;
      setBackgroundTexture(texture);
      setBackgroundTextureName(file.name);
      setBackgroundColorSpace(texture.colorSpace || THREE.NoColorSpace);
      setBackgroundStatus(`Loaded ${file.name}`);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setBackgroundStatus('Failed loading texture.');
    }
  };

  const applyFog = () => {
    if (fogType === 'none') {
      setSceneValue('fog', null);
      editor.signals.sceneFogChanged.dispatch(null);
      return;
    }

    if (fogType === 'linear') {
      const fog = new THREE.Fog(new THREE.Color(fogColor), parseNumber(fogNear, 1), parseNumber(fogFar, 100));
      setSceneValue('fog', fog);
      editor.signals.sceneFogChanged.dispatch(fog);
      return;
    }

    const fog = new THREE.FogExp2(new THREE.Color(fogColor), parseNumber(fogDensity, 0.02));
    setSceneValue('fog', fog);
    editor.signals.sceneFogChanged.dispatch(fog);
  };

  const applyEnvironmentControls = () => {
    const intensity = parseNumber(backgroundIntensity, 1);
    const blurriness = parseNumber(backgroundBlurriness, 0);

    setSceneValue('backgroundIntensity', intensity);
    setSceneValue('backgroundBlurriness', blurriness);

    if ('environmentIntensity' in editor.scene) {
      setSceneValue('environmentIntensity', intensity);
    }
  };

  const applyEnvironment = async () => {
    if (environmentMode === 'none') {
      setSceneValue('environment', null);
      setSceneValue('background', null);
      editor.runtime.activeEnvironmentPreset = 'none';
      editor.signals.sceneEnvironmentChanged.dispatch(null);
      return;
    }

    const renderer = editor.runtime?.renderer;
    if (!renderer) {
      window.alert('Environment requires active viewport renderer.');
      return;
    }

    if (!editor.runtime.pmremGenerator) {
      editor.runtime.pmremGenerator = new THREE.PMREMGenerator(renderer);
      editor.runtime.pmremGenerator.compileEquirectangularShader();
    }

    if (!editor.runtime.environmentTextures) {
      editor.runtime.environmentTextures = {};
    }

    if (!editor.runtime.environmentTextures[environmentMode]) {
      const presetScene = buildPresetScene(environmentMode);
      const target = editor.runtime.pmremGenerator.fromScene(presetScene, 0.04);
      editor.runtime.environmentTextures[environmentMode] = target.texture;
      disposeScene(presetScene);
    }

    const texture = editor.runtime.environmentTextures[environmentMode];

    setSceneValue('environment', texture);
    setSceneValue('background', texture);
    editor.runtime.activeEnvironmentPreset = environmentMode;
    editor.signals.sceneEnvironmentChanged.dispatch(environmentMode);

    applyEnvironmentControls();
  };

  return (
    <section className="sidebar-section scene-syncfusion">
      <h2>Scene</h2>

      <fieldset>
        <legend><span className="e-icons e-brush" /> Background</legend>
        <div className="scene-row">
          <span>Mode</span>
          <DropDownListComponent
            dataSource={BACKGROUND_MODE_OPTIONS}
            fields={{ text: 'text', value: 'id' }}
            value={backgroundMode}
            change={(args) => setBackgroundMode(String(args.value || 'none'))}
          />
        </div>

        {backgroundMode === 'color' && (
          <div className="scene-row">
            <span>Color</span>
            <ColorPickerComponent
              mode="Palette"
              value={backgroundColor}
              change={(args) => setBackgroundColor(getHexColor(args?.currentValue?.hex || args?.value, backgroundColor))}
            />
          </div>
        )}

        {(backgroundMode === 'texture' || backgroundMode === 'equirect') && (
          <>
            <div className="scene-row scene-row-texture">
              <span>Texture</span>
              <TextBoxComponent value={backgroundTextureName || 'None'} readonly={true} cssClass="scene-readonly" />
              <ButtonComponent iconCss="e-icons e-upload-1" content={backgroundTexture ? 'Replace' : 'Load'} onClick={() => fileInputRef.current?.click()} />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.hdr,.exr"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                handleBackgroundFile(file);
              }}
            />

            <div className="scene-row">
              <span>Color Space</span>
              <DropDownListComponent
                dataSource={COLOR_SPACE_OPTIONS}
                fields={{ text: 'text', value: 'id' }}
                value={backgroundColorSpace}
                change={(args) => setBackgroundColorSpace(String(args.value || THREE.NoColorSpace))}
              />
            </div>

            {backgroundMode === 'equirect' && (
              <>
                <div className="scene-row">
                  <span>Intensity</span>
                  <NumericTextBoxComponent value={backgroundIntensity} min={0} max={10} step={0.1} format="n2" change={(args) => setBackgroundIntensity(parseNumber(args.value, backgroundIntensity))} />
                </div>
                <div className="scene-row">
                  <span>Blur</span>
                  <NumericTextBoxComponent value={backgroundBlurriness} min={0} max={1} step={0.01} format="n2" change={(args) => setBackgroundBlurriness(parseNumber(args.value, backgroundBlurriness))} />
                </div>
              </>
            )}
          </>
        )}

        <ButtonComponent iconCss="e-icons e-check" content="Apply Background" isPrimary={true} onClick={applyBackground} />
        {backgroundStatus && (
          <div className="scene-status">
            <TextBoxComponent value={backgroundStatus} readonly={true} cssClass="scene-readonly" />
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend><span className="e-icons e-filter" /> Fog</legend>
        <div className="scene-row">
          <span>Type</span>
          <DropDownListComponent
            dataSource={FOG_TYPE_OPTIONS}
            fields={{ text: 'text', value: 'id' }}
            value={fogType}
            change={(args) => setFogType(String(args.value || 'none'))}
          />
        </div>

        {fogType !== 'none' && (
          <div className="scene-row">
            <span>Color</span>
            <ColorPickerComponent mode="Palette" value={fogColor} change={(args) => setFogColor(getHexColor(args?.currentValue?.hex || args?.value, fogColor))} />
          </div>
        )}

        {fogType === 'linear' && (
          <>
            <div className="scene-row">
              <span>Near</span>
              <NumericTextBoxComponent value={fogNear} min={0} max={5000} step={0.1} format="n2" change={(args) => setFogNear(parseNumber(args.value, fogNear))} />
            </div>
            <div className="scene-row">
              <span>Far</span>
              <NumericTextBoxComponent value={fogFar} min={0} max={5000} step={1} format="n2" change={(args) => setFogFar(parseNumber(args.value, fogFar))} />
            </div>
          </>
        )}

        {fogType === 'exp2' && (
          <div className="scene-row">
            <span>Density</span>
            <NumericTextBoxComponent value={fogDensity} min={0} max={1} step={0.001} format="n3" change={(args) => setFogDensity(parseNumber(args.value, fogDensity))} />
          </div>
        )}

        <ButtonComponent iconCss="e-icons e-check" content="Apply Fog" onClick={applyFog} />
      </fieldset>

      <fieldset>
        <legend><span className="e-icons e-picture" /> Environment</legend>
        <div className="scene-row">
          <span>Preset</span>
          <DropDownListComponent
            dataSource={ENVIRONMENT_OPTIONS}
            fields={{ text: 'text', value: 'id' }}
            value={environmentMode}
            change={(args) => setEnvironmentMode(String(args.value || 'none'))}
          />
        </div>

        <div className="scene-row">
          <span>Intensity</span>
          <NumericTextBoxComponent
            value={backgroundIntensity}
            min={0}
            max={10}
            step={0.1}
            format="n2"
            change={(args) => setBackgroundIntensity(parseNumber(args.value, backgroundIntensity))}
            blur={applyEnvironmentControls}
          />
        </div>

        <div className="scene-row">
          <span>Blur</span>
          <NumericTextBoxComponent
            value={backgroundBlurriness}
            min={0}
            max={1}
            step={0.01}
            format="n2"
            change={(args) => setBackgroundBlurriness(parseNumber(args.value, backgroundBlurriness))}
            blur={applyEnvironmentControls}
          />
        </div>

        <ButtonComponent iconCss="e-icons e-check" content="Apply Environment" onClick={applyEnvironment} />
      </fieldset>
    </section>
  );
}