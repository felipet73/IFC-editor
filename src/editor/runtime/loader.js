import * as THREE from 'three';
import { AddObjectCommand } from '../legacy/core/commands/AddObjectCommand.js';

function getExtension(filename) {
  const index = filename.lastIndexOf('.');
  if (index < 0) return '';
  return filename.slice(index + 1).toLowerCase();
}

function getBaseName(filename) {
  const index = filename.lastIndexOf('.');
  if (index < 0) return filename;
  return filename.slice(0, index);
}

function addImportedObject(editor, object, filename) {
  if (!object) return;
  if (!object.name || object.name.length === 0) {
    object.name = getBaseName(filename) || 'ImportedObject';
  }
  editor.execute(new AddObjectCommand(editor, object));
}

async function parseJson(editor, file) {
  const json = JSON.parse(await file.text());

  if (json && json.scene && json.camera) {
    editor.clear();
    await editor.fromJSON(json);
    return;
  }

  const loader = new THREE.ObjectLoader();
  const object = loader.parse(json);
  addImportedObject(editor, object, file.name);
}

async function parseObj(editor, file) {
  const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
  const loader = new OBJLoader();
  const object = loader.parse(await file.text());
  addImportedObject(editor, object, file.name);
}

async function parseStl(editor, file) {
  const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
  const loader = new STLLoader();
  const geometry = loader.parse(await file.arrayBuffer());
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: 0xb8c7d9 });
  const mesh = new THREE.Mesh(geometry, material);
  addImportedObject(editor, mesh, file.name);
}

async function parsePly(editor, file) {
  const { PLYLoader } = await import('three/addons/loaders/PLYLoader.js');
  const loader = new PLYLoader();
  const geometry = loader.parse(await file.arrayBuffer());
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: 0xb8c7d9 });
  const mesh = new THREE.Mesh(geometry, material);
  addImportedObject(editor, mesh, file.name);
}

async function parseGltfFamily(editor, file) {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  const url = URL.createObjectURL(file);

  try {
    const gltf = await loader.loadAsync(url);
    const object = gltf.scene || gltf.scenes?.[0];
    addImportedObject(editor, object, file.name);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function parseFbx(editor, file) {
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const loader = new FBXLoader();
  const object = loader.parse(await file.arrayBuffer(), '');
  addImportedObject(editor, object, file.name);
}

async function importFile(editor, file) {
  const extension = getExtension(file.name);

  if (extension === 'json') {
    await parseJson(editor, file);
    return;
  }

  if (extension === 'obj') {
    await parseObj(editor, file);
    return;
  }

  if (extension === 'stl') {
    await parseStl(editor, file);
    return;
  }

  if (extension === 'ply') {
    await parsePly(editor, file);
    return;
  }

  if (extension === 'glb' || extension === 'gltf') {
    await parseGltfFamily(editor, file);
    return;
  }

  if (extension === 'fbx') {
    await parseFbx(editor, file);
    return;
  }

  throw new Error(`Unsupported format: .${extension || '(none)'}`);
}

export function createEditorLoader(editor) {
  return {
    async loadFiles(fileList) {
      const files = Array.from(fileList || []);
      for (const file of files) {
        try {
          await importFile(editor, file);
        } catch (error) {
          console.error(error);
          window.alert(`Failed to import ${file.name}. ${error.message}`);
        }
      }
    },

    async loadItemList(itemList) {
      const files = [];
      for (const item of Array.from(itemList || [])) {
        if (item.kind !== 'file') continue;
        const file = item.getAsFile();
        if (file) files.push(file);
      }
      await this.loadFiles(files);
    }
  };
}
