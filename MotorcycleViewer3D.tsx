
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildFullMotorcycleMesh } from './FullMotorcycleModel';
import { MotorcycleConfig } from './motorcycles';

interface MotorcycleViewer3DProps {
  bike: MotorcycleConfig;
}

export const MotorcycleViewer3D: React.FC<MotorcycleViewer3DProps> = ({ bike }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 250;

    const isSoftwareGl = (() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      console.error('3D renderer could not start:', error);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(2.4, 1.4, 2.8);
    camera.lookAt(0, 0.65, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = environment.texture;
    pmrem.dispose();

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.5);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = !isSoftwareGl;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.5);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.8));

    const pedestalGeo = new THREE.CylinderGeometry(1.5, 1.55, 0.06, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x181c24,
      roughness: 0.6,
      metalness: 0.3,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.03;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    const ringGeo = new THREE.RingGeometry(1.48, 1.51, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    ring.position.y = 0.005;
    scene.add(ring);

    const bikeGroup = new THREE.Group();
    const mesh = buildFullMotorcycleMesh(bike);
    bikeGroup.add(mesh);
    scene.add(bikeGroup);

    let isDragging = false;
    let prevMouseX = 0;
    let autoRotate = true;
    let targetRotation = 0.5;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      autoRotate = false;
      prevMouseX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      targetRotation += (clientX - prevMouseX) * 0.01;
      prevMouseX = clientX;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const el = renderer.domElement;
    el.style.touchAction = 'pan-y';
    el.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    el.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    let animId = 0;
    let disposed = false;

    const animate = () => {
      if (disposed) return;
      animId = requestAnimationFrame(animate);
      if (autoRotate) targetRotation += 0.006;
      bikeGroup.rotation.y = THREE.MathUtils.lerp(
        bikeGroup.rotation.y,
        targetRotation,
        0.1
      );
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      el.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });

      environment.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [bike]);

  return (
    <div className="relative w-full h-full cursor-grab active:cursor-grabbing select-none">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 rounded-full bg-black/50 text-[11px] font-mono-num text-zinc-400 tracking-wider">
        Drag or swipe to rotate 360°
      </div>
    </div>
  );
};
