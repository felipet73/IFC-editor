import { useEffect, useMemo, useRef, useState } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { NumericTextBoxComponent, TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { PaneDirective, PanesDirective, SplitterComponent } from '@syncfusion/ej2-react-layouts';
import { AddScriptCommand } from '../editor/legacy/core/commands/AddScriptCommand.js';
import { SetScriptValueCommand } from '../editor/legacy/core/commands/SetScriptValueCommand.js';

const STORAGE_KEY = 'editor-react.timeline.overlay';

const EASING_OPTIONS = [
  { id: 'linear', text: 'Linear' },
  { id: 'easeIn', text: 'Ease In' },
  { id: 'easeOut', text: 'Ease Out' }
];

const AXES = ['x', 'y', 'z'];

const TRACK_GROUPS = [
  { id: 'position', prefix: 'pos', target: 'position', label: 'Position' },
  { id: 'rotation', prefix: 'rot', target: 'rotation', label: 'Rotation' },
  { id: 'scale', prefix: 'scl', target: 'scale', label: 'Scale' }
];
const TIMELINE_RULER_OFFSET_PX = 232;

const DEFAULT_TIMELINE_STATE = {
  collapsed: false,
  height: 240,
  duration: 10,
  currentTime: 0,
  zoom: 1,
  rotationUnit: 'rad',
  loop: false,
  search: '',
  tracks: {},
  optionsWidth: 260,
  optionsCollapsed: false
};

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sortFrames(frames) {
  return [...(frames || [])].sort((a, b) => a.t - b.t);
}

function snapTime(value, duration) {
  const step = 0.05;
  const snapped = Math.round(value / step) * step;
  return round3(clamp(snapped, 0, duration));
}

function buildTimeMarks(duration) {
  const safeDuration = Math.max(1, Number(duration) || 1);
  const majorStep = safeDuration <= 5 ? 0.5 : safeDuration <= 20 ? 1 : 2;
  const marks = [];
  for (let t = 0; t <= safeDuration + 0.0001; t += majorStep) {
    marks.push(round3(t));
  }
  return marks;
}

function getKeyId(uuid, group, axis, index) {
  return `${uuid}-${group}-${axis}-${index}`;
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function normalizeGroup(rawGroup) {
  return {
    x: Array.isArray(rawGroup?.x) ? rawGroup.x : [],
    y: Array.isArray(rawGroup?.y) ? rawGroup.y : [],
    z: Array.isArray(rawGroup?.z) ? rawGroup.z : [],
    easing: {
      x: rawGroup?.easing?.x || 'linear',
      y: rawGroup?.easing?.y || 'linear',
      z: rawGroup?.easing?.z || 'linear'
    }
  };
}

function withTrackDefaults(track) {
  const normalized = {
    position: normalizeGroup(track?.position),
    rotation: normalizeGroup(track?.rotation),
    scale: normalizeGroup(track?.scale)
  };

  // Backward compatibility: old shape had x/y/z at root (position track).
  if (Array.isArray(track?.x) || Array.isArray(track?.y) || Array.isArray(track?.z)) {
    normalized.position = normalizeGroup({
      x: track?.x,
      y: track?.y,
      z: track?.z,
      easing: track?.easing
    });
  }

  return normalized;
}

function normalizeTracks(rawTracks) {
  if (!rawTracks || typeof rawTracks !== 'object') return {};
  const next = {};
  for (const [uuid, track] of Object.entries(rawTracks)) {
    next[uuid] = withTrackDefaults(track);
  }
  return next;
}

function normalizeTimelineState(rawState) {
  const parsed = rawState && typeof rawState === 'object' ? rawState : {};
  const rotationUnit = parsed.rotationUnit === 'deg' ? 'deg' : 'rad';
  return {
    collapsed: !!parsed.collapsed,
    height: Number.isFinite(parsed.height) ? Math.min(520, Math.max(140, parsed.height)) : DEFAULT_TIMELINE_STATE.height,
    duration: Number.isFinite(parsed.duration) ? Math.max(1, parsed.duration) : DEFAULT_TIMELINE_STATE.duration,
    currentTime: Number.isFinite(parsed.currentTime) ? Math.max(0, parsed.currentTime) : DEFAULT_TIMELINE_STATE.currentTime,
    zoom: Number.isFinite(parsed.zoom) ? clamp(parsed.zoom, 0.5, 4) : DEFAULT_TIMELINE_STATE.zoom,
    rotationUnit,
    loop: !!parsed.loop,
    search: typeof parsed.search === 'string' ? parsed.search : DEFAULT_TIMELINE_STATE.search,
    tracks: normalizeTracks(parsed.tracks),
    optionsWidth: Number.isFinite(parsed.optionsWidth) ? parsed.optionsWidth : DEFAULT_TIMELINE_STATE.optionsWidth,
    optionsCollapsed: !!parsed.optionsCollapsed
  };
}

function formatKeyValue(group, value, rotationUnit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  if (group === 'rotation') {
    if (rotationUnit === 'deg') return `${round3((number * 180) / Math.PI)}deg`;
    return `${round3(number)}rad`;
  }
  return `${round3(number)}`;
}

function readInitialState(editor) {
  const fromProject = normalizeTimelineState(editor?.timelineState);
  if (editor?.timelineState) return fromProject;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TIMELINE_STATE };
    return normalizeTimelineState(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_TIMELINE_STATE };
  }
}

function collectSceneObjects(editor) {
  const result = [];
  editor.scene.traverse((object) => {
    if (object === editor.scene) return;
    if (!object.isObject3D) return;
    result.push({
      uuid: object.uuid,
      name: object.name && object.name.trim() ? object.name : object.type
    });
  });
  return result;
}

function upsertKeyframe(frames, time, value) {
  const t = round3(time);
  const v = round3(value);
  const next = [...(frames || [])];
  const existing = next.findIndex((entry) => round3(entry.t) === t);
  if (existing >= 0) {
    next[existing] = { t, v };
  } else {
    next.push({ t, v });
  }
  next.sort((a, b) => a.t - b.t);
  return next;
}

function removeKeyframe(frames, index) {
  if (!Array.isArray(frames)) return [];
  return frames.filter((_, idx) => idx !== index);
}

function applyEasing(alpha, easing) {
  if (easing === 'easeIn') return alpha * alpha;
  if (easing === 'easeOut') return 1 - (1 - alpha) * (1 - alpha);
  return alpha;
}

function sampleTrack(frames, t, easing) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  if (t <= frames[0].t) return frames[0].v;
  const last = frames[frames.length - 1];
  if (t >= last.t) return last.v;

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (t < a.t || t > b.t) continue;
    const span = b.t - a.t;
    if (span <= 0) return b.v;
    const alpha = applyEasing((t - a.t) / span, easing);
    return a.v + (b.v - a.v) * alpha;
  }
  return null;
}

function makeTimelineScriptSource(trackData) {
  const normalized = withTrackDefaults(trackData);
  const keyframes = {};
  const easing = {};

  for (const group of TRACK_GROUPS) {
    const groupData = normalized[group.id];
    keyframes[group.id] = {};
    easing[group.id] = {};
    for (const axis of AXES) {
      keyframes[group.id][axis] = [...(groupData[axis] || [])]
        .sort((a, b) => a.t - b.t)
        .map((entry) => ({ time: round3(entry.t), value: round3(entry.v) }));
      easing[group.id][axis] = groupData.easing[axis] || 'linear';
    }
  }

  return [
    `const keyframes = ${JSON.stringify(keyframes, null, 2)};`,
    `const easing = ${JSON.stringify(easing, null, 2)};`,
    '',
    'function applyEasing(alpha, mode) {',
    "  if (mode === 'easeIn') return alpha * alpha;",
    "  if (mode === 'easeOut') return 1 - (1 - alpha) * (1 - alpha);",
    '  return alpha;',
    '}',
    '',
    'function sample(track, t, mode) {',
    '  if (!track || track.length === 0) return null;',
    '  if (t <= track[0].time) return track[0].value;',
    '  const last = track[track.length - 1];',
    '  if (t >= last.time) return last.value;',
    '  for (let i = 0; i < track.length - 1; i++) {',
    '    const a = track[i];',
    '    const b = track[i + 1];',
    '    if (t < a.time || t > b.time) continue;',
    '    const span = b.time - a.time;',
    '    if (span <= 0) return b.value;',
    '    const alpha = applyEasing((t - a.time) / span, mode);',
    '    return a.value + (b.value - a.value) * alpha;',
    '  }',
    '  return null;',
    '}',
    '',
    'function update(event) {',
    '  const t = event.time / 1000;',
    "  const groups = ['position', 'rotation', 'scale'];",
    "  const axes = ['x', 'y', 'z'];",
    '  for (let g = 0; g < groups.length; g++) {',
    '    const group = groups[g];',
    '    for (let a = 0; a < axes.length; a++) {',
    '      const axis = axes[a];',
    '      const value = sample(keyframes[group][axis], t, easing[group][axis]);',
    '      if (value !== null && this[group]) this[group][axis] = value;',
    '    }',
    '  }',
    '}',
    ''
  ].join('\n');
}

export function EditorTimelineOverlay({ editor, selected, sceneVersion }) {
  const initial = useMemo(() => readInitialState(editor), [editor]);
  const [collapsed, setCollapsed] = useState(initial.collapsed);
  const [height, setHeight] = useState(initial.height);
  const [duration, setDuration] = useState(initial.duration);
  const [currentTime, setCurrentTime] = useState(initial.currentTime);
  const [zoom, setZoom] = useState(initial.zoom);
  const [rotationUnit, setRotationUnit] = useState(initial.rotationUnit);
  const [loop, setLoop] = useState(initial.loop);
  const [search, setSearch] = useState(initial.search);
  const [tracks, setTracks] = useState(initial.tracks);
  const [optionsWidth, setOptionsWidth] = useState(initial.optionsWidth);
  const [optionsCollapsed, setOptionsCollapsed] = useState(initial.optionsCollapsed);
  const [rightDockWidth, setRightDockWidth] = useState(320);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [dragHud, setDragHud] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [horizontalScroll, setHorizontalScroll] = useState(0);
  const overlayRef = useRef(null);
  const splitterRef = useRef(null);
  const lanesRef = useRef(null);
  const rulerScrollRef = useRef(null);
  const scrollSyncRef = useRef(false);
  const loadedTimelineVersionRef = useRef(editor.timelineStateVersion || 0);
  const playbackRef = useRef({ rafId: 0, lastTime: 0 });
  const resizeRef = useRef({ active: false, startY: 0, startHeight: 240 });
  const dragKeyRef = useRef({ active: false, uuid: '', group: '', axis: '', index: -1, left: 0, width: 0 });
  const dragRafRef = useRef({ rafId: 0, pending: null });
  const tracksRef = useRef(tracks);

  const objects = useMemo(() => collectSceneObjects(editor), [editor, sceneVersion]);
  const filteredObjects = useMemo(() => {
    const selectedUuid = selected && selected !== editor.scene ? selected.uuid : '';
    const query = search.trim().toLowerCase();

    return objects.filter((object) => {
      const track = withTrackDefaults(tracks[object.uuid]);
      const hasAnimation = TRACK_GROUPS.some((group) => AXES.some((axis) => track[group.id][axis].length > 0));
      const includeByRole = object.uuid === selectedUuid || hasAnimation;
      if (!includeByRole) return false;
      if (!query) return true;
      return object.name.toLowerCase().includes(query);
    });
  }, [objects, tracks, selected, editor.scene, search]);

  const timeMarks = useMemo(() => buildTimeMarks(duration), [duration]);
  const pixelsPerSecond = useMemo(() => 120 * zoom, [zoom]);
  const timelineContentWidth = useMemo(() => Math.max(720, Math.round(duration * pixelsPerSecond) + 24), [duration, pixelsPerSecond]);
  const rulerContentWidth = useMemo(() => timelineContentWidth + TIMELINE_RULER_OFFSET_PX, [timelineContentWidth]);
  const currentPx = useMemo(() => clamp(currentTime * pixelsPerSecond, 0, timelineContentWidth), [currentTime, pixelsPerSecond, timelineContentWidth]);
  const isAtEnd = useMemo(() => !isPlaying && duration > 0 && Math.abs(currentTime - duration) < 0.001, [isPlaying, currentTime, duration]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    const version = editor.timelineStateVersion || 0;
    if (version === loadedTimelineVersionRef.current) return;
    loadedTimelineVersionRef.current = version;
    const next = editor.timelineState ? normalizeTimelineState(editor.timelineState) : { ...DEFAULT_TIMELINE_STATE };
    setCollapsed(next.collapsed);
    setHeight(next.height);
    setDuration(next.duration);
    setCurrentTime(next.currentTime);
    setZoom(next.zoom);
    setRotationUnit(next.rotationUnit);
    setLoop(next.loop);
    setSearch(next.search);
    setTracks(next.tracks);
    setOptionsWidth(next.optionsWidth);
    setOptionsCollapsed(next.optionsCollapsed);
  }, [editor, sceneVersion]);

  useEffect(() => {
    editor.timelineState = {
      collapsed,
      height,
      duration,
      currentTime,
      zoom,
      rotationUnit,
      loop,
      search,
      tracks,
      optionsWidth,
      optionsCollapsed
    };

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        collapsed,
        height,
        duration,
        currentTime,
        zoom,
        rotationUnit,
        loop,
        search,
        tracks,
        optionsWidth,
        optionsCollapsed
      })
    );
  }, [editor, collapsed, height, duration, currentTime, zoom, rotationUnit, loop, search, tracks, optionsWidth, optionsCollapsed]);

  useEffect(() => {
    const clampedHeight = Math.min(520, Math.max(140, height));
    const effectiveHeight = collapsed ? 38 : clampedHeight;
    document.documentElement.style.setProperty('--timeline-overlay-height', `${effectiveHeight}px`);
    window.dispatchEvent(new CustomEvent('editor-timeline-height', { detail: effectiveHeight }));
    return () => {
      document.documentElement.style.removeProperty('--timeline-overlay-height');
    };
  }, [collapsed, height]);

  useEffect(() => {
    const readRightDockWidth = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--right-dock-width').trim();
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed) && parsed > 120) {
        setRightDockWidth(parsed);
      } else {
        setRightDockWidth(Math.max(220, Math.floor(window.innerWidth * 0.3)));
      }
    };

    const onDockWidthChange = (event) => {
      const next = Number(event?.detail);
      if (Number.isFinite(next) && next > 120) {
        setRightDockWidth(next);
      } else {
        readRightDockWidth();
      }
    };

    readRightDockWidth();
    window.addEventListener('editor-right-dock-width', onDockWidthChange);
    window.addEventListener('resize', readRightDockWidth);
    return () => {
      window.removeEventListener('editor-right-dock-width', onDockWidthChange);
      window.removeEventListener('resize', readRightDockWidth);
    };
  }, []);

  useEffect(() => {
    const maxWidth = Math.max(180, rightDockWidth);
    setOptionsWidth((prev) => Math.min(prev, maxWidth));
  }, [rightDockWidth]);

  useEffect(() => {
    if (currentTime > duration) {
      setCurrentTime(duration);
    }
  }, [duration, currentTime]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    playbackRef.current.lastTime = performance.now();

    const step = (now) => {
      const delta = (now - playbackRef.current.lastTime) / 1000;
      playbackRef.current.lastTime = now;
      let shouldContinue = true;
      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= duration) {
          if (loop) {
            return round3(next % duration);
          }
          setIsPlaying(false);
          shouldContinue = false;
          return duration;
        }
        return next;
      });
      if (shouldContinue) {
        playbackRef.current.rafId = window.requestAnimationFrame(step);
      }
    };

    playbackRef.current.rafId = window.requestAnimationFrame(step);
    return () => {
      if (playbackRef.current.rafId) {
        window.cancelAnimationFrame(playbackRef.current.rafId);
        playbackRef.current.rafId = 0;
      }
    };
  }, [isPlaying, duration, loop]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'Space') return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      if (event.shiftKey) {
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }
      setIsPlaying((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerMove = (event) => {
      const state = resizeRef.current;
      if (!state.active || collapsed) return;
      const delta = state.startY - event.clientY;
      const nextHeight = Math.min(520, Math.max(140, state.startHeight + delta));
      setHeight(nextHeight);
    };

    const onPointerUp = () => {
      resizeRef.current.active = false;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [collapsed]);

  useEffect(() => {
    const onPointerMove = (event) => {
      const drag = dragKeyRef.current;
      if (!drag.active) return;
      dragRafRef.current.pending = { x: event.clientX, y: event.clientY };
      if (dragRafRef.current.rafId) return;

      dragRafRef.current.rafId = window.requestAnimationFrame(() => {
        dragRafRef.current.rafId = 0;
        const pending = dragRafRef.current.pending;
        if (!pending) return;
        if (drag.width <= 0) return;

        const ratio = clamp((pending.x - drag.left) / drag.width, 0, 1);
        const nextTime = snapTime(ratio * duration, duration);
        const currentTrack = withTrackDefaults(tracksRef.current[drag.uuid]);
        const entry = currentTrack[drag.group][drag.axis][drag.index];
        const valueText = entry ? formatKeyValue(drag.group, entry.v, rotationUnit) : '-';

        setCurrentTime(nextTime);
        setTracks((prev) => {
          const track = withTrackDefaults(prev[drag.uuid]);
          const nextAxis = [...track[drag.group][drag.axis]];
          if (!nextAxis[drag.index]) return prev;
          nextAxis[drag.index] = { ...nextAxis[drag.index], t: nextTime };
          return {
            ...prev,
            [drag.uuid]: {
              ...track,
              [drag.group]: {
                ...track[drag.group],
                [drag.axis]: nextAxis
              }
            }
          };
        });

        const overlayRect = overlayRef.current?.getBoundingClientRect();
        if (overlayRect) {
          setDragHud({
            visible: true,
            x: clamp(pending.x - overlayRect.left + 12, 8, overlayRect.width - 140),
            y: clamp(pending.y - overlayRect.top - 28, 8, overlayRect.height - 24),
            text: `${nextTime}s | ${valueText}`
          });
        }
      });
    };

    const onPointerUp = () => {
      const drag = dragKeyRef.current;
      if (!drag.active) return;
      dragKeyRef.current = { active: false, uuid: '', group: '', axis: '', index: -1, left: 0, width: 0 };
      if (dragRafRef.current.rafId) {
        window.cancelAnimationFrame(dragRafRef.current.rafId);
        dragRafRef.current.rafId = 0;
      }
      dragRafRef.current.pending = null;
      setDragHud((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      setTracks((prev) => {
        const track = withTrackDefaults(prev[drag.uuid]);
        return {
          ...prev,
          [drag.uuid]: {
            ...track,
            [drag.group]: {
              ...track[drag.group],
              [drag.axis]: sortFrames(track[drag.group][drag.axis])
            }
          }
        };
      });
      const selectedObject = editor.selected;
      if (selectedObject && selectedObject !== editor.scene) {
        editor.signals.objectChanged.dispatch(selectedObject);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (dragRafRef.current.rafId) {
        window.cancelAnimationFrame(dragRafRef.current.rafId);
        dragRafRef.current.rafId = 0;
      }
      dragRafRef.current.pending = null;
    };
  }, [duration, rotationUnit]);

  useEffect(() => {
    if (!selectedKey) return;
    if (dragKeyRef.current.active) return;
    const host = lanesRef.current;
    if (!host) return;
    const keyNode = host.querySelector(`[data-key-id="${getKeyId(selectedKey.uuid, selectedKey.group, selectedKey.axis, selectedKey.index)}"]`);
    if (keyNode instanceof HTMLElement) {
      keyNode.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [selectedKey, timelineContentWidth]);

  useEffect(() => {
    const host = lanesRef.current;
    if (!host) return;

    const syncLeft = Math.max(0, horizontalScroll);
    scrollSyncRef.current = true;
    if (rulerScrollRef.current && Math.abs(rulerScrollRef.current.scrollLeft - syncLeft) > 1) {
      rulerScrollRef.current.scrollLeft = syncLeft;
    }
    const tracksEls = host.querySelectorAll('.timeline-axis-track');
    tracksEls.forEach((el) => {
      if (Math.abs(el.scrollLeft - syncLeft) > 1) {
        el.scrollLeft = syncLeft;
      }
    });
    scrollSyncRef.current = false;
  }, [horizontalScroll, filteredObjects, timelineContentWidth]);

  const onResizeGripPointerDown = (event) => {
    if (event.button !== 0 || collapsed) return;
    event.preventDefault();
    resizeRef.current = { active: true, startY: event.clientY, startHeight: height };
  };

  const setLaneEasing = (uuid, group, axis, easingValue) => {
    setTracks((prev) => {
      const track = withTrackDefaults(prev[uuid]);
      return {
        ...prev,
        [uuid]: {
          ...track,
          [group]: {
            ...track[group],
            easing: {
              ...track[group].easing,
              [axis]: easingValue
            }
          }
        }
      };
    });
  };

  const addTransformKey = (uuid, group, axis) => {
    const object = editor.objectByUuid(uuid);
    if (!object) return;
    const value = object[TRACK_GROUPS.find((entry) => entry.id === group)?.target]?.[axis];
    if (!Number.isFinite(value)) return;
    const clampedTime = Math.max(0, Math.min(duration, currentTime));

    setTracks((prev) => {
      const track = withTrackDefaults(prev[uuid]);
      return {
        ...prev,
        [uuid]: {
          ...track,
          [group]: {
            ...track[group],
            [axis]: upsertKeyframe(track[group][axis], clampedTime, value)
          }
        }
      };
    });
  };

  const addTransformKeyBlock = (uuid, group) => {
    const object = editor.objectByUuid(uuid);
    if (!object) return;
    const target = TRACK_GROUPS.find((entry) => entry.id === group)?.target;
    if (!target || !object[target]) return;
    const clampedTime = Math.max(0, Math.min(duration, currentTime));
    setTracks((prev) => {
      const track = withTrackDefaults(prev[uuid]);
      return {
        ...prev,
        [uuid]: {
          ...track,
          [group]: {
            ...track[group],
            x: upsertKeyframe(track[group].x, clampedTime, object[target].x),
            y: upsertKeyframe(track[group].y, clampedTime, object[target].y),
            z: upsertKeyframe(track[group].z, clampedTime, object[target].z)
          }
        }
      };
    });
  };

  const addAllTransformKeyBlocks = (uuid) => {
    for (const group of TRACK_GROUPS) {
      addTransformKeyBlock(uuid, group.id);
    }
  };

  const addFromSelectedBlock = () => {
    if (!selected || selected === editor.scene) return;
    addAllTransformKeyBlocks(selected.uuid);
  };

  const deleteKey = (uuid, group, axis, index) => {
    setTracks((prev) => {
      const track = withTrackDefaults(prev[uuid]);
      return {
        ...prev,
        [uuid]: {
          ...track,
          [group]: {
            ...track[group],
            [axis]: removeKeyframe(track[group][axis], index)
          }
        }
      };
    });
  };

  const jumpToKey = (time) => {
    const clamped = Math.max(0, Math.min(duration, Number(time) || 0));
    setCurrentTime(clamped);
  };

  const seekFromTrackPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    setCurrentTime(round3(ratio * duration));
  };

  const onHorizontalScroll = (event) => {
    if (scrollSyncRef.current) return;
    setHorizontalScroll(event.currentTarget.scrollLeft);
  };

  const startDragKey = (event, uuid, group, axis, index) => {
    event.preventDefault();
    event.stopPropagation();
    const trackElement = event.currentTarget.closest('.timeline-axis-track-content');
    if (!trackElement) return;
    const rect = trackElement.getBoundingClientRect();
    dragKeyRef.current = {
      active: true,
      uuid,
      group,
      axis,
      index,
      left: rect.left,
      width: rect.width
    };

    const track = withTrackDefaults(tracksRef.current[uuid]);
    const entry = track[group][axis][index];
    const overlayRect = overlayRef.current?.getBoundingClientRect();
    if (overlayRect) {
      setDragHud({
        visible: true,
        x: clamp(event.clientX - overlayRect.left + 12, 8, overlayRect.width - 140),
        y: clamp(event.clientY - overlayRect.top - 28, 8, overlayRect.height - 24),
        text: `${entry ? round3(entry.t) : round3(currentTime)}s | ${entry ? formatKeyValue(group, entry.v, rotationUnit) : '-'}`
      });
    }
  };

  useEffect(() => {
    const t = Math.max(0, Math.min(duration, currentTime));
    let hasChanges = false;
    for (const [uuid, data] of Object.entries(tracks)) {
      const object = editor.objectByUuid(uuid);
      if (!object) continue;
      const track = withTrackDefaults(data);

      let changed = false;
      for (const group of TRACK_GROUPS) {
        const target = object[group.target];
        if (!target) continue;
        const groupTrack = track[group.id];
        for (const axis of AXES) {
          const sampled = sampleTrack(groupTrack[axis], t, groupTrack.easing[axis]);
          if (sampled === null || target[axis] === sampled) continue;
          target[axis] = sampled;
          changed = true;
        }
      }

      if (changed) {
        hasChanges = true;
        object.updateMatrixWorld();
      }
    }
    if (hasChanges && selected && !dragKeyRef.current.active) {
      editor.signals.objectChanged.dispatch(selected);
    }
  }, [currentTime, duration, tracks, editor, selected]);

  const generateScripts = () => {
    let generated = 0;

    for (const [uuid, trackData] of Object.entries(tracks)) {
      const track = withTrackDefaults(trackData);
      const hasKeys = TRACK_GROUPS.some((group) => AXES.some((axis) => track[group.id][axis].length > 0));
      if (!hasKeys) continue;

      const object = editor.objectByUuid(uuid);
      if (!object) continue;

      const source = makeTimelineScriptSource(track);
      const objectScripts = editor.scripts[uuid] || [];
      const existing = objectScripts.find((script) => script.name === 'timeline_auto');

      if (!existing) {
        editor.execute(
          new AddScriptCommand(editor, object, {
            name: 'timeline_auto',
            source
          })
        );
      } else if (existing.source !== source) {
        editor.execute(new SetScriptValueCommand(editor, object, existing, 'source', source));
      }

      generated += 1;
    }

    window.alert(generated > 0 ? `Timeline scripts generated for ${generated} object(s).` : 'No keyframes to generate.');
  };

  const lanesPane = () => (
    <div className="timeline-lanes" ref={lanesRef}>
      <div className="timeline-lanes-list">
        {filteredObjects.map((object) => {
          const track = withTrackDefaults(tracks[object.uuid]);
          return (
            <div className="timeline-lane" key={object.uuid}>
              <div className="timeline-lane-title-row">
                <div className="timeline-lane-title">{object.name}</div>
                <ButtonComponent iconCss="e-icons e-plus" content="Add PRS" onClick={() => addAllTransformKeyBlocks(object.uuid)} />
              </div>

              {TRACK_GROUPS.map((group) => (
                <div className="timeline-track-group" key={`${object.uuid}-${group.id}`}>
                  <div className="timeline-track-group-title">
                    {group.label}
                    {group.id === 'rotation' ? ` (${rotationUnit})` : ''}
                  </div>
                  {AXES.map((axis) => (
                    <div className="timeline-axis-row" key={`${object.uuid}-${group.id}-${axis}`}>
                      <ButtonComponent cssClass="timeline-key-add" iconCss="e-icons e-plus" content={`${group.prefix}.${axis}`} onClick={() => addTransformKey(object.uuid, group.id, axis)} />
                      <DropDownListComponent
                        cssClass="timeline-ease-ddl"
                        dataSource={EASING_OPTIONS}
                        fields={{ text: 'text', value: 'id' }}
                        value={track[group.id].easing[axis]}
                        change={(args) => setLaneEasing(object.uuid, group.id, axis, String(args.value || 'linear'))}
                      />
                      <div className="timeline-axis-track" onScroll={onHorizontalScroll}>
                        <div className="timeline-axis-track-content" style={{ width: `${timelineContentWidth}px` }} onPointerDown={seekFromTrackPointer}>
                          <div className="timeline-axis-name">{group.prefix}.{axis}</div>
                          <div className="timeline-playhead" style={{ left: `${currentPx}px` }} />
                          {(track[group.id][axis] || []).map((entry, index) => {
                            const left = entry.t * pixelsPerSecond;
                            return (
                              <button
                                type="button"
                                tabIndex={-1}
                                className={`timeline-key-dot${
                                  selectedKey?.uuid === object.uuid &&
                                  selectedKey?.group === group.id &&
                                  selectedKey?.axis === axis &&
                                  selectedKey?.index === index
                                    ? ' selected'
                                    : ''
                                }`}
                                title={`${entry.t}s | ${formatKeyValue(group.id, entry.v, rotationUnit)}`}
                                key={`${object.uuid}-${group.id}-${axis}-${index}`}
                                data-key-id={getKeyId(object.uuid, group.id, axis, index)}
                                style={{ left: `${left}px` }}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedKey({ uuid: object.uuid, group: group.id, axis, index });
                                  jumpToKey(entry.t);
                                }}
                                onPointerDown={(event) => {
                                  setSelectedKey({ uuid: object.uuid, group: group.id, axis, index });
                                  startDragKey(event, object.uuid, group.id, axis, index);
                                }}
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  if (
                                    selectedKey?.uuid === object.uuid &&
                                    selectedKey?.group === group.id &&
                                    selectedKey?.axis === axis &&
                                    selectedKey?.index === index
                                  ) {
                                    setSelectedKey(null);
                                  }
                                  deleteKey(object.uuid, group.id, axis, index);
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}

        {filteredObjects.length === 0 && (
          <div className="timeline-empty-state">
            Sin resultados. Se muestran solo el objeto seleccionado y los que ya tienen keyframes.
          </div>
        )}
      </div>
    </div>
  );

  const optionsPane = () => (
    <aside className="timeline-options">
      <h4>Options</h4>
      <p>Tracks: position, rotation and scale. Double click a keyframe to delete.</p>
      <div className="timeline-options-actions">
        <ButtonComponent iconCss="e-icons e-plus" content="Add Key (Selected PRS)" onClick={addFromSelectedBlock} disabled={!selected || selected === editor.scene} />
        <ButtonComponent iconCss="e-icons e-check" content="Generate Script" onClick={generateScripts} />
      </div>
    </aside>
  );

  return (
    <section ref={overlayRef} className={`timeline-overlay${collapsed ? ' collapsed' : ''}`} style={{ height: collapsed ? 38 : `${height}px` }}>
      {!collapsed && <div className="timeline-resize-grip" onPointerDown={onResizeGripPointerDown} title="Resize timeline" />}

      <header className="timeline-header">
        <div className="timeline-header-primary">
          <div className="timeline-header-left">
            <ButtonComponent iconCss={`e-icons ${collapsed ? 'e-chevron-up' : 'e-chevron-down'}`} content={collapsed ? 'Show Timeline' : 'Hide Timeline'} onClick={() => setCollapsed((value) => !value)} />
            <ButtonComponent iconCss={`e-icons ${isPlaying ? 'e-pause' : 'e-play'}`} content={isPlaying ? 'Stop' : 'Play'} onClick={() => setIsPlaying((prev) => !prev)} />
            <ButtonComponent iconCss="e-icons e-rewind" content="Reset" onClick={() => { setIsPlaying(false); setCurrentTime(0); }} />
            <ButtonComponent iconCss={`e-icons ${loop ? 'e-check' : 'e-stop'}`} content={loop ? 'Loop On' : 'Loop Off'} onClick={() => setLoop((prev) => !prev)} />
            <ButtonComponent
              iconCss="e-icons e-rotation"
              content={`Rot UI: ${rotationUnit.toUpperCase()}`}
              onClick={() => setRotationUnit((prev) => (prev === 'rad' ? 'deg' : 'rad'))}
            />
            <ButtonComponent iconCss="e-icons e-plus" content="Add Key (Selected PRS)" onClick={addFromSelectedBlock} disabled={!selected || selected === editor.scene} />
            <ButtonComponent iconCss="e-icons e-check" content="Generate Script" onClick={generateScripts} />
            <TextBoxComponent
              cssClass="timeline-header-search"
              placeholder="Buscar objeto..."
              value={search}
              change={(args) => setSearch(String(args.value ?? ''))}
            />
          </div>

          {!collapsed && (
            <div className="timeline-header-right">
              <div className="timeline-status-group">
                <span className={`timeline-status-pill ${isPlaying ? 'active' : ''}${isAtEnd ? ' end' : ''}`}>{isAtEnd ? 'END' : 'PLAYING'}</span>
                <span className={`timeline-status-pill ${loop ? 'active loop' : ''}`}>LOOP</span>
              </div>
              <label>
                Time
                <NumericTextBoxComponent value={currentTime} min={0} max={duration} step={0.1} change={(args) => setCurrentTime(Number(args.value ?? 0))} />
              </label>
              <label>
                Duration
                <NumericTextBoxComponent
                  value={duration}
                  min={1}
                  step={0.5}
                  change={(args) => {
                    const next = Math.max(1, Number(args.value ?? 10));
                    setDuration(next);
                    setCurrentTime((value) => Math.min(next, value));
                  }}
                />
              </label>
              <label>
                Zoom
                <NumericTextBoxComponent value={zoom} min={0.5} max={4} step={0.1} format="n1" change={(args) => setZoom(clamp(Number(args.value ?? 1), 0.5, 4))} />
              </label>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="timeline-header-secondary">
            <div className="timeline-ruler">
              <div ref={rulerScrollRef} className="timeline-ruler-track" onScroll={onHorizontalScroll}>
                <div className="timeline-ruler-content" style={{ width: `${rulerContentWidth}px` }} onPointerDown={seekFromTrackPointer}>
                  {timeMarks.map((mark) => {
                    const left = TIMELINE_RULER_OFFSET_PX + mark * pixelsPerSecond;
                    return (
                      <div className="timeline-ruler-mark" key={`mark-${mark}`} style={{ left: `${left}px` }}>
                        <span>{mark}s</span>
                      </div>
                    );
                  })}
                  <div className="timeline-playhead" style={{ left: `${TIMELINE_RULER_OFFSET_PX + currentPx}px` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {!collapsed && (
        <div className="timeline-body">
          <SplitterComponent
            ref={splitterRef}
            cssClass="timeline-splitter"
            orientation="Horizontal"
            width="100%"
            height="100%"
            separatorSize={6}
            resizeStop={(args) => {
              if (Array.isArray(args?.paneSize) && Number.isFinite(args.paneSize[1])) {
                const maxWidth = Math.max(180, rightDockWidth);
                setOptionsWidth(Math.min(Math.round(args.paneSize[1]), maxWidth));
              }
            }}
            collapsed={(args) => {
              const paneIndex = Number.isFinite(args?.paneIndex) ? args.paneIndex : Array.isArray(args?.index) ? args.index[0] : -1;
              if (paneIndex === 1) setOptionsCollapsed(true);
            }}
            expanded={(args) => {
              const paneIndex = Number.isFinite(args?.paneIndex) ? args.paneIndex : Array.isArray(args?.index) ? args.index[0] : -1;
              if (paneIndex === 1) setOptionsCollapsed(false);
            }}
          >
            <PanesDirective>
              <PaneDirective min="260px" content={lanesPane} />
              <PaneDirective size={`${optionsWidth}px`} min="180px" max={`${Math.max(180, rightDockWidth)}px`} collapsible={true} collapsed={optionsCollapsed} content={optionsPane} />
            </PanesDirective>
          </SplitterComponent>
        </div>
      )}

      {!collapsed && dragHud.visible && <div className="timeline-drag-hud" style={{ left: `${dragHud.x}px`, top: `${dragHud.y}px` }}>{dragHud.text}</div>}
    </section>
  );
}
