import * as THREE from 'three';

export const SQUARE_SIZE = 2.0;
export const BOARD_SIZE = SQUARE_SIZE * 8; // 16.0
export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

/**
 * Convert algebraic notation ('e4') to 3D world position
 */
export function squareToWorld(square) {
  if (!square || square.length < 2) return new THREE.Vector3(0, 0, 0);
  const file = square.charCodeAt(0) - 97; // 'a' = 0 ... 'h' = 7
  const rank = parseInt(square[1], 10) - 1; // '1' = 0 ... '8' = 7
  const x = (file - 3.5) * SQUARE_SIZE;
  const z = (3.5 - rank) * SQUARE_SIZE;
  return new THREE.Vector3(x, 0, z);
}

/**
 * Convert 3D world position to algebraic square ('e4')
 */
export function worldToSquare(pos) {
  const file = Math.round(pos.x / SQUARE_SIZE + 3.5);
  const rank = Math.round(3.5 - pos.z / SQUARE_SIZE);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${RANKS[rank]}`;
}

/**
 * Creates the complete luxury chessboard assembly
 */
export function createBoard(materials) {
  const boardGroup = new THREE.Group();
  boardGroup.name = 'ChessBoard';

  const squares = new Map();
  const squareGeometry = new THREE.BoxGeometry(SQUARE_SIZE * 0.992, 0.4, SQUARE_SIZE * 0.992);

  // 1. Inlaid 64 squares
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const squareName = `${FILES[file]}${RANKS[rank]}`;
      // (file + rank) % 2 === 0 is dark square, 1 is light square
      const isLight = (file + rank) % 2 === 1;
      const mat = isLight ? materials.lightSquare : materials.darkSquare;

      const squareMesh = new THREE.Mesh(squareGeometry, mat);
      squareMesh.receiveShadow = true;
      squareMesh.castShadow = false;

      const x = (file - 3.5) * SQUARE_SIZE;
      const z = (3.5 - rank) * SQUARE_SIZE;
      squareMesh.position.set(x, -0.2, z);
      squareMesh.userData = {
        square: squareName,
        file,
        rank,
        isLight,
        isSquare: true,
      };

      boardGroup.add(squareMesh);
      squares.set(squareName, squareMesh);
    }
  }

  // 2. Brass separation inlay trim (thin metallic strip around playing field)
  const brassTrimGeo = new THREE.BoxGeometry(BOARD_SIZE + 0.12, 0.405, BOARD_SIZE + 0.12);
  const brassTrimMesh = new THREE.Mesh(brassTrimGeo, materials.brassTrim);
  brassTrimMesh.position.y = -0.203;
  boardGroup.add(brassTrimMesh);

  // 3. Solid hardwood base substrate
  const subBaseGeo = new THREE.BoxGeometry(20.4, 0.8, 20.4);
  const subBaseMesh = new THREE.Mesh(subBaseGeo, materials.frame);
  subBaseMesh.position.y = -0.45;
  subBaseMesh.receiveShadow = true;
  boardGroup.add(subBaseMesh);

  // 4. Outer bevelled rosewood frame border (4 mitered border planks)
  const borderWidth = 2.2;
  const frameHeight = 0.44;
  const frameLength = BOARD_SIZE + borderWidth * 2;

  // North & South border rails
  const railHGeo = new THREE.BoxGeometry(frameLength, frameHeight, borderWidth);
  const northRail = new THREE.Mesh(railHGeo, materials.frame);
  northRail.position.set(0, -0.22, -(BOARD_SIZE / 2 + borderWidth / 2));
  northRail.receiveShadow = true;
  northRail.castShadow = true;
  boardGroup.add(northRail);

  const southRail = new THREE.Mesh(railHGeo, materials.frame);
  southRail.position.set(0, -0.22, BOARD_SIZE / 2 + borderWidth / 2);
  southRail.receiveShadow = true;
  southRail.castShadow = true;
  boardGroup.add(southRail);

  // East & West border rails
  const railVGeo = new THREE.BoxGeometry(borderWidth, frameHeight, BOARD_SIZE);
  const eastRail = new THREE.Mesh(railVGeo, materials.frame);
  eastRail.position.set(BOARD_SIZE / 2 + borderWidth / 2, -0.22, 0);
  eastRail.receiveShadow = true;
  eastRail.castShadow = true;
  boardGroup.add(eastRail);

  const westRail = new THREE.Mesh(railVGeo, materials.frame);
  westRail.position.set(-(BOARD_SIZE / 2 + borderWidth / 2), -0.22, 0);
  westRail.receiveShadow = true;
  westRail.castShadow = true;
  boardGroup.add(westRail);

  // 5. Engraved coordinates along the border rails
  const coordsGroup = createCoordinateLabels(materials.coord);
  boardGroup.add(coordsGroup);

  // 6. Interactive Highlights Overlay Group
  const highlightsGroup = new THREE.Group();
  highlightsGroup.name = 'Highlights';
  highlightsGroup.position.y = 0.006; // Just above square surface
  boardGroup.add(highlightsGroup);

  return {
    group: boardGroup,
    squares,
    highlightsGroup,
  };
}

/**
 * Creates canvas-rendered engraved coordinate labels (a-h and 1-8)
 */
function createCoordinateLabels() {
  const group = new THREE.Group();

  function makeLabelMesh(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 74px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#dfab62'; // Warm engraved gold
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const geo = new THREE.PlaneGeometry(0.7, 0.7);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  // Files a-h (South & North borders)
  for (let file = 0; file < 8; file++) {
    const x = (file - 3.5) * SQUARE_SIZE;
    const labelS = makeLabelMesh(FILES[file]);
    labelS.position.set(x, 0.005, BOARD_SIZE / 2 + 0.95);
    group.add(labelS);

    const labelN = makeLabelMesh(FILES[file]);
    labelN.position.set(x, 0.005, -(BOARD_SIZE / 2 + 0.95));
    labelN.rotation.z = Math.PI;
    group.add(labelN);
  }

  // Ranks 1-8 (West & East borders)
  for (let rank = 0; rank < 8; rank++) {
    const z = (3.5 - rank) * SQUARE_SIZE;
    const labelW = makeLabelMesh(RANKS[rank]);
    labelW.position.set(-(BOARD_SIZE / 2 + 0.95), 0.005, z);
    group.add(labelW);

    const labelE = makeLabelMesh(RANKS[rank]);
    labelE.position.set(BOARD_SIZE / 2 + 0.95, 0.005, z);
    labelE.rotation.z = Math.PI;
    group.add(labelE);
  }

  return group;
}

/**
 * Determine if a square is light (maple) or dark (walnut)
 */
export function isLightSquare(square) {
  if (!square || square.length < 2) return false;
  const file = square.charCodeAt(0) - 97; // a=0...h=7
  const rank = parseInt(square[1], 10) - 1; // 1=0...8=7
  return (file + rank) % 2 === 1;
}

function createSquareBorderShape(size, borderThickness) {
  const outerHalf = size / 2;
  const innerHalf = outerHalf - borderThickness;

  const shape = new THREE.Shape();
  shape.moveTo(-outerHalf, -outerHalf);
  shape.lineTo(outerHalf, -outerHalf);
  shape.lineTo(outerHalf, outerHalf);
  shape.lineTo(-outerHalf, outerHalf);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-innerHalf, -innerHalf);
  hole.lineTo(-innerHalf, innerHalf);
  hole.lineTo(innerHalf, innerHalf);
  hole.lineTo(innerHalf, -innerHalf);
  hole.closePath();
  shape.holes.push(hole);

  return shape;
}

/**
 * High-Contrast Highlight Overlay Manager
 * Calibrated specifically so highlights pop with vivid clarity on BOTH
 * light maple veneer squares and dark walnut squares.
 */
export class HighlightManager {
  constructor(highlightsGroup) {
    this.group = highlightsGroup;
    this.selectedGroup = null;
    this.lastMoveGroups = [];
    this.legalGroups = [];
    this.checkGroup = null;

    // Shared reusable geometries
    const sqSize = SQUARE_SIZE * 0.96;
    this.faceGeo = new THREE.PlaneGeometry(sqSize, sqSize);
    this.borderGeo = new THREE.ShapeGeometry(createSquareBorderShape(sqSize, 0.085));

    this.legalOuterGeo = new THREE.CircleGeometry(SQUARE_SIZE * 0.17, 24);
    this.legalInnerGeo = new THREE.CircleGeometry(SQUARE_SIZE * 0.13, 24);
    this.legalCaptureOuterGeo = new THREE.RingGeometry(SQUARE_SIZE * 0.36, SQUARE_SIZE * 0.44, 32);

    // 1. Selection on Light Squares (Deep warm amber-honey with rich burnt bronze frame)
    this.selectedLightFaceMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#b56400'),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.selectedLightBorderMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#783800'),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    // 2. Selection on Dark Squares (Radiant luminous gold with gleaming bright gold frame)
    this.selectedDarkFaceMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#e5a83b'),
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.selectedDarkBorderMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffe28a'),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    // 3. Last Move on Light Squares
    this.lastMoveLightFaceMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#af6205'),
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.lastMoveLightBorderMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#783c00'),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    // 4. Last Move on Dark Squares
    this.lastMoveDarkFaceMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#d4992e'),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.lastMoveDarkBorderMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#fad173'),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    // 5. Legal Move Dots
    this.legalShadowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#221307'),
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.legalLightInnerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#945000'),
      transparent: true,
      opacity: 0.90,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    this.legalDarkInnerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffd475'),
      transparent: true,
      opacity: 0.90,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });

    // 6. Capture Reticles
    this.legalCaptureLightMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#c24219'),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    this.legalCaptureDarkMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#e06a34'),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });

    // 7. Check Notification
    this.checkMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#d42a1c'),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.checkRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff4d3b'),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
  }

  setSelected(square) {
    if (this.selectedGroup) {
      this.group.remove(this.selectedGroup);
      this.selectedGroup = null;
    }
    if (!square) return;

    const pos = squareToWorld(square);
    const isLight = isLightSquare(square);

    const group = new THREE.Group();

    // High-contrast filled face
    const faceMesh = new THREE.Mesh(
      this.faceGeo,
      isLight ? this.selectedLightFaceMat : this.selectedDarkFaceMat
    );
    faceMesh.rotation.x = -Math.PI / 2;
    faceMesh.position.y = 0.006;
    group.add(faceMesh);

    // Inlaid perimeter border frame
    const borderMesh = new THREE.Mesh(
      this.borderGeo,
      isLight ? this.selectedLightBorderMat : this.selectedDarkBorderMat
    );
    borderMesh.rotation.x = -Math.PI / 2;
    borderMesh.position.y = 0.007;
    group.add(borderMesh);

    group.position.set(pos.x, 0, pos.z);
    this.group.add(group);
    this.selectedGroup = group;
  }

  setLastMove(fromSquare, toSquare) {
    this.lastMoveGroups.forEach((g) => this.group.remove(g));
    this.lastMoveGroups = [];

    [fromSquare, toSquare].filter(Boolean).forEach((sq) => {
      const pos = squareToWorld(sq);
      const isLight = isLightSquare(sq);

      const group = new THREE.Group();

      const faceMesh = new THREE.Mesh(
        this.faceGeo,
        isLight ? this.lastMoveLightFaceMat : this.lastMoveDarkFaceMat
      );
      faceMesh.rotation.x = -Math.PI / 2;
      faceMesh.position.y = 0.004;
      group.add(faceMesh);

      const borderMesh = new THREE.Mesh(
        this.borderGeo,
        isLight ? this.lastMoveLightBorderMat : this.lastMoveDarkBorderMat
      );
      borderMesh.rotation.x = -Math.PI / 2;
      borderMesh.position.y = 0.005;
      group.add(borderMesh);

      group.position.set(pos.x, 0, pos.z);
      this.group.add(group);
      this.lastMoveGroups.push(group);
    });
  }

  setLegalMoves(moves = []) {
    this.legalGroups.forEach((g) => this.group.remove(g));
    this.legalGroups = [];

    moves.forEach((m) => {
      const pos = squareToWorld(m.to);
      const isLight = isLightSquare(m.to);
      const group = new THREE.Group();

      if (m.captured) {
        // High-contrast capture reticle
        const ring = new THREE.Mesh(
          this.legalCaptureOuterGeo,
          isLight ? this.legalCaptureLightMat : this.legalCaptureDarkMat
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.009;
        group.add(ring);
      } else {
        // Dual-layer optic pip: dark shadow rim + luminous center
        const outerDot = new THREE.Mesh(this.legalOuterGeo, this.legalShadowMat);
        outerDot.rotation.x = -Math.PI / 2;
        outerDot.position.y = 0.008;
        group.add(outerDot);

        const innerDot = new THREE.Mesh(
          this.legalInnerGeo,
          isLight ? this.legalLightInnerMat : this.legalDarkInnerMat
        );
        innerDot.rotation.x = -Math.PI / 2;
        innerDot.position.y = 0.009;
        group.add(innerDot);
      }

      group.position.set(pos.x, 0, pos.z);
      this.group.add(group);
      this.legalGroups.push(group);
    });
  }

  setCheck(kingSquare) {
    if (this.checkGroup) {
      this.group.remove(this.checkGroup);
      this.checkGroup = null;
    }
    if (!kingSquare) return;

    const pos = squareToWorld(kingSquare);
    const group = new THREE.Group();

    const checkGeo = new THREE.CircleGeometry(SQUARE_SIZE * 0.44, 32);
    const checkMesh = new THREE.Mesh(checkGeo, this.checkMat);
    checkMesh.rotation.x = -Math.PI / 2;
    checkMesh.position.y = 0.009;
    group.add(checkMesh);

    const ringGeo = new THREE.RingGeometry(SQUARE_SIZE * 0.44, SQUARE_SIZE * 0.47, 32);
    const ringMesh = new THREE.Mesh(ringGeo, this.checkRingMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.010;
    group.add(ringMesh);

    group.position.set(pos.x, 0, pos.z);
    this.group.add(group);
    this.checkGroup = group;
  }

  clear() {
    this.setSelected(null);
    this.setLastMove(null, null);
    this.setLegalMoves([]);
    this.setCheck(null);

    // Guaranteed complete flush of any lingering highlight meshes
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.selectedGroup = null;
    this.lastMoveGroups = [];
    this.legalGroups = [];
    this.checkGroup = null;
  }
}
