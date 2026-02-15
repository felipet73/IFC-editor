import { strToU8, zipSync } from 'three/addons/libs/fflate.module.js';
import threeModuleSource from '../../../node_modules/three/build/three.module.js?raw';
import threeCoreSource from '../../../node_modules/three/build/three.core.js?raw';

function escapeForInlineJson(value) {
  return value
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function createIndexHtml(title, editable, appJsonText) {
  const safeTitle = String(title || 'Three Editor App').replace(/[<>]/g, '');
  const safeJson = escapeForInlineJson(appJsonText);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
    #app { width: 100%; height: 100%; }
    #edit { position: absolute; right: 16px; bottom: 16px; padding: 8px 12px; color: #fff; border: 1px solid #fff; border-radius: 20px; text-decoration: none; font: 12px system-ui, sans-serif; display: ${editable ? 'inline-block' : 'none'}; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "./js/three.module.js"
    }
  }
  </script>
</head>
<body>
  <div id="app"></div>
  <a id="edit" target="_blank">EDIT</a>
  <script id="app-data" type="application/json">${safeJson}</script>
  <script type="module" src="./js/app.js"></script>
</body>
</html>`;
}

function createEditorHtml(title, appJsonText) {
  const safeTitle = String(title || 'Three Editor App').replace(/[<>]/g, '');
  const safeJson = escapeForInlineJson(appJsonText);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} - Editable</title>
  <style>
    :root { color-scheme: dark; }
    html, body { margin: 0; width: 100%; height: 100%; background: #1f1f1f; color: #e7e7e7; font: 13px/1.4 system-ui, sans-serif; }
    .shell { display: grid; grid-template-rows: auto 1fr auto; height: 100%; }
    .toolbar { display: flex; gap: 8px; padding: 10px; background: #2a2a2a; border-bottom: 1px solid #3d3d3d; }
    .toolbar button { border: 1px solid #4b4b4b; background: #3a3a3a; color: #e7e7e7; padding: 6px 10px; cursor: pointer; border-radius: 4px; }
    .toolbar button:hover { background: #454545; }
    textarea { width: 100%; height: 100%; box-sizing: border-box; border: 0; outline: none; resize: none; padding: 12px; background: #151515; color: #ddd; font: 12px/1.4 Consolas, Monaco, monospace; }
    .status { padding: 8px 12px; border-top: 1px solid #3d3d3d; background: #232323; color: #bfbfbf; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  </style>
</head>
<body>
  <div class="shell">
    <div class="toolbar">
      <button id="open-player">Open Player</button>
      <button id="download-json">Download app.json</button>
      <button id="reload-json">Reload Embedded</button>
    </div>
    <textarea id="json-input" spellcheck="false"></textarea>
    <div class="status" id="status">Ready</div>
  </div>

  <script id="app-data" type="application/json">${safeJson}</script>
  <script>
    const input = document.getElementById('json-input');
    const status = document.getElementById('status');
    const embedded = document.getElementById('app-data')?.textContent || '{}';
    input.value = embedded;

    function setStatus(message, isError = false) {
      status.textContent = message;
      status.style.color = isError ? '#ff8d8d' : '#bfbfbf';
    }

    function parseCurrentJson() {
      try {
        const parsed = JSON.parse(input.value);
        setStatus('JSON valid');
        return parsed;
      } catch (error) {
        setStatus('Invalid JSON: ' + error.message, true);
        throw error;
      }
    }

    function downloadJson(text) {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'app.json';
      link.click();
      URL.revokeObjectURL(url);
    }

    document.getElementById('reload-json').addEventListener('click', () => {
      input.value = embedded;
      setStatus('Embedded app.json restored');
    });

    document.getElementById('download-json').addEventListener('click', () => {
      parseCurrentJson();
      downloadJson(input.value);
      setStatus('app.json downloaded');
    });

    document.getElementById('open-player').addEventListener('click', () => {
      parseCurrentJson();
      const key = 'three-editor-app-payload-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(key, input.value);
      window.open('./index.html?payloadKey=' + encodeURIComponent(key), '_blank');
      setStatus('Player opened with current JSON');
    });
  </script>
</body>
</html>`;
}

function createRuntimeScript() {
  return `import * as THREE from 'three';

function createEventsMap() {
  return {
    init: [],
    start: [],
    stop: [],
    keydown: [],
    keyup: [],
    pointerdown: [],
    pointerup: [],
    pointermove: [],
    update: []
  };
}

function dispatch(handlers, payload) {
  for (const handler of handlers) {
    try {
      handler(payload);
    } catch (error) {
      console.error('Player script handler error:', error);
    }
  }
}

class Player {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.loader = new THREE.ObjectLoader();
    this.scene = null;
    this.camera = null;
    this.events = createEventsMap();
    this.width = 1;
    this.height = 1;

    this._startTime = 0;
    this._prevTime = 0;

    this._onKeyDown = (event) => dispatch(this.events.keydown, event);
    this._onKeyUp = (event) => dispatch(this.events.keyup, event);
    this._onPointerDown = (event) => dispatch(this.events.pointerdown, event);
    this._onPointerUp = (event) => dispatch(this.events.pointerup, event);
    this._onPointerMove = (event) => dispatch(this.events.pointermove, event);

    this.container.appendChild(this.renderer.domElement);
  }

  setCamera(camera) {
    this.camera = camera;
    if (this.camera && this.width > 0 && this.height > 0) {
      if (this.camera.isPerspectiveCamera) {
        this.camera.aspect = this.width / Math.max(1, this.height);
      } else if (this.camera.isOrthographicCamera) {
        const aspect = this.width / Math.max(1, this.height);
        this.camera.left = -aspect;
        this.camera.right = aspect;
      }
      this.camera.updateProjectionMatrix();
    }
  }

  setScene(scene) {
    this.scene = scene;
  }

  load(json) {
    this.setScene(this.loader.parse(json.scene));
    this.setCamera(this.loader.parse(json.camera));
    const project = json.project || {};
    if (project.shadows !== undefined) this.renderer.shadowMap.enabled = project.shadows;
    if (project.shadowType !== undefined) this.renderer.shadowMap.type = project.shadowType;
    if (project.toneMapping !== undefined) this.renderer.toneMapping = project.toneMapping;
    if (project.toneMappingExposure !== undefined) this.renderer.toneMappingExposure = project.toneMappingExposure;

    this.events = createEventsMap();

    const scriptWrapResultObject = {};
    let scriptWrapParams = 'player,renderer,scene,camera,THREE';
    for (const eventName of Object.keys(this.events)) {
      scriptWrapParams += ',' + eventName;
      scriptWrapResultObject[eventName] = eventName;
    }
    const scriptWrapResult = JSON.stringify(scriptWrapResultObject).replace(/"/g, '');

    for (const uuid of Object.keys(json.scripts || {})) {
      const object = this.scene.getObjectByProperty('uuid', uuid, true);
      if (!object) continue;
      for (const script of json.scripts[uuid]) {
        try {
          const functions = (new Function(scriptWrapParams, script.source + '\\nreturn ' + scriptWrapResult + ';').bind(object))(
            this,
            this.renderer,
            this.scene,
            this.camera,
            THREE
          );

          for (const [name, fn] of Object.entries(functions)) {
            if (typeof fn !== 'function') continue;
            if (!(name in this.events)) continue;
            this.events[name].push(fn.bind(object));
          }
        } catch (error) {
          console.error('Script compile failed (' + (script.name || 'unnamed') + '):', error);
        }
      }
    }

    dispatch(this.events.init, {});
  }

  setSize(width, height) {
    this.width = width; this.height = height;
    if (this.camera) this.setCamera(this.camera);
    this.renderer.setSize(width, height);
  }

  _animate = () => {
    const now = performance.now();
    dispatch(this.events.update, { time: now - this._startTime, delta: now - this._prevTime });
    if (this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    this._prevTime = now;
  };

  play() {
    this._startTime = this._prevTime = performance.now();

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('pointerdown', this._onPointerDown);
    document.addEventListener('pointerup', this._onPointerUp);
    document.addEventListener('pointermove', this._onPointerMove);

    dispatch(this.events.start, {});
    this.renderer.setAnimationLoop(this._animate);
  }

  stop() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('pointerdown', this._onPointerDown);
    document.removeEventListener('pointerup', this._onPointerUp);
    document.removeEventListener('pointermove', this._onPointerMove);

    dispatch(this.events.stop, {});
    this.renderer.setAnimationLoop(null);
  }
}

async function boot() {
  let json = null;
  const params = new URLSearchParams(window.location.search);
  const payloadKey = params.get('payloadKey');

  if (payloadKey) {
    const payload = localStorage.getItem(payloadKey);
    if (payload) {
      json = JSON.parse(payload);
      localStorage.removeItem(payloadKey);
    }
  }

  const inlineData = document.getElementById('app-data')?.textContent || '';

  if (!json && inlineData.trim().length > 0) {
    json = JSON.parse(inlineData);
  } else if (!json) {
    json = await fetch('./app.json').then((r) => r.json());
  }

  const root = document.getElementById('app');
  const player = new Player(root);
  player.load(json);
  const onResize = () => player.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', onResize);
  onResize();
  player.play();

  const edit = document.getElementById('edit');
  if (edit) {
    edit.href = './editor.html';
  }
}

boot().catch((error) => {
  console.error(error);
  const root = document.getElementById('app');
  if (root) {
    root.style.color = '#f88';
    root.style.padding = '16px';
    root.style.fontFamily = 'system-ui, sans-serif';
    root.textContent = 'Runtime boot failed. Open browser console for details.';
  }
});
`;
}

export function createProjectPublisher(editor) {
  return {
    async publishZip({ title, editable }) {
      const output = editor.toJSON();
      output.metadata = output.metadata || {};
      output.metadata.type = 'App';
      delete output.history;
      const appJsonText = JSON.stringify(output, null, 2);

      const files = {
        'app.json': strToU8(appJsonText),
        'index.html': strToU8(createIndexHtml(title, editable, appJsonText)),
        'editor.html': strToU8(createEditorHtml(title, appJsonText)),
        'js/app.js': strToU8(createRuntimeScript()),
        'js/three.module.js': strToU8(threeModuleSource),
        'js/three.core.js': strToU8(threeCoreSource)
      };

      const zipped = zipSync(files, { level: 9 });
      const blob = new Blob([zipped.buffer], { type: 'application/zip' });
      const filename = `${(title || 'untitled').trim() || 'untitled'}.zip`;
      editor.utils.save(blob, filename);
    }
  };
}
