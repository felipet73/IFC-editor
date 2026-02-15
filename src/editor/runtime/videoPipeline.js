import * as THREE from 'three';
import { AppPlayer } from './appPlayer.js';

function buildRenderContext(editor, width, height) {
  const player = new AppPlayer();
  player.setPixelRatio(1);
  player.setSize(width, height);
  player.load(editor.toJSON());
  return player;
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

export function getVideoBackend() {
  if ('VideoEncoder' in window && 'MediaRecorder' in window) return 'webcodecs-fallback-mediarecorder';
  if ('MediaRecorder' in window) return 'mediarecorder';
  return 'none';
}

function emitStatus(callbacks, payload) {
  callbacks.onStatus?.(payload);

  if (payload.type === 'stage') {
    callbacks.onStage?.(payload.message);
  }

  if (payload.type === 'progress') {
    callbacks.onProgress?.({
      frame: payload.frame,
      totalFrames: payload.totalFrames,
      progress: payload.progress
    });
  }
}

function createAbortError() {
  const error = new Error('Video rendering canceled.');
  error.name = 'AbortError';
  error.code = 'VIDEO_RENDER_ABORTED';
  return error;
}

function stopStream(stream) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export async function renderVideoWithBestBackend({
  editor,
  width,
  height,
  fps,
  durationSeconds,
  shadingMode,
  signal,
  onStatus,
  onProgress,
  onStage,
  onError
}) {
  const backend = getVideoBackend();
  if (backend === 'none') {
    const error = new Error('No compatible browser video backend found.');
    error.code = 'VIDEO_BACKEND_UNAVAILABLE';
    onError?.(error);
    throw error;
  }

  const callbacks = { onStatus, onStage, onProgress };
  emitStatus(callbacks, { type: 'stage', message: `Using backend: ${backend}`, backend });

  const player = buildRenderContext(editor, width, height);
  const disposeShading = applyShadingMode(player.scene, shadingMode);
  const canvas = player.renderer.domElement;

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const totalFrames = Math.max(1, Math.floor(fps * durationSeconds));
  let frame = 0;

  try {
    emitStatus(callbacks, { type: 'stage', message: 'Recorder started', backend });

    await new Promise((resolve, reject) => {
      let timer = 0;
      let settled = false;

      const settle = (handler, value) => {
        if (settled) return;
        settled = true;
        handler(value);
      };

      const stopRecorder = () => {
        if (timer) {
          window.clearInterval(timer);
          timer = 0;
        }

        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      };

      const onAbort = () => {
        emitStatus(callbacks, { type: 'canceled', message: 'Render canceled by user', backend });
        stopRecorder();
        settle(reject, createAbortError());
      };

      if (signal?.aborted) {
        settle(reject, createAbortError());
        return;
      }

      signal?.addEventListener('abort', onAbort, { once: true });

      recorder.onstop = () => {
        signal?.removeEventListener('abort', onAbort);
        settle(resolve);
      };

      recorder.onerror = (event) => {
        signal?.removeEventListener('abort', onAbort);
        const error = event?.error || new Error('MediaRecorder error');
        error.code = error.code || 'MEDIARECORDER_ERROR';
        emitStatus(callbacks, { type: 'error', message: error.message, backend });
        settle(reject, error);
      };

      recorder.start();

      timer = window.setInterval(() => {
        if (signal?.aborted) {
          onAbort();
          return;
        }

        frame += 1;
        player.render(frame / fps);
        emitStatus(callbacks, {
          type: 'progress',
          frame,
          totalFrames,
          progress: Math.floor((frame / totalFrames) * 100),
          backend
        });

        if (frame >= totalFrames) {
          emitStatus(callbacks, { type: 'stage', message: 'Finalizing recording', backend });
          stopRecorder();
        }
      }, Math.max(8, Math.floor(1000 / fps)));
    });
  } finally {
    stopStream(stream);
    disposeShading();
    player.dispose();
  }

  const blob = new Blob(chunks, { type: mimeType });
  emitStatus(callbacks, { type: 'completed', message: 'Render completed', backend, size: blob.size });
  return { blob, mimeType, backend };
}
