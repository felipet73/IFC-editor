# Runtime Parity Report

## Template Parity

| Template | Play Runtime | Publish ZIP Runtime | Scripts | Notes |
|---|---|---|---:|---|
| arkanoid | PASS | PASS | 2 | OK |
| camera | PASS | PASS | 2 | OK |
| particles | PASS | PASS | 1 | OK |
| pong | PASS | PASS | 1 | OK |
| shaders | PASS | PASS | 1 | OK |

## Import/Export Edge Cases

| Case | Import | Export | Notes |
|---|---|---|---|
| Import GLB (Stork) animation baseline | PASS | PASS | animations=1; materials=1; roundTripAnimations=1 |
| Import FBX (nurbs) geometry baseline | PASS | PASS | children=5; roundTripChildren=5 |
| Fixture GLTF variants/materials metadata | PASS | PASS | extensionsUsed=KHR_materials_variants; materials=3 |
| Fixture GLTF morph + animation metadata | PASS | PASS | animations=1; morphTargets=PASS |
| Export GLTF/GLB support contract | PASS | PASS | Validated in exporter.js for Node-safe CI; browser runtime executes GLTFExporter. |
| Export animation source contract | PASS | PASS | Animation clip collection/optimization is present before GLTF export. |
| Round-trip scene JSON (materials + animations) | PASS | PASS | materials=2; animations=1 |
| Export PLY ASCII | PASS | PASS | ASCII header ok |
| Export PLY binary | PASS | PASS | bytes=1178 |
| Round-trip PLY ASCII | PASS | PASS | vertices=24 |
| Round-trip PLY binary | PASS | PASS | vertices=24 |
| Export STL ASCII | PASS | PASS | ASCII header ok |
| Export STL binary | PASS | PASS | bytes=684 |
| Round-trip STL ASCII | PASS | PASS | vertices=36 |
| Round-trip STL binary | PASS | PASS | vertices=36 |

## Runtime Services

| Area | Status | Notes |
|---|---|---|
| Video pipeline status lifecycle | PASS | Checks stage/progress/canceled/error/completed events. |
| Video pipeline cancel/error contracts | PASS | Checks backend unavailable/abort error codes and stream cleanup. |
| Script diagnostics valid source | PASS | Expected ok=true with empty errors. |
| Script diagnostics invalid source | PASS | Errors=1 |
| Script diagnostics formatting | PASS | Formatted error text generated. |

Publisher contract check: PASS
Checked templates: 5
Checked edge cases: 15
Checked runtime services: 5