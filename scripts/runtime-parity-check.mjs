import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { PLYExporter } from 'three/addons/exporters/PLYExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const ROOT = process.cwd();
const TEMPLATES_DIR = path.join(ROOT, 'public', 'new-templates');
const REPORT_PATH = path.join(ROOT, 'runtime-parity-report.md');
const PUBLISHER_PATH = path.join(ROOT, 'src', 'editor', 'runtime', 'publisher.js');
const EXPORTER_PATH = path.join(ROOT, 'src', 'editor', 'runtime', 'exporter.js');
const VIDEO_PIPELINE_PATH = path.join(ROOT, 'src', 'editor', 'runtime', 'videoPipeline.js');
const SCRIPT_DIAGNOSTICS_PATH = path.join(ROOT, 'src', 'editor', 'runtime', 'scriptDiagnostics.js');
const REPO_ROOT = path.resolve(ROOT, '..');
const FIXTURES_ROOT = path.join(REPO_ROOT, 'examples', 'models');

const SUPPORTED_EVENTS = ['init', 'start', 'stop', 'keydown', 'keyup', 'pointerdown', 'pointerup', 'pointermove', 'update'];

if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
}

if (typeof globalThis.cancelAnimationFrame !== 'function') {
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

function yesNo(value) {
  return value ? 'PASS' : 'FAIL';
}

function buildScriptReturnExpression() {
  return `{ ${SUPPORTED_EVENTS.map((name) => `${name}:${name}`).join(', ')} }`;
}

function compileScriptOnObject({ object, scene, camera, script }) {
  const params = ['player', 'renderer', 'scene', 'camera', 'THREE', ...SUPPORTED_EVENTS];
  const playerStub = {
    width: 1024,
    height: 768,
    setCamera: () => {},
    setScene: () => {},
    play: () => {},
    stop: () => {},
    render: () => {}
  };
  const args = [playerStub, {}, scene, camera, THREE, ...SUPPORTED_EVENTS.map(() => undefined)];

  // Mirrors app runtime execution where the script is evaluated immediately.
  // eslint-disable-next-line no-new-func
  const factory = new Function(...params, `${script.source}\nreturn ${buildScriptReturnExpression()};`);
  const handlers = factory.bind(object)(...args);

  for (const [name, handler] of Object.entries(handlers)) {
    if (handler === undefined) continue;
    if (!SUPPORTED_EVENTS.includes(name)) {
      throw new Error(`Unsupported event handler "${name}" in script "${script.name || 'unnamed'}".`);
    }

    if (typeof handler !== 'function') {
      throw new Error(`Handler "${name}" in script "${script.name || 'unnamed'}" is not a function.`);
    }
  }
}

function validatePublishContract(publisherSource) {
  const checks = [
    `app.json`,
    `index.html`,
    `editor.html`,
    `js/app.js`,
    `js/three.module.js`,
    `js/three.core.js`,
    `"three": "./js/three.module.js"`,
    `payloadKey`,
    `edit.href = './editor.html'`
  ];

  return checks.every((fragment) => publisherSource.includes(fragment));
}

function makeLoaderArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function countSceneMaterials(scene) {
  const seen = new Set();

  scene.traverse((object) => {
    const material = object.material;
    if (Array.isArray(material)) {
      for (const item of material) {
        if (item) seen.add(item.uuid);
      }
      return;
    }

    if (material) {
      seen.add(material.uuid);
    }
  });

  return seen.size;
}

async function parseGlbFixture(relativePath) {
  const fullPath = path.join(FIXTURES_ROOT, relativePath);
  const buffer = await fs.readFile(fullPath);
  const arrayBuffer = makeLoaderArrayBuffer(buffer);

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.parse(arrayBuffer, '', resolve, reject);
  });
}

async function parseFbxFixture(relativePath) {
  const fullPath = path.join(FIXTURES_ROOT, relativePath);
  const buffer = await fs.readFile(fullPath);
  const arrayBuffer = makeLoaderArrayBuffer(buffer);
  const loader = new FBXLoader();
  return loader.parse(arrayBuffer);
}

async function readJsonFixture(relativePath) {
  const fullPath = path.join(FIXTURES_ROOT, relativePath);
  return JSON.parse(await fs.readFile(fullPath, 'utf8'));
}

function toArrayBufferFromString(text) {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function countAnimationClips(scene) {
  let clips = 0;
  scene.traverse((object) => {
    if (Array.isArray(object.animations)) {
      clips += object.animations.length;
    }
  });
  return clips;
}

async function runExportChecks() {
  const exporterSource = await fs.readFile(EXPORTER_PATH, 'utf8');

  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.clearGroups();
  geometry.addGroup(0, 18, 0);
  geometry.addGroup(18, 18, 1);

  const materialA = new THREE.MeshStandardMaterial({ color: 0x3399ff, roughness: 0.15, metalness: 0.75 });
  const materialB = new THREE.MeshPhysicalMaterial({ color: 0xff8844, clearcoat: 0.8, transmission: 0.15, thickness: 0.12 });
  const mesh = new THREE.Mesh(geometry, [materialA, materialB]);
  mesh.name = 'ParityMesh';
  const positionTrack = new THREE.VectorKeyframeTrack('ParityMesh.position', [0, 1], [0, 0, 0, 1, 0, 0]);
  const animation = new THREE.AnimationClip('motion', 1, [positionTrack]);
  mesh.animations = [animation];
  scene.add(mesh);

  const objectLoader = new THREE.ObjectLoader();
  const sceneJson = scene.toJSON();
  const roundTripScene = objectLoader.parse(sceneJson);
  const roundTripMesh = roundTripScene.getObjectByName('ParityMesh');
  const roundTripMaterials = Array.isArray(roundTripMesh?.material) ? roundTripMesh.material.length : roundTripMesh?.material ? 1 : 0;
  const roundTripAnimationCount = countAnimationClips(roundTripScene);

  const plyExporter = new PLYExporter();
  const plyAsciiResult = await new Promise((resolve) => {
    plyExporter.parse(scene, resolve, { binary: false });
  });
  const plyBinaryResult = await new Promise((resolve) => {
    plyExporter.parse(scene, resolve, { binary: true });
  });

  const stlExporter = new STLExporter();
  const stlAsciiResult = stlExporter.parse(scene, { binary: false });
  const stlBinaryResult = stlExporter.parse(scene, { binary: true });

  const plyLoader = new PLYLoader();
  const stlLoader = new STLLoader();

  const plyAsciiGeometry = plyLoader.parse(toArrayBufferFromString(plyAsciiResult));
  const plyBinaryGeometry = plyLoader.parse(plyBinaryResult);
  const stlAsciiGeometry = stlLoader.parse(stlAsciiResult);
  const stlBinaryGeometry = stlLoader.parse(stlBinaryResult.buffer);

  const plyAsciiVertexCount = plyAsciiGeometry?.attributes?.position?.count || 0;
  const plyBinaryVertexCount = plyBinaryGeometry?.attributes?.position?.count || 0;
  const stlAsciiVertexCount = stlAsciiGeometry?.attributes?.position?.count || 0;
  const stlBinaryVertexCount = stlBinaryGeometry?.attributes?.position?.count || 0;

  return [
    {
      case: 'Export GLTF/GLB support contract',
      ok: exporterSource.includes('GLTFExporter') && exporterSource.includes('animations: optimizedAnimations') && exporterSource.includes("if (format === 'glb')") && exporterSource.includes("if (format === 'gltf')"),
      notes: 'Validated in exporter.js for Node-safe CI; browser runtime executes GLTFExporter.'
    },
    {
      case: 'Export animation source contract',
      ok: exporterSource.includes('getSceneAnimations') && exporterSource.includes('.optimize()'),
      notes: 'Animation clip collection/optimization is present before GLTF export.'
    },
    {
      case: 'Round-trip scene JSON (materials + animations)',
      ok: !!roundTripMesh && roundTripMaterials >= 2 && roundTripAnimationCount >= 1,
      notes: `materials=${roundTripMaterials}; animations=${roundTripAnimationCount}`
    },
    {
      case: 'Export PLY ASCII',
      ok: typeof plyAsciiResult === 'string' && plyAsciiResult.startsWith('ply'),
      notes: typeof plyAsciiResult === 'string' ? 'ASCII header ok' : 'Expected string output'
    },
    {
      case: 'Export PLY binary',
      ok: plyBinaryResult instanceof ArrayBuffer && plyBinaryResult.byteLength > 0,
      notes: plyBinaryResult instanceof ArrayBuffer ? `bytes=${plyBinaryResult.byteLength}` : 'Expected ArrayBuffer output'
    },
    {
      case: 'Round-trip PLY ASCII',
      ok: plyAsciiVertexCount > 0,
      notes: `vertices=${plyAsciiVertexCount}`
    },
    {
      case: 'Round-trip PLY binary',
      ok: plyBinaryVertexCount > 0,
      notes: `vertices=${plyBinaryVertexCount}`
    },
    {
      case: 'Export STL ASCII',
      ok: typeof stlAsciiResult === 'string' && stlAsciiResult.startsWith('solid'),
      notes: typeof stlAsciiResult === 'string' ? 'ASCII header ok' : 'Expected string output'
    },
    {
      case: 'Export STL binary',
      ok: stlBinaryResult instanceof DataView && stlBinaryResult.byteLength > 0,
      notes: stlBinaryResult instanceof DataView ? `bytes=${stlBinaryResult.byteLength}` : 'Expected DataView output'
    },
    {
      case: 'Round-trip STL ASCII',
      ok: stlAsciiVertexCount > 0,
      notes: `vertices=${stlAsciiVertexCount}`
    },
    {
      case: 'Round-trip STL binary',
      ok: stlBinaryVertexCount > 0,
      notes: `vertices=${stlBinaryVertexCount}`
    }
  ];
}

async function runImportExportEdgeCases() {
  const rows = [];

  try {
    const glb = await parseGlbFixture(path.join('gltf', 'Stork.glb'));
    const animationCount = glb.animations?.length || 0;
    const materialCount = countSceneMaterials(glb.scene);
    const objectLoader = new THREE.ObjectLoader();
    glb.scene.animations = Array.isArray(glb.animations) ? glb.animations : [];
    const glbRoundTripJson = glb.scene.toJSON();
    const roundTripScene = objectLoader.parse(glbRoundTripJson);
    const roundTripAnimations = countAnimationClips(roundTripScene);

    rows.push({
      case: 'Import GLB (Stork) animation baseline',
      import: !!glb.scene && animationCount > 0 && roundTripAnimations > 0,
      export: true,
      notes: `animations=${animationCount}; materials=${materialCount}; roundTripAnimations=${roundTripAnimations}`
    });
  } catch (error) {
    rows.push({
      case: 'Import GLB (Stork) animation baseline',
      import: false,
      export: true,
      notes: `Import failed: ${error.message}`
    });
  }

  try {
    const fbx = await parseFbxFixture(path.join('fbx', 'nurbs.fbx'));
    const childCount = fbx?.children?.length || 0;
    const objectLoader = new THREE.ObjectLoader();
    const roundTrip = objectLoader.parse(fbx.toJSON());
    const roundTripChildren = roundTrip?.children?.length || 0;

    rows.push({
      case: 'Import FBX (nurbs) geometry baseline',
      import: !!fbx && childCount > 0 && roundTripChildren > 0,
      export: true,
      notes: `children=${childCount}; roundTripChildren=${roundTripChildren}`
    });
  } catch (error) {
    rows.push({
      case: 'Import FBX (nurbs) geometry baseline',
      import: false,
      export: true,
      notes: `Import failed: ${error.message}`
    });
  }

  try {
    const gltfVariants = await readJsonFixture(path.join('gltf', 'MaterialsVariantsShoe', 'glTF', 'MaterialsVariantsShoe.gltf'));
    const extensions = gltfVariants.extensionsUsed || [];
    const materials = gltfVariants.materials || [];
    const hasVariants = extensions.includes('KHR_materials_variants');

    rows.push({
      case: 'Fixture GLTF variants/materials metadata',
      import: hasVariants && materials.length > 0,
      export: true,
      notes: `extensionsUsed=${extensions.join(',') || 'none'}; materials=${materials.length}`
    });
  } catch (error) {
    rows.push({
      case: 'Fixture GLTF variants/materials metadata',
      import: false,
      export: true,
      notes: `Fixture read failed: ${error.message}`
    });
  }

  try {
    const morph = await readJsonFixture(path.join('gltf', 'AnimatedMorphSphere', 'glTF', 'AnimatedMorphSphere.gltf'));
    const hasAnimations = Array.isArray(morph.animations) && morph.animations.length > 0;
    const hasMorphTargets = Array.isArray(morph.meshes) && morph.meshes.some((mesh) => Array.isArray(mesh.primitives) && mesh.primitives.some((primitive) => Array.isArray(primitive.targets) && primitive.targets.length > 0));

    rows.push({
      case: 'Fixture GLTF morph + animation metadata',
      import: hasAnimations && hasMorphTargets,
      export: true,
      notes: `animations=${morph.animations?.length || 0}; morphTargets=${yesNo(hasMorphTargets)}`
    });
  } catch (error) {
    rows.push({
      case: 'Fixture GLTF morph + animation metadata',
      import: false,
      export: true,
      notes: `Fixture read failed: ${error.message}`
    });
  }

  try {
    const exportRows = await runExportChecks();
    for (const row of exportRows) {
      rows.push({
        case: row.case,
        import: true,
        export: row.ok,
        notes: row.notes
      });
    }
  } catch (error) {
    rows.push({
      case: 'Export edge-case batch',
      import: true,
      export: false,
      notes: `Export checks failed: ${error.message}`
    });
  }

  return rows;
}

async function runRuntimeServiceChecks() {
  const rows = [];

  const videoSource = await fs.readFile(VIDEO_PIPELINE_PATH, 'utf8');
  rows.push({
    area: 'Video pipeline status lifecycle',
    ok:
      videoSource.includes("type: 'stage'") &&
      videoSource.includes("type: 'progress'") &&
      videoSource.includes("type: 'canceled'") &&
      videoSource.includes("type: 'error'") &&
      videoSource.includes("type: 'completed'"),
    notes: 'Checks stage/progress/canceled/error/completed events.'
  });

  rows.push({
    area: 'Video pipeline cancel/error contracts',
    ok:
      videoSource.includes("error.code = 'VIDEO_BACKEND_UNAVAILABLE'") &&
      videoSource.includes("error.code = 'VIDEO_RENDER_ABORTED'") &&
      videoSource.includes('stopStream(stream)'),
    notes: 'Checks backend unavailable/abort error codes and stream cleanup.'
  });

  const diagnosticsModule = await import(pathToFileURL(SCRIPT_DIAGNOSTICS_PATH).href);
  const syntaxOk = diagnosticsModule.validateScriptSource('const a = 1; function update(){ return a; }');
  const syntaxFail = diagnosticsModule.validateScriptSource('function update( {');

  rows.push({
    area: 'Script diagnostics valid source',
    ok: syntaxOk?.ok === true && Array.isArray(syntaxOk.errors) && syntaxOk.errors.length === 0,
    notes: 'Expected ok=true with empty errors.'
  });

  rows.push({
    area: 'Script diagnostics invalid source',
    ok: syntaxFail?.ok === false && Array.isArray(syntaxFail.errors) && syntaxFail.errors.length > 0,
    notes: `Errors=${syntaxFail?.errors?.length ?? 0}`
  });

  const formatted = diagnosticsModule.formatScriptErrors(syntaxFail?.errors || []);
  rows.push({
    area: 'Script diagnostics formatting',
    ok: typeof formatted === 'string' && formatted.length > 0,
    notes: formatted ? 'Formatted error text generated.' : 'No formatted error text.'
  });

  return rows;
}

async function run() {
  const templateNames = (await fs.readdir(TEMPLATES_DIR))
    .filter((name) => name.endsWith('.app.json'))
    .sort((a, b) => a.localeCompare(b));

  const publisherSource = await fs.readFile(PUBLISHER_PATH, 'utf8');
  const publishContractOk = validatePublishContract(publisherSource);

  const templateRows = [];

  for (const templateFile of templateNames) {
    const fullPath = path.join(TEMPLATES_DIR, templateFile);
    const text = await fs.readFile(fullPath, 'utf8');
    const templateName = templateFile.replace('.app.json', '');

    let json = null;
    let parseOk = false;
    let sceneOk = false;
    let cameraOk = false;
    let scriptsOk = false;
    let scriptCount = 0;
    let notes = [];

    try {
      json = JSON.parse(text);
      parseOk = true;
    } catch (error) {
      templateRows.push({
        template: templateName,
        play: false,
        publish: false,
        scripts: 0,
        notes: `JSON parse failed: ${error.message}`
      });
      continue;
    }

    const loader = new THREE.ObjectLoader();
    let scene = null;
    let camera = null;

    try {
      scene = loader.parse(json.scene);
      sceneOk = !!scene?.isScene;
    } catch (error) {
      notes.push(`Scene parse failed: ${error.message}`);
    }

    try {
      camera = loader.parse(json.camera);
      cameraOk = !!camera?.isCamera;
    } catch (error) {
      notes.push(`Camera parse failed: ${error.message}`);
    }

    if (sceneOk && cameraOk) {
      try {
        const scriptsByUuid = json.scripts || {};
        for (const [uuid, scripts] of Object.entries(scriptsByUuid)) {
          const object = scene.getObjectByProperty('uuid', uuid, true);
          if (!object) {
            throw new Error(`Script target uuid not found in scene: ${uuid}`);
          }

          for (const script of scripts) {
            scriptCount += 1;
            compileScriptOnObject({ object, scene, camera, script });
          }
        }
        scriptsOk = true;
      } catch (error) {
        notes.push(`Script check failed: ${error.message}`);
      }
    }

    const playOk = parseOk && sceneOk && cameraOk && scriptsOk;
    const publishOk = parseOk && publishContractOk;

    templateRows.push({
      template: templateName,
      play: playOk,
      publish: publishOk,
      scripts: scriptCount,
      notes: notes.join(' | ') || 'OK'
    });
  }

  const edgeRows = await runImportExportEdgeCases();
  const serviceRows = await runRuntimeServiceChecks();

  const lines = [];
  lines.push('# Runtime Parity Report');
  lines.push('');
  lines.push('## Template Parity');
  lines.push('');
  lines.push('| Template | Play Runtime | Publish ZIP Runtime | Scripts | Notes |');
  lines.push('|---|---|---|---:|---|');
  for (const row of templateRows) {
    lines.push(`| ${row.template} | ${yesNo(row.play)} | ${yesNo(row.publish)} | ${row.scripts} | ${row.notes} |`);
  }
  lines.push('');
  lines.push('## Import/Export Edge Cases');
  lines.push('');
  lines.push('| Case | Import | Export | Notes |');
  lines.push('|---|---|---|---|');
  for (const row of edgeRows) {
    lines.push(`| ${row.case} | ${yesNo(row.import)} | ${yesNo(row.export)} | ${row.notes} |`);
  }
  lines.push('');
  lines.push('## Runtime Services');
  lines.push('');
  lines.push('| Area | Status | Notes |');
  lines.push('|---|---|---|');
  for (const row of serviceRows) {
    lines.push(`| ${row.area} | ${yesNo(row.ok)} | ${row.notes} |`);
  }
  lines.push('');
  lines.push(`Publisher contract check: ${yesNo(publishContractOk)}`);
  lines.push(`Checked templates: ${templateRows.length}`);
  lines.push(`Checked edge cases: ${edgeRows.length}`);
  lines.push(`Checked runtime services: ${serviceRows.length}`);

  const report = lines.join('\n');
  await fs.writeFile(REPORT_PATH, report, 'utf8');

  console.log(report);

  const templateFailures = templateRows.some((row) => !row.play || !row.publish);
  const edgeFailures = edgeRows.some((row) => !row.import || !row.export);
  const serviceFailures = serviceRows.some((row) => !row.ok);
  const hasFailures = templateFailures || edgeFailures || serviceFailures;
  process.exitCode = hasFailures ? 1 : 0;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
