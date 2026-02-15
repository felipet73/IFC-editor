import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { NumericTextBoxComponent, TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { renderVideoWithBestBackend } from '../../editor/runtime/videoPipeline.js';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildRenderContext(editor, width, height) {
  const json = editor.toJSON();
  const loader = new THREE.ObjectLoader();
  const scene = loader.parse(json.scene);
  const camera = loader.parse(json.camera);

  if (camera.isPerspectiveCamera) {
    camera.aspect = width / Math.max(1, height);
  } else if (camera.isOrthographicCamera) {
    const aspect = width / Math.max(1, height);
    camera.left = -aspect;
    camera.right = aspect;
  }

  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !!json.project?.shadows;
  renderer.shadowMap.type = json.project?.shadowType ?? THREE.PCFShadowMap;
  renderer.toneMapping = json.project?.toneMapping ?? THREE.NoToneMapping;
  renderer.toneMappingExposure = json.project?.toneMappingExposure ?? 1;

  return { scene, camera, renderer };
}

function applyShadingMode(scene, shadingMode) {
  if (shadingMode === 'wireframe') {
    scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    return () => scene.overrideMaterial?.dispose?.();
  }

  if (shadingMode === 'normals') {
    scene.overrideMaterial = new THREE.MeshNormalMaterial();
    return () => scene.overrideMaterial?.dispose?.();
  }

  scene.overrideMaterial = null;
  return () => {};
}

function openCenteredPopup(width, height, title = '') {
  const safeWidth = Math.max(480, Math.floor(width / Math.max(1, window.devicePixelRatio)));
  const safeHeight = Math.max(320, Math.floor(height / Math.max(1, window.devicePixelRatio)));
  const left = Math.max(0, Math.floor((window.screen.width - safeWidth) / 2));
  const top = Math.max(0, Math.floor((window.screen.height - safeHeight) / 2));
  const popup = window.open('', '_blank', `location=no,left=${left},top=${top},width=${safeWidth},height=${safeHeight}`);

  if (!popup) return null;

  popup.document.title = title || 'Render Output';
  popup.document.body.style.margin = '0';
  popup.document.body.style.background = '#000';
  popup.document.body.style.color = '#fff';
  popup.document.body.style.fontFamily = 'system-ui, sans-serif';
  popup.document.body.style.overflow = 'hidden';
  return popup;
}

export function ProjectToolsSection({ editor }) {
  const [title, setTitle] = useState(editor.config.getKey('project/title') ?? '');
  const [editable, setEditable] = useState(!!editor.config.getKey('project/editable'));
  const [isPlaying, setIsPlaying] = useState(false);

  const [imageShading, setImageShading] = useState('solid');
  const [imageWidth, setImageWidth] = useState(1024);
  const [imageHeight, setImageHeight] = useState(1024);

  const [videoWidth, setVideoWidth] = useState(1024);
  const [videoHeight, setVideoHeight] = useState(1024);
  const [videoFps, setVideoFps] = useState(30);
  const [videoDuration, setVideoDuration] = useState(10);
  const [videoBusy, setVideoBusy] = useState(false);
  const videoAbortRef = useRef(null);

  useEffect(() => {
    setTitle(editor.config.getKey('project/title') ?? '');
    setEditable(!!editor.config.getKey('project/editable'));
  }, [editor]);

  useEffect(() => {
    const onStart = () => setIsPlaying(true);
    const onStop = () => setIsPlaying(false);

    editor.signals.startPlayer.add(onStart);
    editor.signals.stopPlayer.add(onStop);

    return () => {
      editor.signals.startPlayer.remove(onStart);
      editor.signals.stopPlayer.remove(onStop);
    };
  }, [editor]);

  const renderSizes = useMemo(() => ({
    imageW: parsePositiveInt(imageWidth, 1024),
    imageH: parsePositiveInt(imageHeight, 1024),
    videoW: Math.max(2, parsePositiveInt(videoWidth, 1024) - (parsePositiveInt(videoWidth, 1024) % 2)),
    videoH: Math.max(2, parsePositiveInt(videoHeight, 1024) - (parsePositiveInt(videoHeight, 1024) % 2)),
    fps: parsePositiveInt(videoFps, 30),
    duration: parsePositiveNumber(videoDuration, 10)
  }), [imageWidth, imageHeight, videoWidth, videoHeight, videoFps, videoDuration]);

  const handlePlayToggle = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (next) {
      editor.signals.startPlayer.dispatch();
    } else {
      editor.signals.stopPlayer.dispatch();
    }
  };

  const handlePublish = async () => {
    try {
      if (editor.publisher?.publishZip) {
        await editor.publisher.publishZip({ title, editable });
        return;
      }

      const output = editor.toJSON();
      output.metadata = output.metadata || {};
      output.metadata.type = 'App';
      delete output.history;
      editor.utils.saveString(JSON.stringify(output, null, 2), `${(title || 'untitled').trim() || 'untitled'}.app.json`);
    } catch (error) {
      console.error(error);
      window.alert(`Publish failed: ${error.message}`);
    }
  };

  const handleRenderImage = () => {
    const { scene, camera, renderer } = buildRenderContext(editor, renderSizes.imageW, renderSizes.imageH);
    const disposeShading = applyShadingMode(scene, imageShading);

    renderer.render(scene, camera);
    const pngData = renderer.domElement.toDataURL('image/png');

    disposeShading();
    renderer.dispose();

    const popup = openCenteredPopup(renderSizes.imageW, renderSizes.imageH, 'Image Render');
    if (!popup) return;

    const img = popup.document.createElement('img');
    img.src = pngData;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    popup.document.body.appendChild(img);
  };

  const handleRenderVideo = async () => {
    if (videoBusy) return;
    setVideoBusy(true);
    const abortController = new AbortController();
    videoAbortRef.current = abortController;

    try {
      const popup = openCenteredPopup(renderSizes.videoW, renderSizes.videoH, 'Video Render');
      if (!popup) return;

      const status = popup.document.createElement('div');
      status.style.position = 'absolute';
      status.style.top = '10px';
      status.style.left = '10px';
      status.style.padding = '4px 8px';
      status.style.background = 'rgba(0,0,0,0.45)';
      status.style.border = '1px solid rgba(255,255,255,0.2)';
      status.style.borderRadius = '4px';
      status.style.fontSize = '12px';
      status.style.margin = '10px';
      popup.document.body.appendChild(status);

      const { blob, backend } = await renderVideoWithBestBackend({
        editor,
        width: renderSizes.videoW,
        height: renderSizes.videoH,
        fps: renderSizes.fps,
        durationSeconds: renderSizes.duration,
        shadingMode: imageShading,
        signal: abortController.signal,
        onStatus: (payload) => {
          if (popup.closed) return;

          if (payload.type === 'stage') {
            status.textContent = payload.message;
            return;
          }

          if (payload.type === 'progress') {
            status.textContent = `render ${payload.frame} / ${payload.totalFrames} (${payload.progress}%)`;
            return;
          }

          if (payload.type === 'canceled') {
            status.textContent = 'Render canceled';
            return;
          }

          if (payload.type === 'error') {
            status.textContent = `Error: ${payload.message}`;
            return;
          }

          if (payload.type === 'completed') {
            status.textContent = `${payload.message} (${payload.size} bytes)`;
          }
        },
        onError: (error) => {
          if (popup.closed) return;
          status.textContent = `Render failed: ${error.message}`;
        }
      });
      status.textContent = `Completed with ${backend}`;
      const url = URL.createObjectURL(blob);

      popup.document.body.innerHTML = '';
      popup.document.body.style.overflow = 'auto';

      const video = popup.document.createElement('video');
      video.controls = true;
      video.loop = true;
      video.src = url;
      video.style.width = '100%';
      video.style.height = 'auto';
      popup.document.body.appendChild(video);

      const download = popup.document.createElement('a');
      download.href = url;
      download.download = 'scene.webm';
      download.textContent = 'Download video';
      download.style.display = 'inline-block';
      download.style.margin = '12px';
      download.style.color = '#8fc3ff';
      popup.document.body.appendChild(download);
    } catch (error) {
      console.error(error);
      if (error?.name !== 'AbortError') {
        window.alert(`Video render failed: ${error.message}`);
      }
    } finally {
      videoAbortRef.current = null;
      setVideoBusy(false);
    }
  };

  const handleCancelVideo = () => {
    videoAbortRef.current?.abort();
  };

  const shadingOptions = [
    { id: 'solid', text: 'SOLID' },
    { id: 'wireframe', text: 'WIREFRAME' },
    { id: 'normals', text: 'NORMALS' }
  ];

  return (
    <section className="sidebar-section project-syncfusion">
      <h2>Project / Output</h2>

      <fieldset>
        <legend>App</legend>
        <label>
          Title
          <TextBoxComponent
            value={title}
            input={(args) => {
              const next = String(args.value ?? '');
              setTitle(next);
              editor.config.setKey('project/title', next);
            }}
          />
        </label>

        <label className="toggle-row">
          <CheckBoxComponent
            checked={editable}
            change={(args) => {
              const next = !!args.checked;
              setEditable(next);
              editor.config.setKey('project/editable', next);
            }}
            label="Editable"
          />
        </label>

        <div className="project-actions-row">
          <ButtonComponent iconCss={`e-icons ${isPlaying ? 'e-stop' : 'e-play'}`} content={isPlaying ? 'Stop' : 'Play'} onClick={handlePlayToggle} />
          <ButtonComponent iconCss="e-icons e-export" content="Publish ZIP" onClick={handlePublish} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Image</legend>
        <label>
          Shading
          <DropDownListComponent
            dataSource={shadingOptions}
            fields={{ text: 'text', value: 'id' }}
            value={imageShading}
            change={(args) => setImageShading(String(args.value ?? 'solid'))}
          />
        </label>
        <label>
          Width
          <NumericTextBoxComponent value={imageWidth} min={2} format="n0" change={(args) => setImageWidth(Number(args.value ?? 1024))} />
        </label>
        <label>
          Height
          <NumericTextBoxComponent value={imageHeight} min={2} format="n0" change={(args) => setImageHeight(Number(args.value ?? 1024))} />
        </label>
        <ButtonComponent iconCss="e-icons e-image" content="Render Image" onClick={handleRenderImage} />
      </fieldset>

      <fieldset>
        <legend>Video</legend>
        <label>
          Width
          <NumericTextBoxComponent value={videoWidth} min={2} format="n0" change={(args) => setVideoWidth(Number(args.value ?? 1024))} />
        </label>
        <label>
          Height
          <NumericTextBoxComponent value={videoHeight} min={2} format="n0" change={(args) => setVideoHeight(Number(args.value ?? 1024))} />
        </label>
        <label>
          FPS
          <NumericTextBoxComponent value={videoFps} min={1} format="n0" change={(args) => setVideoFps(Number(args.value ?? 30))} />
        </label>
        <label>
          Duration (s)
          <NumericTextBoxComponent value={videoDuration} min={1} change={(args) => setVideoDuration(Number(args.value ?? 10))} />
        </label>
        <div className="project-actions-row">
          <ButtonComponent iconCss="e-icons e-video" content={videoBusy ? 'Rendering...' : 'Render Video'} onClick={handleRenderVideo} disabled={videoBusy} />
          <ButtonComponent iconCss="e-icons e-close" content="Cancel" onClick={handleCancelVideo} disabled={!videoBusy} />
        </div>
      </fieldset>
    </section>
  );
}
