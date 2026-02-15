import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';
import { EditorControls } from '../editor/legacy/core/EditorControls.js';
import { SetPositionCommand } from '../editor/legacy/core/commands/SetPositionCommand.js';
import { SetRotationCommand } from '../editor/legacy/core/commands/SetRotationCommand.js';
import { SetScaleCommand } from '../editor/legacy/core/commands/SetScaleCommand.js';

function createRenderer(container, editor) {
  const antialias = !!editor.config.getKey('project/renderer/antialias');
  const renderer = new THREE.WebGLRenderer({ antialias });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.autoClear = false;
  container.appendChild(renderer.domElement);
  return renderer;
}

function getMousePosition(dom, x, y) {
  const rect = dom.getBoundingClientRect();
  return new THREE.Vector2((x - rect.left) / rect.width, (y - rect.top) / rect.height);
}

export function ViewportCanvas({ editor }) {
  const hostRef = useRef(null);
  const VIEW_HELPER_DIM = 128;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const renderer = createRenderer(host, editor);
    editor.runtime.renderer = renderer;
    editor.signals.rendererCreated.dispatch(renderer);

    const grid = new THREE.GridHelper(30, 30, 0x666666, 0x333333);
    editor.sceneHelpers.add(grid);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.1);
    editor.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 10, 7);
    editor.scene.add(dir);

    const controls = new EditorControls(editor.camera);
    controls.connect(renderer.domElement);
    editor.controls = controls;

    const viewHelperState = { left: 10, top: 72 };
    const updateViewHelperPlacement = () => {
      const margin = 10;
      viewHelperState.left = margin;
      viewHelperState.top = Math.min(72, Math.max(margin, host.clientHeight - VIEW_HELPER_DIM - margin));

      viewHelperDom.style.left = `${viewHelperState.left}px`;
      viewHelperDom.style.top = `${viewHelperState.top}px`;
      viewHelperDom.style.width = `${VIEW_HELPER_DIM}px`;
      viewHelperDom.style.height = `${VIEW_HELPER_DIM}px`;
    };

    const viewHelperDom = document.createElement('div');
    viewHelperDom.className = 'view-helper-overlay';
    host.appendChild(viewHelperDom);
    const viewHelperDomProxy = {
      get offsetWidth() {
        return VIEW_HELPER_DIM;
      },
      get offsetHeight() {
        return VIEW_HELPER_DIM;
      },
      getBoundingClientRect() {
        return viewHelperDom.getBoundingClientRect();
      }
    };
    const viewHelper = new ViewHelper(editor.camera, viewHelperDomProxy);
    viewHelper.center = controls.center;
    updateViewHelperPlacement();

    const onViewHelperPointerDown = (event) => {
      event.stopPropagation();
    };

    const onViewHelperPointerUp = (event) => {
      event.stopPropagation();
      viewHelper.handleClick(event);
    };

    viewHelperDom.addEventListener('pointerdown', onViewHelperPointerDown);
    viewHelperDom.addEventListener('pointerup', onViewHelperPointerUp);

    let activeCamera = editor.viewportCamera || editor.camera;

    const transformControls = new TransformControls(activeCamera, renderer.domElement);
    editor.sceneHelpers.add(transformControls.getHelper());

    const wireframeOverride = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const normalsOverride = new THREE.MeshNormalMaterial();

    let objectPositionOnDown = null;
    let objectRotationOnDown = null;
    let objectScaleOnDown = null;

    transformControls.addEventListener('objectChange', () => {
      if (transformControls.object) {
        editor.signals.objectChanged.dispatch(transformControls.object);
      }
    });

    transformControls.addEventListener('mouseDown', () => {
      const object = transformControls.object;
      if (!object) return;
      objectPositionOnDown = object.position.clone();
      objectRotationOnDown = object.rotation.clone();
      objectScaleOnDown = object.scale.clone();
      controls.enabled = false;
    });

    transformControls.addEventListener('mouseUp', () => {
      const object = transformControls.object;
      if (!object) {
        controls.enabled = true;
        return;
      }

      const mode = transformControls.getMode();
      if (mode === 'translate' && !objectPositionOnDown.equals(object.position)) {
        editor.execute(new SetPositionCommand(editor, object, object.position, objectPositionOnDown));
      }

      if (mode === 'rotate' && !objectRotationOnDown.equals(object.rotation)) {
        editor.execute(new SetRotationCommand(editor, object, object.rotation, objectRotationOnDown));
      }

      if (mode === 'scale' && !objectScaleOnDown.equals(object.scale)) {
        editor.execute(new SetScaleCommand(editor, object, object.scale, objectScaleOnDown));
      }

      controls.enabled = true;
    });

    const onSelected = (object) => {
      if (object && object !== editor.camera && object.parent) {
        transformControls.attach(object);
      } else {
        transformControls.detach();
      }
    };

    const onTransformModeChanged = (mode) => transformControls.setMode(mode);
    const onSpaceChanged = (space) => transformControls.setSpace(space);

    const onSnapChanged = (value) => {
      transformControls.setTranslationSnap(value);
      transformControls.setScaleSnap(value === null ? null : value / 10);
      transformControls.setRotationSnap(value === null ? null : THREE.MathUtils.degToRad(value));
    };

    const onFocus = (object) => controls.focus(object);

    const onViewportCameraChanged = () => {
      activeCamera = editor.viewportCamera || editor.camera;
      transformControls.camera = activeCamera;
    };

    const onViewportShadingChanged = () => {
      const mode = editor.viewportShading;

      if (mode === 'wireframe') {
        editor.scene.overrideMaterial = wireframeOverride;
      } else if (mode === 'normals') {
        editor.scene.overrideMaterial = normalsOverride;
      } else {
        editor.scene.overrideMaterial = null;
      }
    };

    const onShowHelpersChanged = (states) => {
      grid.visible = !!states.gridHelper;

      const helpers = Object.values(editor.helpers);
      for (const helper of helpers) {
        let sourceObject = null;

        helper.traverse((child) => {
          if (sourceObject) return;
          if (child.name === 'picker' && child.userData?.object) {
            sourceObject = child.userData.object;
          }
        });

        if (!sourceObject) {
          helper.visible = true;
          continue;
        }

        if (sourceObject.isCamera) {
          helper.visible = !!states.cameraHelpers;
        } else if (sourceObject.isLight) {
          helper.visible = !!states.lightHelpers;
        } else if (sourceObject.isBone || sourceObject.isSkinnedMesh) {
          helper.visible = !!states.skeletonHelpers;
        } else {
          helper.visible = true;
        }
      }
    };

    editor.signals.objectSelected.add(onSelected);
    editor.signals.transformModeChanged.add(onTransformModeChanged);
    editor.signals.spaceChanged.add(onSpaceChanged);
    editor.signals.snapChanged.add(onSnapChanged);
    editor.signals.objectFocused.add(onFocus);
    editor.signals.showHelpersChanged.add(onShowHelpersChanged);
    editor.signals.viewportCameraChanged.add(onViewportCameraChanged);
    editor.signals.viewportShadingChanged.add(onViewportShadingChanged);

    const down = new THREE.Vector2();
    const up = new THREE.Vector2();

    const onPointerDown = (event) => {
      if (event.target !== renderer.domElement) return;
      down.copy(getMousePosition(host, event.clientX, event.clientY));
    };

    const onPointerUp = (event) => {
      if (event.target !== renderer.domElement) return;
      up.copy(getMousePosition(host, event.clientX, event.clientY));
      if (down.distanceTo(up) > 0.001) return;
      const intersects = editor.selector.getPointerIntersects(up, activeCamera);
      editor.signals.intersectionsDetected.dispatch(intersects);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const updateAspectRatio = () => {
      const aspect = host.clientWidth / Math.max(1, host.clientHeight);

      for (const uuid in editor.cameras) {
        const camera = editor.cameras[uuid];

        if (camera.isPerspectiveCamera) {
          camera.aspect = aspect;
        } else if (camera.isOrthographicCamera) {
          camera.left = -aspect;
          camera.right = aspect;
        }

        camera.updateProjectionMatrix();

        const cameraHelper = editor.helpers[camera.id];
        if (cameraHelper) cameraHelper.update();
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateAspectRatio();
      updateViewHelperPlacement();
      renderer.setSize(host.clientWidth, host.clientHeight);
      editor.signals.rendererUpdated.dispatch(renderer);
      editor.signals.windowResize.dispatch();
    });
    resizeObserver.observe(host);

    editor.setViewportCamera(editor.camera.uuid);
    editor.setViewportShading('solid');
    editor.signals.transformModeChanged.dispatch('translate');
    editor.signals.spaceChanged.dispatch('world');

    const clock = new THREE.Clock();
    let frameId = 0;
    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const delta = clock.getDelta();

      if (viewHelper.animating === true) {
        viewHelper.update(delta);
      }

      renderer.clear();
      renderer.render(editor.scene, activeCamera);
      renderer.render(editor.sceneHelpers, activeCamera);

      if (activeCamera === editor.camera) {
        const yFromBottom = Math.max(0, host.clientHeight - viewHelperState.top - VIEW_HELPER_DIM);
        const originalSetViewport = renderer.setViewport.bind(renderer);
        renderer.setViewport = (x, y, width, height) => {
          if (width === VIEW_HELPER_DIM && height === VIEW_HELPER_DIM) {
            return originalSetViewport(viewHelperState.left, yFromBottom, width, height);
          }
          return originalSetViewport(x, y, width, height);
        };
        viewHelper.render(renderer);
        renderer.setViewport = originalSetViewport;
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);

      editor.signals.objectSelected.remove(onSelected);
      editor.signals.transformModeChanged.remove(onTransformModeChanged);
      editor.signals.spaceChanged.remove(onSpaceChanged);
      editor.signals.snapChanged.remove(onSnapChanged);
      editor.signals.objectFocused.remove(onFocus);
      editor.signals.showHelpersChanged.remove(onShowHelpersChanged);
      editor.signals.viewportCameraChanged.remove(onViewportCameraChanged);
      editor.signals.viewportShadingChanged.remove(onViewportShadingChanged);

      editor.scene.overrideMaterial = null;
      wireframeOverride.dispose();
      normalsOverride.dispose();

      viewHelperDom.removeEventListener('pointerdown', onViewHelperPointerDown);
      viewHelperDom.removeEventListener('pointerup', onViewHelperPointerUp);
      editor.sceneHelpers.remove(grid);
      editor.sceneHelpers.remove(transformControls.getHelper());
      editor.scene.remove(hemi);
      editor.scene.remove(dir);
      controls.disconnect();
      transformControls.dispose();
      renderer.dispose();
      editor.runtime.renderer = null;
      host.innerHTML = '';
    };
  }, [editor]);

  return <div ref={hostRef} className="viewport-canvas" />;
}
