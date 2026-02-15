function getSceneAnimations(scene) {
  const animations = [];
  scene.traverse((object) => {
    if (Array.isArray(object.animations)) {
      animations.push(...object.animations);
    }
  });
  return animations;
}

async function exportGltf(editor, binary) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter();

  const optimizedAnimations = getSceneAnimations(editor.scene).map((clip) => clip.clone().optimize());

  const result = await new Promise((resolve, reject) => {
    exporter.parse(
      editor.scene,
      resolve,
      reject,
      { binary, animations: optimizedAnimations }
    );
  });

  if (binary) {
    editor.utils.saveArrayBuffer(result, 'scene.glb');
  } else {
    editor.utils.saveString(JSON.stringify(result, null, 2), 'scene.gltf');
  }
}

async function exportObj(editor) {
  if (!editor.selected) {
    window.alert('Select an object to export OBJ.');
    return;
  }

  const { OBJExporter } = await import('three/addons/exporters/OBJExporter.js');
  const exporter = new OBJExporter();
  editor.utils.saveString(exporter.parse(editor.selected), 'model.obj');
}

async function exportDrc(editor) {
  const object = editor.selected;

  if (!object || object.isMesh !== true) {
    window.alert('Select a mesh to export DRC.');
    return;
  }

  const { DRACOExporter } = await import('three/addons/exporters/DRACOExporter.js');
  const exporter = new DRACOExporter();

  const options = {
    decodeSpeed: 5,
    encodeSpeed: 5,
    encoderMethod: DRACOExporter.MESH_EDGEBREAKER_ENCODING,
    quantization: [16, 8, 8, 8, 8],
    exportUvs: true,
    exportNormals: true,
    exportColor: !!object.geometry?.hasAttribute?.('color')
  };

  const result = exporter.parse(object, options);
  editor.utils.saveArrayBuffer(result, 'model.drc');
}

async function exportUsdz(editor) {
  const { USDZExporter } = await import('three/addons/exporters/USDZExporter.js');
  const exporter = new USDZExporter();
  const result = await exporter.parseAsync(editor.scene);
  editor.utils.saveArrayBuffer(result, 'scene.usdz');
}

async function exportStl(editor, binary) {
  const { STLExporter } = await import('three/addons/exporters/STLExporter.js');
  const exporter = new STLExporter();
  const result = exporter.parse(editor.scene, { binary });

  if (binary) {
    editor.utils.saveArrayBuffer(result, 'scene-binary.stl');
  } else {
    editor.utils.saveString(result, 'scene.stl');
  }
}

async function exportPly(editor, binary) {
  const { PLYExporter } = await import('three/addons/exporters/PLYExporter.js');
  const exporter = new PLYExporter();

  const result = await new Promise((resolve) => {
    exporter.parse(editor.scene, resolve, { binary });
  });

  if (binary) {
    editor.utils.saveArrayBuffer(result, 'scene-binary.ply');
  } else {
    editor.utils.saveString(result, 'scene.ply');
  }
}

export function createEditorExporter(editor) {
  return {
    async exportByFormat(format) {
      try {
        if (format === 'glb') {
          await exportGltf(editor, true);
          return;
        }

        if (format === 'gltf') {
          await exportGltf(editor, false);
          return;
        }

        if (format === 'obj') {
          await exportObj(editor);
          return;
        }

        if (format === 'drc') {
          await exportDrc(editor);
          return;
        }

        if (format === 'stl') {
          await exportStl(editor, false);
          return;
        }

        if (format === 'stl-binary') {
          await exportStl(editor, true);
          return;
        }

        if (format === 'ply') {
          await exportPly(editor, false);
          return;
        }

        if (format === 'ply-binary') {
          await exportPly(editor, true);
          return;
        }

        if (format === 'usdz') {
          await exportUsdz(editor);
          return;
        }

        throw new Error(`Unsupported export format: ${format}`);
      } catch (error) {
        console.error(error);
        window.alert(`Export failed. ${error.message}`);
      }
    }
  };
}
