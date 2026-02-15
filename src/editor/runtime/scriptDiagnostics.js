function parseStackLine(error) {
  if (!error || !error.stack) return null;
  const match = error.stack.match(/<anonymous>:(\d+):(\d+)/);
  if (!match) return null;
  return { line: Math.max(1, Number(match[1]) - 1), column: Number(match[2]) };
}

function parseMessageLine(error) {
  if (!error || typeof error.message !== 'string') return null;

  const patterns = [
    /line\s+(\d+)/i,
    /at\s+line\s+(\d+)/i,
    /<anonymous>:(\d+):(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = error.message.match(pattern);
    if (!match) continue;

    if (match.length >= 3 && match[2]) {
      return { line: Number(match[1]), column: Number(match[2]) };
    }

    return { line: Number(match[1]), column: null };
  }

  return null;
}

export function validateScriptSource(source) {
  const text = String(source ?? '');

  try {
    // Syntax-only validation. Runtime errors are handled by player execution.
    // eslint-disable-next-line no-new-func
    new Function(text);
    return { ok: true, errors: [] };
  } catch (error) {
    const location = parseStackLine(error) || parseMessageLine(error);
    return {
      ok: false,
      errors: [
        {
          message: error.message || 'Invalid JavaScript source',
          line: location?.line ?? null,
          column: location?.column ?? null
        }
      ]
    };
  }
}

export function formatScriptErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return '';
  return errors.map((entry) => {
    if (entry.line != null && entry.column != null) {
      return `L${entry.line}:C${entry.column} ${entry.message}`;
    }

    if (entry.line != null) {
      return `L${entry.line} ${entry.message}`;
    }

    return entry.message;
  }).join('\n');
}
