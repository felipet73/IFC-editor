import { EditorAppBar } from './components/EditorAppBar.jsx';
import { EditorGeometryPanel } from './components/EditorGeometryPanel.jsx';
import { EditorHistoryPanel } from './components/EditorHistoryPanel.jsx';
import { EditorMenubar } from './components/EditorMenubar.jsx';
import { EditorMaterialPanel } from './components/EditorMaterialPanel.jsx';
import { EditorObjectPanel } from './components/EditorObjectPanel.jsx';
import { EditorPlayerOverlay } from './components/EditorPlayerOverlay.jsx';
import { EditorProjectOutputPanel } from './components/EditorProjectOutputPanel.jsx';
import { EditorProjectRendererPanel } from './components/EditorProjectRendererPanel.jsx';
import { EditorRightDock } from './components/EditorRightDock.jsx';
import { EditorScenePanel } from './components/EditorScenePanel.jsx';
import { EditorScriptsPanel } from './components/EditorScriptsPanel.jsx';
import { EditorToolbar } from './components/EditorToolbar.jsx';
import { EditorTimelineOverlay } from './components/EditorTimelineOverlay.jsx';
import { ViewportCanvas } from './components/ViewportCanvas.jsx';
import { useEditorRuntime } from './editor/runtime/useEditorRuntime.js';

export default function App() {
  const { editor, selected, historyVersion, sceneVersion, sceneGraphVersion, savingStatus, viewportVersion } = useEditorRuntime();

  return (
    <div className="app-shell">
      <EditorAppBar editor={editor} />
      <EditorMenubar editor={editor} selected={selected} historyVersion={historyVersion} savingStatus={savingStatus} />
      <main className="viewport">
        <EditorToolbar editor={editor} />
        <EditorProjectOutputPanel editor={editor} />
        <EditorProjectRendererPanel editor={editor} />
        <EditorRightDock editor={editor} sceneGraphVersion={sceneGraphVersion} />
        <EditorScenePanel editor={editor} sceneVersion={sceneVersion} />
        <EditorObjectPanel editor={editor} selected={selected} />
        <EditorMaterialPanel editor={editor} selected={selected} />
        <EditorGeometryPanel editor={editor} selected={selected} />
        <EditorHistoryPanel editor={editor} historyVersion={historyVersion} />
        <EditorScriptsPanel editor={editor} selected={selected} />
        <EditorTimelineOverlay editor={editor} selected={selected} sceneVersion={sceneVersion} />
        <ViewportCanvas key={viewportVersion} editor={editor} />
        <EditorPlayerOverlay editor={editor} />
      </main>
    </div>
  );
}
