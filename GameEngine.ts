BIKE RIDER GRAPHICS FIX — SAFE ENGINE EDITS
===========================================

1) Replace textures.ts with the supplied textures.ts file.

2) In GameEngine.ts, find the sky material block:

const skyMat = new THREE.MeshBasicMaterial({
  map: createSkyDomeTexture(),
  side: THREE.BackSide,
  fog: false,
});

Replace it with:

const skyMat = new THREE.MeshBasicMaterial({
  map: createSkyDomeTexture(),
  side: THREE.BackSide,
  fog: false,
  toneMapped: false,
  depthWrite: false,
  depthTest: false,
});

3) In GameEngine.ts, after the camera is created and positioned, add:

this.skyDome.position.copy(this.camera.position);

4) In startGame(), replace:

this.skyDome.position.set(0, 0, this.playerZ);

with:

this.skyDome.position.copy(this.camera.position);

5) In updateGameplay(), replace the existing skyDome.position.set(...) block with:

this.skyDome.position.copy(this.camera.position);

6) In updateCrash(), replace the existing skyDome.position.set(...) block with:

this.skyDome.position.copy(this.camera.position);

IMPORTANT:
- Do not replace all of GameEngine.ts or Scenery.ts just for this sky/horizon issue.
- Your current engine contains gameplay, multiplayer, traffic, collision, and scoring logic. Rewriting those whole files without testing could introduce unrelated bugs.
- The new textures.ts removes the painted mountain/ground color bands from the sky texture and uses a smoother horizon gradient.
- If a thin line remains after this change, it may be a road-segment seam or a different object edge; inspect a new gameplay screenshot before changing Scenery.ts.
