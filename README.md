# Editor React (Migracion inicial)

Proyecto independiente para migrar `editor/` (vanilla JS) a React por fases.

## Estructura

- `src/editor/legacy/core`: Nucleo copiado desde `editor/js` (Editor, History, commands, etc.).
- `src/components/ViewportCanvas.jsx`: primer adaptador React usando el nucleo legacy.
- `src/App.jsx`: shell inicial de layout para migrar Sidebar/Menubar/Toolbar.

## Dependencias incluidas

- `three`
- `react`
- `react-dom`
- `vite`

No se agregaron aun dependencias pesadas del editor original (CodeMirror, pathtracer, ffmpeg, etc.).
Se agregaran a medida que migremos los modulos que realmente las usen.
