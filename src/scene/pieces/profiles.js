import * as THREE from 'three';

/**
 * Creates smooth parametric Staunton lathe profiles (radius r, height y).
 * Each piece has authentic Staunton tournament proportions,
 * double-stepped scotia bases, tapered waists, beaded collars, and signature heads.
 */

function generateBaseProfile(baseRadius, baseHeight = 0.35) {
  const points = [];
  // Felt inset under base
  points.push(new THREE.Vector2(0, 0));
  points.push(new THREE.Vector2(baseRadius * 0.88, 0));
  points.push(new THREE.Vector2(baseRadius * 0.95, 0.015));
  points.push(new THREE.Vector2(baseRadius, 0.04));
  points.push(new THREE.Vector2(baseRadius * 0.98, 0.09));
  // Lower step & scotia hollow
  points.push(new THREE.Vector2(baseRadius * 0.88, 0.12));
  points.push(new THREE.Vector2(baseRadius * 0.82, 0.16));
  points.push(new THREE.Vector2(baseRadius * 0.78, 0.21));
  // Upper fillet bead
  points.push(new THREE.Vector2(baseRadius * 0.84, 0.25));
  points.push(new THREE.Vector2(baseRadius * 0.82, 0.29));
  points.push(new THREE.Vector2(baseRadius * 0.72, 0.32));
  points.push(new THREE.Vector2(baseRadius * 0.62, baseHeight));
  return points;
}

/**
 * Pawn:
 * Height ~ 1.70, baseRadius ~ 0.52
 */
export function getPawnProfile() {
  const r = 0.52;
  const pts = generateBaseProfile(r, 0.35);

  // Slender tapered stem curving gently inward then flaring slightly
  const stem = [
    new THREE.Vector2(0.32, 0.42),
    new THREE.Vector2(0.24, 0.58),
    new THREE.Vector2(0.21, 0.75),
    new THREE.Vector2(0.21, 0.90),
    new THREE.Vector2(0.23, 1.05),
  ];
  pts.push(...stem);

  // Beaded collar ring
  pts.push(new THREE.Vector2(0.38, 1.09));
  pts.push(new THREE.Vector2(0.40, 1.12));
  pts.push(new THREE.Vector2(0.35, 1.15));
  pts.push(new THREE.Vector2(0.26, 1.17));

  // Spherical head ball
  const ballCenterY = 1.44;
  const ballRadius = 0.28;
  const numSteps = 16;
  for (let i = 0; i <= numSteps; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / numSteps;
    const px = Math.cos(angle) * ballRadius;
    const py = ballCenterY + Math.sin(angle) * ballRadius;
    if (py >= 1.17 && px >= 0) {
      pts.push(new THREE.Vector2(px, py));
    }
  }

  // Little tip finial
  pts.push(new THREE.Vector2(0.04, 1.73));
  pts.push(new THREE.Vector2(0, 1.74));

  return pts;
}

/**
 * Rook (castle tower):
 * Height ~ 2.10, baseRadius ~ 0.58
 * Returns profile for lathe; crenellations cut later via CSG or geometry
 */
export function getRookProfile() {
  const r = 0.58;
  const pts = generateBaseProfile(r, 0.38);

  // Sturdy conical tower
  pts.push(new THREE.Vector2(0.42, 0.50));
  pts.push(new THREE.Vector2(0.38, 0.85));
  pts.push(new THREE.Vector2(0.36, 1.25));
  pts.push(new THREE.Vector2(0.37, 1.55));

  // Lower parapet moulding
  pts.push(new THREE.Vector2(0.44, 1.62));
  pts.push(new THREE.Vector2(0.48, 1.68));
  pts.push(new THREE.Vector2(0.45, 1.73));

  // Parapet rim (outer wall)
  pts.push(new THREE.Vector2(0.50, 1.77));
  pts.push(new THREE.Vector2(0.51, 2.08));
  pts.push(new THREE.Vector2(0.49, 2.10));

  // Top rim thickness & hollow interior walkway
  pts.push(new THREE.Vector2(0.38, 2.10));
  pts.push(new THREE.Vector2(0.36, 1.82));
  pts.push(new THREE.Vector2(0, 1.82));

  return pts;
}

/**
 * Bishop:
 * Height ~ 2.70, baseRadius ~ 0.60
 * Classic Staunton mitre with ball finial
 */
export function getBishopProfile() {
  const r = 0.60;
  const pts = generateBaseProfile(r, 0.40);

  // Tapered graceful stem
  pts.push(new THREE.Vector2(0.36, 0.55));
  pts.push(new THREE.Vector2(0.27, 0.85));
  pts.push(new THREE.Vector2(0.24, 1.15));
  pts.push(new THREE.Vector2(0.25, 1.40));

  // Double neck collar
  pts.push(new THREE.Vector2(0.38, 1.46));
  pts.push(new THREE.Vector2(0.42, 1.51));
  pts.push(new THREE.Vector2(0.36, 1.55));
  pts.push(new THREE.Vector2(0.44, 1.61));
  pts.push(new THREE.Vector2(0.38, 1.66));
  pts.push(new THREE.Vector2(0.28, 1.70));

  // Elongated egg/mitre body
  const mitreCenterY = 2.12;
  const mitreRy = 0.44;
  const mitreRx = 0.38;
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / steps;
    const px = Math.cos(angle) * mitreRx;
    const py = mitreCenterY + Math.sin(angle) * mitreRy;
    if (py >= 1.70 && py <= 2.56 && px >= 0) {
      pts.push(new THREE.Vector2(px, py));
    }
  }

  // Neck below ball finial
  pts.push(new THREE.Vector2(0.12, 2.57));

  // Little top ball
  const topBallR = 0.11;
  const topBallCenter = 2.68;
  for (let i = 0; i <= 10; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / 10;
    const px = Math.cos(angle) * topBallR;
    const py = topBallCenter + Math.sin(angle) * topBallR;
    if (px >= 0) {
      pts.push(new THREE.Vector2(px, py));
    }
  }
  pts.push(new THREE.Vector2(0, 2.79));

  return pts;
}

/**
 * Queen:
 * Height ~ 3.15, baseRadius ~ 0.66
 * Flaring coronet rim with top ball finial
 */
export function getQueenProfile() {
  const r = 0.66;
  const pts = generateBaseProfile(r, 0.42);

  // Regal slender stem
  pts.push(new THREE.Vector2(0.40, 0.60));
  pts.push(new THREE.Vector2(0.30, 0.95));
  pts.push(new THREE.Vector2(0.26, 1.35));
  pts.push(new THREE.Vector2(0.28, 1.70));

  // Multi-tier royal collar
  pts.push(new THREE.Vector2(0.44, 1.78));
  pts.push(new THREE.Vector2(0.48, 1.84));
  pts.push(new THREE.Vector2(0.40, 1.88));
  pts.push(new THREE.Vector2(0.50, 1.95));
  pts.push(new THREE.Vector2(0.42, 2.01));
  pts.push(new THREE.Vector2(0.32, 2.06));

  // Coronet bowl flaring outwards
  pts.push(new THREE.Vector2(0.36, 2.20));
  pts.push(new THREE.Vector2(0.46, 2.45));
  pts.push(new THREE.Vector2(0.54, 2.75));
  pts.push(new THREE.Vector2(0.56, 2.92));

  // Scalloped coronet rim / basin
  pts.push(new THREE.Vector2(0.46, 2.95));
  pts.push(new THREE.Vector2(0.34, 2.90));
  pts.push(new THREE.Vector2(0.22, 2.86));
  pts.push(new THREE.Vector2(0.12, 2.88));

  // Queen's central crown dome & pearl finial
  pts.push(new THREE.Vector2(0.14, 2.98));
  pts.push(new THREE.Vector2(0.12, 3.06));
  pts.push(new THREE.Vector2(0.06, 3.16));
  pts.push(new THREE.Vector2(0, 3.18));

  return pts;
}

/**
 * King:
 * Height ~ 3.45 (plus cross finial ~ 3.80), baseRadius ~ 0.70
 * Imposing Staunton proportions with cross finial
 */
export function getKingProfile() {
  const r = 0.70;
  const pts = generateBaseProfile(r, 0.45);

  // Stately tapering column stem
  pts.push(new THREE.Vector2(0.44, 0.65));
  pts.push(new THREE.Vector2(0.34, 1.10));
  pts.push(new THREE.Vector2(0.30, 1.55));
  pts.push(new THREE.Vector2(0.32, 1.95));

  // Ornate triple collar
  pts.push(new THREE.Vector2(0.48, 2.04));
  pts.push(new THREE.Vector2(0.53, 2.10));
  pts.push(new THREE.Vector2(0.45, 2.15));
  pts.push(new THREE.Vector2(0.55, 2.23));
  pts.push(new THREE.Vector2(0.46, 2.29));
  pts.push(new THREE.Vector2(0.36, 2.34));

  // Arched head dome (Staunton bulbous head)
  pts.push(new THREE.Vector2(0.42, 2.50));
  pts.push(new THREE.Vector2(0.52, 2.76));
  pts.push(new THREE.Vector2(0.54, 3.02));
  pts.push(new THREE.Vector2(0.48, 3.22));

  // Crown rim & finial platform
  pts.push(new THREE.Vector2(0.40, 3.32));
  pts.push(new THREE.Vector2(0.24, 3.37));
  pts.push(new THREE.Vector2(0.16, 3.42));
  pts.push(new THREE.Vector2(0, 3.44));

  return pts;
}

/**
 * Pedestal base profile for the Knight:
 * Height ~ 0.70, baseRadius ~ 0.58
 */
export function getKnightPedestalProfile() {
  const r = 0.58;
  const pts = generateBaseProfile(r, 0.38);
  pts.push(new THREE.Vector2(0.40, 0.48));
  pts.push(new THREE.Vector2(0.38, 0.56));
  pts.push(new THREE.Vector2(0.42, 0.62));
  pts.push(new THREE.Vector2(0.38, 0.68));
  pts.push(new THREE.Vector2(0, 0.68));
  return pts;
}
