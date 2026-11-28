# Mountain Highway Upgrade – starter integration package

Included:
- `RoadPath.ts`: shared curved road coordinate system.
- `MountainRoad.ts`: streamed curved asphalt/shoulder/guardrail/lane-marking meshes.

## Important integration note

This package is a foundation, not a drop-in replacement for your complete game files.
Your current game uses straight world X/Z coordinates for player movement, traffic, and
collision checks. A curved road must be integrated into all three systems together.

### Basic setup

```ts
import { RoadPath } from "./RoadPath";
import { MountainRoad } from "./MountainRoad";

const roadPath = new RoadPath({
  curveAmplitude: 34,
  curveWavelength: 620,
  elevationAmplitude: 9,
});

const mountainRoad = new MountainRoad(roadPath, {
  roadWidth: 16.5,
  segmentLength: 80,
  segmentsAhead: 10,
  segmentsBehind: 2,
  anisotropy: renderer.capabilities.getMaxAnisotropy(),
});

mountainRoad.addTo(scene);

// Each frame, where playerDistance is the distance travelled along the road:
mountainRoad.update(playerDistance);

// Place player using a road-relative lateral offset:
const bikeWorldPosition = roadPath.toWorld(playerDistance, playerLateralOffset, 0);
const roadYaw = roadPath.getYaw(playerDistance);
```

### Required changes to the existing game

1. Keep `playerZ` or replace it with a monotonic `playerDistance` value.
2. Treat `playerX` as lateral offset from the road centre, not world X.
3. Set the bike world position with `roadPath.toWorld(playerDistance, playerX, bikeHeight)`.
4. Place the camera using the same path sample and rotate it to follow `roadPath.getYaw(playerDistance)`.
5. Place each traffic vehicle with `roadPath.toWorld(vehicleDistance, vehicleLateralOffset, vehicleHeight)`.
6. Perform collision checks in road-relative coordinates: compare distance along road and lateral offsets, not raw world X/Z.
7. Build scenery (trees, rocks, cliffs, signs) relative to `roadPath.toWorld(s, lateral, height)` so it follows the bends.
8. Dispose of `mountainRoad` and its resources when the game is destroyed.

## Graphics preset suggestion for RTX 3060 12GB

Use device capability detection rather than hard-coding a GPU name in browser code:
- PC high preset: pixel ratio up to 2, 2K/4K source textures as available, shadow map 2048–4096,
  anisotropy 16, high vegetation density, SSAO if your post-processing pipeline supports it.
- Mobile preset: cap pixel ratio around 1–1.5, shadow map 1024, reduce vegetation density and
  disable expensive post-processing when GPU timing is poor.

The renderer's actual supported features and available VRAM vary by browser and driver.
