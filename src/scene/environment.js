import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export function setupEnvironment(scene, materials, onProgress) {
  // 1. Oak Table surface
  const tableGeo = new THREE.BoxGeometry(70, 2, 70);
  const tableMesh = new THREE.Mesh(tableGeo, materials.table);
  tableMesh.position.y = -1.45; // Just below the board sub-base
  tableMesh.receiveShadow = true;
  tableMesh.castShadow = false;
  scene.add(tableMesh);

  // 2. Key Directional Light (Warm study chandelier/lamp) - positioned to avoid direct specular reflection into camera
  const keyLight = new THREE.DirectionalLight('#fff2de', 1.35);
  keyLight.position.set(-14, 28, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 5;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.camera.left = -14;
  keyLight.shadow.camera.right = 14;
  keyLight.shadow.camera.top = 14;
  keyLight.shadow.camera.bottom = -14;
  keyLight.shadow.bias = -0.00025;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  // 3. Fill Light (Soft cool room bounce)
  const fillLight = new THREE.DirectionalLight('#c5d4e8', 0.42);
  fillLight.position.set(16, 18, -14);
  scene.add(fillLight);

  // 4. Warm Rim/Back Light (Accentuates piece silhouettes gently)
  const rimLight = new THREE.DirectionalLight('#ffe0b3', 0.55);
  rimLight.position.set(0, 14, -22);
  scene.add(rimLight);

  // 5. Ambient light for shadow detail
  const ambientLight = new THREE.AmbientLight('#33261c', 0.45);
  scene.add(ambientLight);

  // 6. Poly Haven Photostudio HDR environment map (softened intensity)
  const pmremGenerator = new THREE.PMREMGenerator(scene.renderer || null);
  pmremGenerator.compileEquirectangularShader();

  const rgbeLoader = new RGBELoader();
  return new Promise((resolve) => {
    rgbeLoader.load(
      '/hdri/studio.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.environmentIntensity = 0.48; // Gentle diffuse reflections without burning highlights
        if (onProgress) onProgress(1.0);
        resolve({ keyLight, fillLight, rimLight, envMap: texture });
      },
      (xhr) => {
        if (xhr.total > 0 && onProgress) {
          onProgress(xhr.loaded / xhr.total);
        }
      },
      (err) => {
        console.warn('HDR loading failed, using fallback lighting', err);
        resolve({ keyLight, fillLight, rimLight, envMap: null });
      }
    );
  });
}
