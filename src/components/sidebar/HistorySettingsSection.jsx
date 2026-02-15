import { useEffect, useMemo, useState } from 'react';
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';

export function HistorySettingsSection({ editor, historyVersion }) {
  const _historyVersion = historyVersion;
  const [persistent, setPersistent] = useState(!!editor.config.getKey('settings/history'));
  const [selectedId, setSelectedId] = useState(null);
  const [shortcuts, setShortcuts] = useState({
    translate: (editor.config.getKey('settings/shortcuts/translate') || 'w').toLowerCase(),
    rotate: (editor.config.getKey('settings/shortcuts/rotate') || 'e').toLowerCase(),
    scale: (editor.config.getKey('settings/shortcuts/scale') || 'r').toLowerCase(),
    undo: (editor.config.getKey('settings/shortcuts/undo') || 'z').toLowerCase(),
    focus: (editor.config.getKey('settings/shortcuts/focus') || 'f').toLowerCase()
  });

  useEffect(() => {
    const onHistoryChanged = (cmd) => {
      if (cmd && Number.isFinite(cmd.id)) {
        setSelectedId(cmd.id);
        return;
      }

      const lastUndo = editor.history.undos[editor.history.undos.length - 1];
      setSelectedId(lastUndo?.id ?? null);
    };

    editor.signals.historyChanged.add(onHistoryChanged);
    onHistoryChanged();

    return () => {
      editor.signals.historyChanged.remove(onHistoryChanged);
    };
  }, [editor]);

  const entries = useMemo(() => {
    const undos = editor.history.undos.map((cmd) => ({
      id: cmd.id,
      name: cmd.name || cmd.type,
      isRedo: false
    }));

    const redos = [...editor.history.redos].reverse().map((cmd) => ({
      id: cmd.id,
      name: cmd.name || cmd.type,
      isRedo: true
    }));

    return [...undos, ...redos];
  }, [editor, _historyVersion]);

  const onPersistentChange = (checked) => {
    const value = !!checked;
    setPersistent(value);
    editor.config.setKey('settings/history', value);

    if (value) {
      window.alert('Persistent history enabled. Existing commands are being serialized.');
      const lastUndo = editor.history.undos[editor.history.undos.length - 1];
      editor.history.enableSerialization(lastUndo?.id ?? 0);
    } else {
      editor.signals.historyChanged.dispatch();
    }
  };

  const isValidShortcut = (value) => /^[a-z0-9]$/i.test(value);

  const applyShortcut = (name, rawValue) => {
    const value = (rawValue || '').toLowerCase();
    if (!isValidShortcut(value)) return false;

    setShortcuts((prev) => ({ ...prev, [name]: value }));
    editor.config.setKey(`settings/shortcuts/${name}`, value);
    return true;
  };

  const goToCommand = (entry) => {
    editor.history.goToState(entry.id);
  };

  const clearHistory = () => {
    if (!window.confirm('Clear history?')) return;
    editor.history.clear();
  };

  return (
    <section className="sidebar-section history-syncfusion" data-history={_historyVersion}>
      <h2>Settings / History</h2>

      <label className="toggle-row">
        <CheckBoxComponent checked={persistent} change={(args) => onPersistentChange(args.checked)} label="Persistent" />
      </label>

      <fieldset>
        <legend>Shortcuts</legend>
        {[
          ['translate', 'Translate'],
          ['rotate', 'Rotate'],
          ['scale', 'Scale'],
          ['undo', 'Undo'],
          ['focus', 'Focus']
        ].map(([key, label]) => (
          <div className="shortcut-row" key={key}>
            <span>{label}</span>
            <TextBoxComponent
              value={shortcuts[key]}
              htmlAttributes={{ maxLength: 1 }}
              input={(args) => {
                const char = String(args.value ?? '').slice(-1).toLowerCase();
                setShortcuts((prev) => ({ ...prev, [key]: char }));
              }}
              blur={() => {
                const ok = applyShortcut(key, shortcuts[key]);
                if (!ok) {
                  setShortcuts((prev) => ({
                    ...prev,
                    [key]: (editor.config.getKey(`settings/shortcuts/${key}`) || shortcuts[key]).toLowerCase()
                  }));
                }
              }}
            />
          </div>
        ))}
      </fieldset>

      <div className="history-list">
        {entries.map((entry) => (
          <ButtonComponent
            key={`${entry.id}-${entry.isRedo ? 'redo' : 'undo'}`}
            cssClass={`history-item ${selectedId === entry.id ? 'selected' : ''} ${entry.isRedo ? 'redo' : ''}`}
            content={entry.name}
            onClick={() => goToCommand(entry)}
          />
        ))}
        {entries.length === 0 && <div className="history-empty">No history yet.</div>}
      </div>

      <ButtonComponent iconCss="e-icons e-delete" content="Clear" onClick={clearHistory} />
    </section>
  );
}
