import { useEffect, useMemo, useState } from 'react';
import { Editor } from '../legacy/core/Editor.js';
import { Loader } from '../legacy/core/Loader.js';
import { RemoveObjectCommand } from '../legacy/core/commands/RemoveObjectCommand.js';
import { createEditorExporter } from './exporter.js';
import { createProjectPublisher } from './publisher.js';

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

export function useEditorRuntime() {
  const editor = useMemo(() => {
    const instance = new Editor();
    instance.controls = { toJSON: () => ({}), fromJSON: () => {} };
    instance.runtime = { renderer: null, pmremGenerator: null, roomEnvironmentTexture: null, environmentTextures: {}, activeEnvironmentPreset: 'none' };
    instance.loader = new Loader(instance);
    instance.exporter = createEditorExporter(instance);
    instance.publisher = createProjectPublisher(instance);
    return instance;
  }, []);

  const [selected, setSelected] = useState(editor.selected);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [sceneGraphVersion, setSceneGraphVersion] = useState(0);
  const [savingStatus, setSavingStatus] = useState('idle');
  const [viewportVersion, setViewportVersion] = useState(0);

  useEffect(() => {
    let rafId = 0;
    let queued = false;
    let graphRafId = 0;
    let graphQueued = false;
    const bumpScene = () => {
      if (queued) return;
      queued = true;
      rafId = window.requestAnimationFrame(() => {
        queued = false;
        setSceneVersion((value) => value + 1);
      });
    };
    const bumpSceneGraph = () => {
      if (graphQueued) return;
      graphQueued = true;
      graphRafId = window.requestAnimationFrame(() => {
        graphQueued = false;
        setSceneGraphVersion((value) => value + 1);
      });
    };
    const onSelected = (object) => {
      setSelected(object);
    };
    const onHistory = () => setHistoryVersion((value) => value + 1);

    editor.signals.objectSelected.add(onSelected);
    editor.signals.historyChanged.add(onHistory);
    editor.signals.sceneGraphChanged.add(bumpScene);
    editor.signals.sceneGraphChanged.add(bumpSceneGraph);
    editor.signals.objectChanged.add(bumpScene);
    editor.signals.editorCleared.add(bumpScene);
    editor.signals.editorCleared.add(bumpSceneGraph);
    editor.signals.materialChanged.add(bumpScene);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (graphRafId) window.cancelAnimationFrame(graphRafId);
      editor.signals.objectSelected.remove(onSelected);
      editor.signals.historyChanged.remove(onHistory);
      editor.signals.sceneGraphChanged.remove(bumpScene);
      editor.signals.sceneGraphChanged.remove(bumpSceneGraph);
      editor.signals.objectChanged.remove(bumpScene);
      editor.signals.editorCleared.remove(bumpScene);
      editor.signals.editorCleared.remove(bumpSceneGraph);
      editor.signals.materialChanged.remove(bumpScene);
    };
  }, [editor]);

  useEffect(() => {
    const onRendererUpdated = (payload) => {
      if (payload && payload.reason === 'recreate-antialias') {
        setViewportVersion((value) => value + 1);
      }
    };

    editor.signals.rendererUpdated.add(onRendererUpdated);

    return () => {
      editor.signals.rendererUpdated.remove(onRendererUpdated);
    };
  }, [editor]);

  useEffect(() => {
    let savedTimer = 0;

    const onSavingStarted = () => {
      clearTimeout(savedTimer);
      setSavingStatus('saving');
    };

    const onSavingFinished = () => {
      setSavingStatus('saved');

      clearTimeout(savedTimer);
      savedTimer = window.setTimeout(() => {
        setSavingStatus('idle');
      }, 1200);
    };

    editor.signals.savingStarted.add(onSavingStarted);
    editor.signals.savingFinished.add(onSavingFinished);

    return () => {
      clearTimeout(savedTimer);
      editor.signals.savingStarted.remove(onSavingStarted);
      editor.signals.savingFinished.remove(onSavingFinished);
    };
  }, [editor]);

  useEffect(() => {
    let isDisposed = false;
    let timeoutId = 0;

    function saveState() {
      if (editor.config.getKey('autosave') === false) {
        return;
      }

      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        editor.signals.savingStarted.dispatch();

        timeoutId = window.setTimeout(() => {
          editor.storage.set(editor.toJSON());
          editor.signals.savingFinished.dispatch();
        }, 100);
      }, 1000);
    }

    const trackedSignals = [
      editor.signals.geometryChanged,
      editor.signals.objectAdded,
      editor.signals.objectChanged,
      editor.signals.objectRemoved,
      editor.signals.materialChanged,
      editor.signals.sceneBackgroundChanged,
      editor.signals.sceneEnvironmentChanged,
      editor.signals.sceneFogChanged,
      editor.signals.sceneGraphChanged,
      editor.signals.scriptChanged,
      editor.signals.historyChanged
    ];

    for (const signal of trackedSignals) {
      signal.add(saveState);
    }

    editor.storage.init(() => {
      editor.storage.get(async (state) => {
        if (isDisposed) return;

        try {
          if (state !== undefined) {
            await editor.fromJSON(state);
          }

          if (isDisposed) return;
          const selectedUuid = editor.config.getKey('selected');
          if (selectedUuid !== undefined) {
            editor.selectByUuid(selectedUuid);
          }
        } catch (error) {
          console.error('Failed to restore autosaved state:', error);
        }
      });
    });

    return () => {
      isDisposed = true;
      clearTimeout(timeoutId);

      for (const signal of trackedSignals) {
        signal.remove(saveState);
      }
    };
  }, [editor]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const translateKey = (editor.config.getKey('settings/shortcuts/translate') || 'w').toLowerCase();
      const rotateKey = (editor.config.getKey('settings/shortcuts/rotate') || 'e').toLowerCase();
      const scaleKey = (editor.config.getKey('settings/shortcuts/scale') || 'r').toLowerCase();
      const undoKey = (editor.config.getKey('settings/shortcuts/undo') || 'z').toLowerCase();
      const focusKey = (editor.config.getKey('settings/shortcuts/focus') || 'f').toLowerCase();

      if (isCtrlOrCmd && key === undoKey) {
        event.preventDefault();
        if (event.shiftKey) {
          editor.redo();
        } else {
          editor.undo();
        }
        return;
      }

      if (isCtrlOrCmd && key === 'y') {
        event.preventDefault();
        editor.redo();
        return;
      }

      if (key === translateKey) {
        editor.signals.transformModeChanged.dispatch('translate');
        return;
      }

      if (key === rotateKey) {
        editor.signals.transformModeChanged.dispatch('rotate');
        return;
      }

      if (key === scaleKey) {
        editor.signals.transformModeChanged.dispatch('scale');
        return;
      }

      if (key === focusKey) {
        if (editor.selected) {
          editor.focus(editor.selected);
        }
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        const object = editor.selected;

        if (object && object.parent) {
          event.preventDefault();
          editor.execute(new RemoveObjectCommand(editor, object));
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [editor]);

  return { editor, selected, historyVersion, sceneVersion, sceneGraphVersion, savingStatus, viewportVersion };
}


