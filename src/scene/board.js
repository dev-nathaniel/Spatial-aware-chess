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
 * Highlight overlay manager
 */
export class HighlightManager {
  constructor(highlightsGroup) {
    this.group = highlightsGroup;
    this.selectedMesh = null;
    this.lastMoveMeshes = [];
    this.legalMeshes = [];
    this.checkMesh = null;

    // Materials
    this.selectedMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#d9a85b'),
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    this.lastMoveMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#c59146'),
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });

    this.checkMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#d43f2a'),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    this.legalDotMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ecd29c'),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    this.legalRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#e0a752'),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  setSelected(square) {
    if (this.selectedMesh) {
      this.group.remove(this.selectedMesh);
      this.selectedMesh.geometry.dispose();
      this.selectedMesh = null;
    }
    if (!square) return;

    const pos = squareToWorld(square);
    const geo = new THREE.PlaneGeometry(SQUARE_SIZE * 0.94, SQUARE_SIZE * 0.94);
    this.selectedMesh = new THREE.Mesh(geo, this.selectedMat);
    this.selectedMesh.rotation.x = -Math.PI / 2;
    this.selectedMesh.position.set(pos.x, 0.007, pos.z);
    this.group.add(this.selectedMesh);
  }

  setLastMove(fromSquare, toSquare) {
    this.lastMoveMeshes.forEach((m) => {
      this.group.remove(m);
      m.geometry.dispose();
    });
    this.lastMoveMeshes = [];

    [fromSquare, toSquare].filter(Boolean).forEach((sq) => {
      const pos = squareToWorld(sq);
      const geo = new THREE.PlaneGeometry(SQUARE_SIZE * 0.94, SQUARE_SIZE * 0.94);
      const mesh = new THREE.Mesh(geo, this.lastMoveMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pos.x, 0.006, pos.z);
      this.group.add(mesh);
      this.lastMoveMeshes.push(mesh);
    });
  }

  setLegalMoves(moves = []) {
    this.legalMeshes.forEach((m) => {
      this.group.remove(m);
      m.geometry.dispose();
    });
    this.legalMeshes = [];

    moves.forEach((m) => {
      const pos = squareToWorld(m.to);
      let mesh;
      if (m.captured) {
        // Outer ring indicator on enemy piece
        const geo = new THREE.RingGeometry(SQUARE_SIZE * 0.38, SQUARE_SIZE * 0.44, 32);
        mesh = new THREE.Mesh(geo, this.legalRingMat);
      } else {
        // Smooth center optic pip
        const geo = new THREE.CircleGeometry(SQUARE_SIZE * 0.16, 24);
        mesh = new THREE.Mesh(geo, this.legalDotMat);
      }
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pos.x, 0.008, pos.z);
      this.group.add(mesh);
      this.legalMeshes.push(mesh);
    });
  }

  setCheck(kingSquare) {
    if (this.checkMesh) {
      this.group.remove(this.checkMesh);
      this.checkMesh.geometry.dispose();
      this.checkMesh = null;
    }
    if (!kingSquare) return;

    const pos = squareToWorld(kingSquare);
    const geo = new THREE.CircleGeometry(SQUARE_SIZE * 0.44, 32);
    this.checkMesh = new THREE.Mesh(geo, this.checkMat);
    this.checkMesh.rotation.x = -Math.PI / 2;
    this.checkMesh.position.set(pos.x, 0.009, pos.z);
    this.group.add(this.checkMesh);
  }

  clear() {
    this.setSelected(null);
    this.setLegalMoves([]);
    this.setCheck(null);
  }
}
