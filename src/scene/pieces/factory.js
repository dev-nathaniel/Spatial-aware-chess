import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  getPawnProfile,
  getRookProfile,
  getBishopProfile,
  getQueenProfile,
  getKingProfile,
} from './profiles.js';
import { createKnightGeometry } from './knight.js';

/**
 * Cache master geometries so all 32 pieces share the same 6 master geometries.
 */
const geometryCache = new Map();
const evaluator = new Evaluator();
evaluator.useGroups = false;

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
 * Creates the King's 3D Cross Pattée finial
 */
function createCrossPatteeGeometry() {
  const parts = [];

  // Center cube
  const centerGeo = new THREE.BoxGeometry(0.12, 0.12, 0.10);
  parts.push(centerGeo);

  // Cross arms that flare slightly outward (classic Maltese/pattée cross)
  const armShapes = [
    // Top arm (vertical)
    { pos: [0, 0.16, 0], scale: [0.18, 0.20, 0.08] },
    // Bottom arm (peg into head)
    { pos: [0, -0.14, 0], scale: [0.13, 0.16, 0.08] },
    // Left arm (horizontal)
    { pos: [-0.16, 0, 0], scale: [0.20, 0.18, 0.08] },
    // Right arm (horizontal)
    { pos: [0.16, 0, 0], scale: [0.20, 0.18, 0.08] },
  ];

  for (const a of armShapes) {
    const geo = new THREE.BoxGeometry(a.scale[0], a.scale[1], a.scale[2]);
    geo.translate(a.pos[0], a.pos[1], a.pos[2]);
    parts.push(geo);
  }

  // Small center diamond jewel
  const diamond = new THREE.OctahedronGeometry(0.06);
  diamond.translate(0, 0, 0);
  parts.push(diamond);

  const normParts = parts.map(normalizeForMerge);
  const merged = mergeGeometries(normParts, false);
  merged.computeVertexNormals();
  parts.forEach((p) => p.dispose());
  normParts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Creates green felt base pad geometry (shared across pieces, scaled by radius)
 */
export function createFeltPadGeometry(radius = 0.5) {
  const geo = new THREE.CylinderGeometry(radius * 0.90, radius * 0.92, 0.025, 32);
  geo.translate(0, 0.012, 0);
  return geo;
}

/**
 * Build master geometry for each piece type:
 * 'p': Pawn
 * 'r': Rook
 * 'n': Knight
 * 'b': Bishop
 * 'q': Queen
 * 'k': King
 */
export function getPieceGeometry(type) {
  if (geometryCache.has(type)) {
    return geometryCache.get(type);
  }

  let finalGeo;

  switch (type) {
    case 'p': {
      // Pawn
      const pts = getPawnProfile();
      finalGeo = new THREE.LatheGeometry(pts, 48);
      break;
    }

    case 'r': {
      // Rook with 4 crenellation cutouts
      const pts = getRookProfile();
      const lathe = new THREE.LatheGeometry(pts, 48);
      const rookBrush = new Brush(lathe);
      rookBrush.updateMatrixWorld();

      // Cut 4 embrasure notches through the top rim
      const cuts = [];
      const cut1 = new THREE.BoxGeometry(0.24, 0.40, 1.3);
      cut1.translate(0, 2.05, 0);
      cuts.push(cut1);

      const cut2 = new THREE.BoxGeometry(1.3, 0.40, 0.24);
      cut2.translate(0, 2.05, 0);
      cuts.push(cut2);

      const mergedCutter = mergeGeometries(cuts, false);
      const cutterBrush = new Brush(mergedCutter);
      cutterBrush.updateMatrixWorld();

      const result = evaluator.evaluate(rookBrush, cutterBrush, SUBTRACTION);
      finalGeo = result.geometry.clone();

      lathe.dispose();
      mergedCutter.dispose();
      cuts.forEach((c) => c.dispose());
      break;
    }

    case 'n': {
      // Knight
      finalGeo = createKnightGeometry();
      break;
    }

    case 'b': {
      // Bishop with angled mitre cleft
      const pts = getBishopProfile();
      const lathe = new THREE.LatheGeometry(pts, 48);
      const bishopBrush = new Brush(lathe);
      bishopBrush.updateMatrixWorld();

      // Angled cutting wedge for the mitre slash
      const cutGeo = new THREE.BoxGeometry(0.08, 0.48, 0.55);
      cutGeo.rotateZ(0.48); // ~28 degrees slant
      cutGeo.translate(0.18, 2.30, 0);

      const cutterBrush = new Brush(cutGeo);
      cutterBrush.updateMatrixWorld();

      const result = evaluator.evaluate(bishopBrush, cutterBrush, SUBTRACTION);
      finalGeo = result.geometry.clone();

      lathe.dispose();
      cutGeo.dispose();
      break;
    }

    case 'q': {
      // Queen coronet
      const pts = getQueenProfile();
      const lathe = new THREE.LatheGeometry(pts, 48);

      // Scalloped crenellations along queen's crown rim
      const queenBrush = new Brush(lathe);
      queenBrush.updateMatrixWorld();

      const numScallops = 8;
      const cuts = [];
      for (let i = 0; i < numScallops; i++) {
        const angle = (i * Math.PI * 2) / numScallops;
        const cx = Math.cos(angle) * 0.54;
        const cz = Math.sin(angle) * 0.54;
        const sphereCut = new THREE.SphereGeometry(0.10, 14, 10);
        sphereCut.translate(cx, 2.95, cz);
        cuts.push(sphereCut);
      }

      const mergedCutter = mergeGeometries(cuts, false);
      const cutterBrush = new Brush(mergedCutter);
      cutterBrush.updateMatrixWorld();

      const result = evaluator.evaluate(queenBrush, cutterBrush, SUBTRACTION);
      finalGeo = result.geometry.clone();

      lathe.dispose();
      mergedCutter.dispose();
      cuts.forEach((c) => c.dispose());
      break;
    }

    case 'k': {
      // King with cross pattée
      const pts = getKingProfile();
      const lathe = new THREE.LatheGeometry(pts, 48);

      const crossGeo = createCrossPatteeGeometry();
      crossGeo.translate(0, 3.65, 0);

      const normKing = [lathe, crossGeo].map(normalizeForMerge);
      finalGeo = mergeGeometries(normKing, false);
      lathe.dispose();
      crossGeo.dispose();
      normKing.forEach((g) => g.dispose());
      break;
    }

    default:
      throw new Error(`Unknown piece type: ${type}`);
  }

  finalGeo.computeVertexNormals();
  finalGeo.computeBoundingBox();
  finalGeo.computeBoundingSphere();
  geometryCache.set(type, finalGeo);
  return finalGeo;
}

/**
 * Approximate base radii for felt pads
 */
export const PIECE_RADII = {
  p: 0.52,
  r: 0.58,
  n: 0.58,
  b: 0.60,
  q: 0.66,
  k: 0.70,
};

/**
 * Approximate piece heights
 */
export const PIECE_HEIGHTS = {
  p: 1.74,
  r: 2.10,
  n: 2.45,
  b: 2.79,
  q: 3.18,
  k: 3.82,
};
