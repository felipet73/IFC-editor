import * as THREE from 'three';
import { useEffect, useMemo, useState } from 'react';
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs';

const shadowTypes = [
  { value: THREE.BasicShadowMap, label: 'BasicShadowMap' },
  { value: THREE.PCFShadowMap, label: 'PCFShadowMap' },
  { value: THREE.PCFSoftShadowMap, label: 'PCFSoftShadowMap' },
  { value: THREE.VSMShadowMap, label: 'VSMShadowMap' }
];

const toneMappings = [
  ['NoToneMapping', THREE.NoToneMapping],
  ['LinearToneMapping', THREE.LinearToneMapping],
  ['ReinhardToneMapping', THREE.ReinhardToneMapping],
  ['CineonToneMapping', THREE.CineonToneMapping],
  ['ACESFilmicToneMapping', THREE.ACESFilmicToneMapping],
  ['AgXToneMapping', THREE.AgXToneMapping],
  ['NeutralToneMapping', THREE.NeutralToneMapping]
].filter(([, value]) => value !== undefined).map(([label, value]) => ({ label, value }));

function applyRendererConfig(editor) {
  const renderer = editor.runtime?.renderer;
  if (!renderer) return;

  renderer.shadowMap.enabled = !!editor.config.getKey('project/renderer/shadows');
  renderer.shadowMap.type = Number(editor.config.getKey('project/renderer/shadowType'));
  renderer.toneMapping = Number(editor.config.getKey('project/renderer/toneMapping'));
  renderer.toneMappingExposure = Number(editor.config.getKey('project/renderer/toneMappingExposure'));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  editor.signals.rendererUpdated.dispatch(renderer);
}

export function ProjectRendererSection({ editor }) {
  const [antialias, setAntialias] = useState(true);
  const [shadows, setShadows] = useState(true);
  const [shadowType, setShadowType] = useState(String(THREE.PCFShadowMap));
  const [toneMapping, setToneMapping] = useState(String(THREE.NoToneMapping));
  const [exposure, setExposure] = useState(1);

  const antialiasNote = useMemo(
    () => 'Changing antialias recreates the renderer automatically.',
    []
  );

  useEffect(() => {
    setAntialias(!!editor.config.getKey('project/renderer/antialias'));
    setShadows(!!editor.config.getKey('project/renderer/shadows'));
    setShadowType(String(editor.config.getKey('project/renderer/shadowType') ?? THREE.PCFShadowMap));
    setToneMapping(String(editor.config.getKey('project/renderer/toneMapping') ?? THREE.NoToneMapping));
    setExposure(Number(editor.config.getKey('project/renderer/toneMappingExposure') ?? 1));
  }, [editor]);

  const setConfigAndApply = (...pairs) => {
    editor.config.setKey(...pairs);
    applyRendererConfig(editor);
  };

  return (
    <section className="sidebar-section project-syncfusion">
      <h2>Project / Renderer</h2>

      <fieldset>
        <legend>Renderer</legend>

        <label className="toggle-row">
          <CheckBoxComponent
            checked={antialias}
            change={(args) => {
              const next = !!args.checked;
              setAntialias(next);
              editor.config.setKey('project/renderer/antialias', next);
              editor.signals.rendererUpdated.dispatch({ reason: 'recreate-antialias' });
            }}
            label="Antialias"
          />
        </label>
        <small>{antialiasNote}</small>

        <label className="toggle-row">
          <CheckBoxComponent
            checked={shadows}
            change={(args) => {
              const next = !!args.checked;
              setShadows(next);
              setConfigAndApply('project/renderer/shadows', next);
            }}
            label="Shadows"
          />
        </label>

        <label>
          Shadow Type
          <DropDownListComponent
            dataSource={shadowTypes.map((entry) => ({ id: String(entry.value), text: entry.label }))}
            fields={{ text: 'text', value: 'id' }}
            value={shadowType}
            change={(args) => {
              const next = String(args.value ?? shadowType);
              setShadowType(next);
              setConfigAndApply('project/renderer/shadowType', Number(next));
            }}
          />
        </label>

        <label>
          Tone Mapping
          <DropDownListComponent
            dataSource={toneMappings.map((entry) => ({ id: String(entry.value), text: entry.label }))}
            fields={{ text: 'text', value: 'id' }}
            value={toneMapping}
            change={(args) => {
              const next = String(args.value ?? toneMapping);
              setToneMapping(next);
              setConfigAndApply('project/renderer/toneMapping', Number(next));
            }}
          />
        </label>

        <label>
          Exposure
          <NumericTextBoxComponent
            value={exposure}
            change={(args) => setExposure(Number(args.value ?? 1))}
            blur={() => setConfigAndApply('project/renderer/toneMappingExposure', Number(exposure))}
          />
        </label>

        <ButtonComponent iconCss="e-icons e-check" content="Apply Renderer Settings" onClick={() => applyRendererConfig(editor)} />
      </fieldset>
    </section>
  );
}
