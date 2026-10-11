import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getKnightPedestalProfile } from './profiles.js';

function normalizeForMerge(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    const pos = g.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  for (const name in g.attributes) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') {
      g.deleteAttribute(name);
    }
  }
  return g;
}

/**
 * Creates high-fidelity Staunton Knight geometry:
 * - Hand-carved horse head contour with Roman nose, arched neck, and open mouth
 * - Sculpted lateral cheek swellings, carved brow, and flared nostrils
 * - Distinct 3D angled ears and layered mane ridges
 * - Seamlessly merged onto tournament pedestal base
 */
export function createKnightGeometry() {
  const parts = [];

  // 1. Lathe pedestal base
  const basePts = getKnightPedestalProfile();
  const baseGeo = new THREE.LatheGeometry(basePts, 48);
  parts.push(baseGeo);

  // 2. Horse head profile shape
  const shape = new THREE.Shape();
  shape.moveTo(-0.28, 0.68); // Back of base

  // Arched neck spine
  shape.bezierCurveTo(-0.35, 0.90, -0.38, 1.20, -0.34, 1.50);
  shape.bezierCurveTo(-0.30, 1.78, -0.20, 2.05, -0.06, 2.22);

  // Top of head / poll
  shape.lineTo(-0.02, 2.28);

  // Ear notch
  shape.lineTo(0.04, 2.24);

  // Forehead & Roman nose bridge
  shape.bezierCurveTo(0.14, 2.16, 0.26, 1.98, 0.36, 1.76);
  shape.bezierCurveTo(0.42, 1.62, 0.46, 1.50, 0.45, 1.40);

  // Muzzle & upper lip
  shape.bezierCurveTo(0.44, 1.34, 0.39, 1.30, 0.35, 1.31);

  // Mouth indentation
  shape.lineTo(0.28, 1.33);
  shape.lineTo(0.32, 1.26);

  // Lower jaw & chin
  shape.bezierCurveTo(0.30, 1.20, 0.24, 1.14, 0.18, 1.10);

  // Throat curving down to chest
  shape.bezierCurveTo(0.12, 1.00, 0.12, 0.88, 0.18, 0.78);
  shape.bezierCurveTo(0.22, 0.72, 0.25, 0.68, 0.28, 0.68);

  shape.closePath();

  // Extrude head with generous beveling for organic carved feel
  const extrudeSettings = {
    steps: 1,
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.06,
    bevelOffset: 0,
    bevelSegments: 5,
  };
  const headGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Center along Z axis
  headGeo.translate(0, 0, -0.16);
  parts.push(headGeo);

  // 3. Sculpted left & right cheek swellings (gives anatomical 3D depth)
  const cheekGeoL = new THREE.SphereGeometry(0.16, 24, 18);
  cheekGeoL.scale(1.2, 0.8, 0.6);
  cheekGeoL.rotateZ(0.2);
  cheekGeoL.translate(0.10, 1.30, 0.14);
  parts.push(cheekGeoL);

  const cheekGeoR = new THREE.SphereGeometry(0.16, 24, 18);
  cheekGeoR.scale(1.2, 0.8, 0.6);
  cheekGeoR.rotateZ(0.2);
  cheekGeoR.translate(0.10, 1.30, -0.14);
  parts.push(cheekGeoR);

  // 4. Carved brow bones / eye ridges
  const browGeoL = new THREE.SphereGeometry(0.08, 18, 14);
  browGeoL.scale(1.3, 0.7, 0.7);
  browGeoL.rotateZ(-0.25);
  browGeoL.translate(0.16, 1.76, 0.12);
  parts.push(browGeoL);

  const browGeoR = new THREE.SphereGeometry(0.08, 18, 14);
  browGeoR.scale(1.3, 0.7, 0.7);
  browGeoR.rotateZ(-0.25);
  browGeoR.translate(0.16, 1.76, -0.12);
  parts.push(browGeoR);

  // 5. Distinct 3D angled ears
  const earL = new THREE.ConeGeometry(0.08, 0.28, 16);
  earL.scale(0.8, 1.0, 0.5);
  earL.rotateZ(-0.22);
  earL.rotateX(0.18);
  earL.rotateY(0.1);
  earL.translate(-0.02, 2.36, 0.10);
  parts.push(earL);

  const earR = new THREE.ConeGeometry(0.08, 0.28, 16);
  earR.scale(0.8, 1.0, 0.5);
  earR.rotateZ(-0.22);
  earR.rotateX(-0.18);
  earR.rotateY(-0.1);
  earR.translate(-0.02, 2.36, -0.10);
  parts.push(earR);

  // 6. Sculpted mane tufts down the back ridge
  const maneTufts = [
    { x: -0.18, y: 2.10, s: 0.12, rz: 0.5 },
    { x: -0.26, y: 1.88, s: 0.13, rz: 0.7 },
    { x: -0.32, y: 1.62, s: 0.14, rz: 0.9 },
    { x: -0.35, y: 1.34, s: 0.14, rz: 1.1 },
    { x: -0.34, y: 1.06, s: 0.13, rz: 1.3 },
  ];
  for (const m of maneTufts) {
    const tuft = new THREE.ConeGeometry(0.07 * (m.s / 0.12), 0.22 * (m.s / 0.12), 14);
    tuft.scale(1.0, 1.2, 0.6);
    tuft.rotateZ(m.rz);
    tuft.translate(m.x, m.y, 0);
    parts.push(tuft);
  }

  // 7. Flared muzzle nostrils
  const nostrilL = new THREE.SphereGeometry(0.06, 14, 10);
  nostrilL.translate(0.40, 1.42, 0.08);
  parts.push(nostrilL);

  const nostrilR = new THREE.SphereGeometry(0.06, 14, 10);
  nostrilR.translate(0.40, 1.42, -0.08);
  parts.push(nostrilR);

  // Normalize each part so attributes match 100%
  const normalizedParts = parts.map(normalizeForMerge);
  const unified = mergeGeometries(normalizedParts, false);
  unified.computeVertexNormals();
  unified.computeBoundingBox();
  unified.computeBoundingSphere();

  // Dispose temporary part geometries to avoid memory leaks
  parts.forEach((p) => p.dispose());
  normalizedParts.forEach((p) => p.dispose());

  return unified;
}
