import { useEffect, useMemo, useState } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TextBoxComponent, TextAreaComponent } from '@syncfusion/ej2-react-inputs';
import { AddScriptCommand } from '../../editor/legacy/core/commands/AddScriptCommand.js';
import { RemoveScriptCommand } from '../../editor/legacy/core/commands/RemoveScriptCommand.js';
import { SetScriptValueCommand } from '../../editor/legacy/core/commands/SetScriptValueCommand.js';
import { formatScriptErrors, validateScriptSource } from '../../editor/runtime/scriptDiagnostics.js';

export function ScriptSection({ editor, selected }) {
  const [revision, setRevision] = useState(0);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [sourceDraft, setSourceDraft] = useState('');
  const [sourceError, setSourceError] = useState('');

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    editor.signals.scriptAdded.add(bump);
    editor.signals.scriptRemoved.add(bump);
    editor.signals.scriptChanged.add(bump);
    editor.signals.objectSelected.add(bump);

    return () => {
      editor.signals.scriptAdded.remove(bump);
      editor.signals.scriptRemoved.remove(bump);
      editor.signals.scriptChanged.remove(bump);
      editor.signals.objectSelected.remove(bump);
    };
  }, [editor]);

  const scripts = useMemo(() => {
    if (!selected) return [];
    return editor.scripts[selected.uuid] ?? [];
  }, [editor, selected, revision]);

  const canEditScripts = !!selected && selected !== editor.camera;

  const addScript = () => {
    if (!canEditScripts) return;
    const script = {
      name: 'startup',
      source: 'function init() {\n\n}\n\nfunction update( event ) {\n\n}\n'
    };
    editor.execute(new AddScriptCommand(editor, selected, script));
  };

  const removeScript = (script) => {
    if (!canEditScripts) return;
    if (!window.confirm('Remove this script?')) return;
    editor.execute(new RemoveScriptCommand(editor, selected, script));
    setEditingIndex(-1);
  };

  const openEditor = (index) => {
    const script = scripts[index];
    if (!script) return;
    setEditingIndex(index);
    setSourceDraft(script.source || '');
    setSourceError('');
  };

  const saveEditor = () => {
    const script = scripts[editingIndex];
    if (!script) return;

    const diagnostics = validateScriptSource(sourceDraft);
    if (!diagnostics.ok) {
      setSourceError(formatScriptErrors(diagnostics.errors));
      return;
    }

    if (sourceDraft !== script.source) {
      editor.execute(new SetScriptValueCommand(editor, selected, script, 'source', sourceDraft));
    }

    setEditingIndex(-1);
    setSourceError('');
  };

  if (!canEditScripts) {
    return (
      <section className="sidebar-section script-syncfusion">
        <h2>Scripts</h2>
        <p>Select a scene object to edit scripts.</p>
      </section>
    );
  }

  return (
    <section className="sidebar-section script-syncfusion">
      <h2>Scripts</h2>

      <ButtonComponent iconCss="e-icons e-plus" content="New Script" onClick={addScript} />

      {scripts.length === 0 && <p>No scripts attached.</p>}

      {scripts.map((script, index) => (
        <div className="script-row" key={index}>
          <TextBoxComponent
            value={script.name ?? ''}
            input={(args) => {
              editor.execute(new SetScriptValueCommand(editor, selected, script, 'name', String(args.value ?? '')));
            }}
          />
          <ButtonComponent iconCss="e-icons e-edit" content="Edit" onClick={() => openEditor(index)} />
          <ButtonComponent iconCss="e-icons e-delete" content="Remove" onClick={() => removeScript(script)} />
        </div>
      ))}

      {editingIndex >= 0 && (
        <div className="script-modal-backdrop">
          <div className="script-modal">
            <h3>Script Editor</h3>
            <TextAreaComponent
              rows={14}
              value={sourceDraft}
              input={(args) => {
                const next = String(args.value ?? '');
                setSourceDraft(next);
                const diagnostics = validateScriptSource(next);
                setSourceError(diagnostics.ok ? '' : formatScriptErrors(diagnostics.errors));
              }}
            />
            {sourceError && <small className="inline-error">{sourceError}</small>}
            <div className="script-modal-actions">
              <ButtonComponent iconCss="e-icons e-check" content="Save" onClick={saveEditor} />
              <ButtonComponent iconCss="e-icons e-close" content="Cancel" onClick={() => setEditingIndex(-1)} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
