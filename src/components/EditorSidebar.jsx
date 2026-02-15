import { HistorySettingsSection } from './sidebar/HistorySettingsSection.jsx';
import { ProjectRendererSection } from './sidebar/ProjectRendererSection.jsx';
import { ProjectToolsSection } from './sidebar/ProjectToolsSection.jsx';
import { ScriptSection } from './sidebar/ScriptSection.jsx';

export function EditorSidebar({ editor, selected, historyVersion }) {
  return (
    <aside className="editor-sidebar">
      <ProjectRendererSection editor={editor} />
      <ProjectToolsSection editor={editor} />
      <HistorySettingsSection editor={editor} historyVersion={historyVersion} />
      <ScriptSection editor={editor} selected={selected} />
    </aside>
  );
}
