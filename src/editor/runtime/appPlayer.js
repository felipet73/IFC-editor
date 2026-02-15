import * as THREE from 'three';

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

export class AppPlayer {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.loader = new THREE.ObjectLoader();
    this.camera = null;
    this.scene = null;
    this.events = createEventsMap();

    this.width = 500;
    this.height = 500;

    this.dom = document.createElement('div');
    this.dom.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;

    this._onKeyDown = (event) => dispatch(this.events.keydown, event);
    this._onKeyUp = (event) => dispatch(this.events.keyup, event);
    this._onPointerDown = (event) => dispatch(this.events.pointerdown, event);
    this._onPointerUp = (event) => dispatch(this.events.pointerup, event);
    this._onPointerMove = (event) => dispatch(this.events.pointermove, event);

    this._startTime = 0;
    this._prevTime = 0;
    this._offlinePrevTime = null;
  }

  load(json) {
    const project = json.project || {};

    if (project.shadows !== undefined) this.renderer.shadowMap.enabled = project.shadows;
    if (project.shadowType !== undefined) this.renderer.shadowMap.type = project.shadowType;
    if (project.toneMapping !== undefined) this.renderer.toneMapping = project.toneMapping;
    if (project.toneMappingExposure !== undefined) this.renderer.toneMappingExposure = project.toneMappingExposure;

    this.setScene(this.loader.parse(json.scene));
    this.setCamera(this.loader.parse(json.camera));

    this.events = createEventsMap();
    this._offlinePrevTime = null;

    const scriptWrapResultObject = {};
    let scriptWrapParams = 'player,renderer,scene,camera,THREE';
    for (const eventName of Object.keys(this.events)) {
      scriptWrapParams += `,${eventName}`;
      scriptWrapResultObject[eventName] = eventName;
    }
    const scriptWrapResult = JSON.stringify(scriptWrapResultObject).replace(/"/g, '');

    const scriptsByObject = json.scripts || {};
    for (const uuid of Object.keys(scriptsByObject)) {
      const object = this.scene.getObjectByProperty('uuid', uuid, true);
      if (!object) continue;

      for (const script of scriptsByObject[uuid]) {
        try {
          // eslint-disable-next-line no-new-func
          const functions = (new Function(scriptWrapParams, `${script.source}\nreturn ${scriptWrapResult};`).bind(object))(
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
          console.error(`Script compile failed (${script.name || 'unnamed'}):`, error);
        }
      }
    }

    dispatch(this.events.init, {});
  }

  setCamera(camera) {
    this.camera = camera;
    this.camera.aspect = this.width / Math.max(1, this.height);
    this.camera.updateProjectionMatrix();
  }

  setScene(scene) {
    this.scene = scene;
  }

  setPixelRatio(pixelRatio) {
    this.renderer.setPixelRatio(pixelRatio);
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;

    if (this.camera) {
      if (this.camera.isPerspectiveCamera) {
        this.camera.aspect = width / Math.max(1, height);
      } else if (this.camera.isOrthographicCamera) {
        const aspect = width / Math.max(1, height);
        this.camera.left = -aspect;
        this.camera.right = aspect;
      }
      this.camera.updateProjectionMatrix();
    }

    this.renderer.setSize(width, height);
  }

  _animate = () => {
    const time = performance.now();

    try {
      dispatch(this.events.update, { time: time - this._startTime, delta: time - this._prevTime });
    } catch (error) {
      console.error(error);
    }

    if (this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this._prevTime = time;
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

  render(timeSeconds) {
    const nowMs = timeSeconds * 1000;
    const deltaMs = this._offlinePrevTime === null ? 1000 / 60 : Math.max(0, nowMs - this._offlinePrevTime);
    this._offlinePrevTime = nowMs;
    dispatch(this.events.update, { time: nowMs, delta: deltaMs });
    if (this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    this.renderer.dispose();
    this.scene = null;
    this.camera = null;
    this.events = createEventsMap();
  }
}
