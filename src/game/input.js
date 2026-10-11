import * as THREE from 'three';
import { worldToSquare, squareToWorld } from '../scene/board.js';

export class InputManager {
  constructor(canvas, camera, board, onSelectPiece, onAttemptMove) {
    this.canvas = canvas;
    this.camera = camera;
    this.board = board;
    this.onSelectPiece = onSelectPiece;
    this.onAttemptMove = onAttemptMove;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6); // Plane at y = 0.6
    this.intersectionPoint = new THREE.Vector3();

    this.selectedSquare = null;
    this.selectedPieceMesh = null;
    this.isDragging = false;
    this.dragStartPos = new THREE.Vector3();
    this.pointerDownPos = new THREE.Vector2();

    this.enabled = true;
    this.interactablePieces = []; // array of piece meshes
    this.orbitControls = null;

    this.bindEvents();
  }

  setInteractablePieces(pieces) {
    this.interactablePieces = pieces;
  }

  setOrbitControls(controls) {
    this.orbitControls = controls;
  }

  bindEvents() {
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  updateMouseCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onPointerDown(e) {
    if (!this.enabled || e.button !== 0) return; // Left click only
    this.updateMouseCoords(e);
    this.pointerDownPos.set(e.clientX, e.clientY);

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Check if clicking on an interactive piece
    const pieceIntersects = this.raycaster.intersectObjects(this.interactablePieces, true);
    if (pieceIntersects.length > 0) {
      let hitMesh = pieceIntersects[0].object;
      while (hitMesh.parent && !hitMesh.userData.isPiece) {
        hitMesh = hitMesh.parent;
      }

      if (hitMesh.userData.isPiece) {
        const sq = hitMesh.userData.square;

        // If clicking on our own piece
        if (hitMesh.userData.isMovable) {
          this.selectPiece(hitMesh, sq);
          this.isDragging = true;
          this.dragStartPos.copy(hitMesh.position);
          if (this.orbitControls) this.orbitControls.enabled = false;
          return;
        }

        // If enemy piece and already have a selected piece -> attempt capture
        if (this.selectedSquare && !hitMesh.userData.isMovable) {
          this.onAttemptMove(this.selectedSquare, sq);
          return;
        }
      }
    }

    // 2. Check if clicking on a board square
    const squareIntersects = this.raycaster.intersectObjects(
      Array.from(this.board.squares.values()),
      false
    );
    if (squareIntersects.length > 0) {
      const clickedSquare = squareIntersects[0].object.userData.square;
      if (this.selectedSquare) {
        // Attempt move to square
        this.onAttemptMove(this.selectedSquare, clickedSquare);
      }
    } else {
      this.clearSelection();
    }
  }

  onPointerMove(e) {
    if (!this.enabled) return;
    this.updateMouseCoords(e);

    if (this.isDragging && this.selectedPieceMesh) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectionPoint)) {
        this.selectedPieceMesh.position.x = this.intersectionPoint.x;
        this.selectedPieceMesh.position.z = this.intersectionPoint.z;
        this.selectedPieceMesh.position.y = 0.6; // Hover height while dragging
      }
      return;
    }

    // Hover effect: update cursor
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const pieceIntersects = this.raycaster.intersectObjects(this.interactablePieces, true);
    let isHoveringMovable = false;
    if (pieceIntersects.length > 0) {
      let hitMesh = pieceIntersects[0].object;
      while (hitMesh.parent && !hitMesh.userData.isPiece) {
        hitMesh = hitMesh.parent;
      }
      if (hitMesh.userData.isPiece && hitMesh.userData.isMovable) {
        isHoveringMovable = true;
      }
    }
    this.canvas.style.cursor = isHoveringMovable ? 'pointer' : 'default';
  }

  onPointerUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    if (this.orbitControls) this.orbitControls.enabled = true;

    if (!this.selectedPieceMesh) return;

    const dragDist = Math.hypot(
      e.clientX - this.pointerDownPos.x,
      e.clientY - this.pointerDownPos.y
    );

    // If released after actual dragging (moved more than 6px)
    if (dragDist > 6) {
      const dropSquare = worldToSquare(this.selectedPieceMesh.position);
      if (dropSquare && dropSquare !== this.selectedSquare) {
        // Move attempted via drag drop
        const fromSq = this.selectedSquare;
        this.selectedPieceMesh.position.copy(this.dragStartPos);
        this.onAttemptMove(fromSq, dropSquare);
        return;
      }
    }

    // Snap piece back to its square if move not executed
    if (this.selectedPieceMesh) {
      this.selectedPieceMesh.position.copy(this.dragStartPos);
      this.selectedPieceMesh.position.y = 0.3; // Keep slightly lifted while selected
    }
  }

  selectPiece(mesh, square) {
    if (this.selectedPieceMesh && this.selectedPieceMesh !== mesh) {
      this.selectedPieceMesh.position.y = 0;
    }
    this.selectedSquare = square;
    this.selectedPieceMesh = mesh;
    mesh.position.y = 0.3;
    this.onSelectPiece(square);
  }

  clearSelection() {
    if (this.selectedPieceMesh) {
      this.selectedPieceMesh.position.y = 0;
      this.selectedPieceMesh = null;
    }
    this.selectedSquare = null;
    this.isDragging = false;
    if (this.orbitControls) this.orbitControls.enabled = true;
    this.onSelectPiece(null);
  }
}
