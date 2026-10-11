import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

/**
 * Configure texture wrapping and color space
 */
function setupTexture(tex, repeatX = 1, repeatY = 1) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

/**
 * Load available textures from /textures/
 */
export const textures = {
  maple: null,
  walnut: null,
  rosewood: null,
  oak: null,
};

export function loadAllTextures(onProgress) {
  const list = [
    { key: 'maple', url: '/textures/maple.jpg', rx: 2, ry: 2 },
    { key: 'walnut', url: '/textures/walnut.jpg', rx: 2, ry: 2 },
    { key: 'rosewood', url: '/textures/rosewood.jpg', rx: 3, ry: 1 },
    { key: 'oak', url: '/textures/oak.jpg', rx: 4, ry: 4 },
  ];

  let loaded = 0;
  return Promise.all(
    list.map(
      (item) =>
        new Promise((resolve) => {
          textureLoader.load(
            item.url,
            (tex) => {
              setupTexture(tex, item.rx, item.ry);
              textures[item.key] = tex;
              loaded++;
              if (onProgress) onProgress(loaded / list.length);
              resolve(tex);
            },
            undefined,
            () => {
              // Graceful fallback to procedural canvas texture if file missing
              console.warn(`Texture ${item.url} fallback to procedural canvas`);
              const fallback = createProceduralWoodTexture(item.key);
              textures[item.key] = fallback;
              loaded++;
              if (onProgress) onProgress(loaded / list.length);
              resolve(fallback);
            }
          );
        })
    )
  );
}

/**
 * Fallback procedural wood canvas texture
 */
function createProceduralWoodTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  let baseColor = '#e8d2b2';
  let grainColor = '#c9b08f';
  if (type === 'walnut') {
    baseColor = '#3a2418';
    grainColor = '#24140c';
  } else if (type === 'rosewood') {
    baseColor = '#461b11';
    grainColor = '#2b0f08';
  } else if (type === 'oak') {
    baseColor = '#4a3728';
    grainColor = '#2e1f14';
  }

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = grainColor;
  for (let i = 0; i < 500; i++) {
    const y = Math.random() * 512;
    const h = 1 + Math.random() * 3;
    ctx.globalAlpha = 0.08 + Math.random() * 0.12;
    ctx.fillRect(0, y, 512, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Material generator
 */
export function createMaterials() {
  // 1. Boxwood (Light pieces): warm ivory tones, hand-rubbed clearcoat lacquer
  const whitePieceMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e8d4b8'),
    map: textures.maple || null,
    roughness: 0.28,
    metalness: 0.0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    reflectivity: 0.5,
    sheen: 0.2,
    sheenColor: new THREE.Color('#f0dfc8'),
    specularIntensity: 0.6,
  });

  // 2. Ebony (Dark pieces): deep espresso, high-gloss clearcoat lacquer
  const blackPieceMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1c140e'),
    map: textures.walnut || null,
    roughness: 0.24,
    metalness: 0.0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    reflectivity: 0.6,
    sheen: 0.3,
    sheenColor: new THREE.Color('#3d281a'),
    specularIntensity: 0.6,
  });

  // 3. Green felt pads under every piece
  const feltMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#143b22'),
    roughness: 0.94,
    metalness: 0.0,
  });

  // 4. Board light squares: bird's eye maple veneer (satin furniture wax finish, zero glare)
  const lightSquareMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ecd8bd'),
    map: textures.maple || null,
    roughness: 0.46,
    clearcoat: 0.12,
    clearcoatRoughness: 0.45,
    reflectivity: 0.25,
    specularIntensity: 0.25,
  });

  // 5. Board dark squares: dark American walnut (satin furniture wax finish)
  const darkSquareMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#462d1c'),
    map: textures.walnut || null,
    roughness: 0.46,
    clearcoat: 0.12,
    clearcoatRoughness: 0.45,
    reflectivity: 0.25,
    specularIntensity: 0.25,
  });

  // 6. Board rosewood outer frame
  const frameMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#42180e'),
    map: textures.rosewood || null,
    roughness: 0.32,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
    reflectivity: 0.4,
    specularIntensity: 0.4,
  });

  // 7. Inlaid brass trim line separating board from frame
  const brassTrimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d4a359'),
    metalness: 0.85,
    roughness: 0.22,
  });

  // 8. Old oak table surface
  const tableMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#38281b'),
    map: textures.oak || null,
    roughness: 0.72,
    metalness: 0.02,
  });

  // 9. Coordinate numerals & letters (engraved gold inlay)
  const coordMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#d9a85b'),
    transparent: true,
    opacity: 0.88,
  });

  return {
    whitePiece: whitePieceMaterial,
    blackPiece: blackPieceMaterial,
    felt: feltMaterial,
    lightSquare: lightSquareMaterial,
    darkSquare: darkSquareMaterial,
    frame: frameMaterial,
    brassTrim: brassTrimMaterial,
    table: tableMaterial,
    coord: coordMaterial,
  };
}
