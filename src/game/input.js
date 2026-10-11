import * as THREE from 'three';
import { worldToSquare, squareToWorld } from '../scene/board.js';

export class InputManager {
  constructor(canvas, camera, board, onSelectPiece, onAttemptMove, getPieceAtSquare, onInvalidSelect, animator) {
    this.canvas = canvas;
    this.camera = camera;
    this.board = board;
    this.onSelectPiece = onSelectPiece;
    this.onAttemptMove = onAttemptMove;
    this.getPieceAtSquare = getPieceAtSquare;
    this.onInvalidSelect = onInvalidSelect;
    this.animator = animator;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.65); // Plane at y = 0.65
    this.intersectionPoint = new THREE.Vector3();

    this.selectedSquare = null;
    this.selectedPieceMesh = null;
    this.isDragging = false;
    this.wasAlreadySelected = false;
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

    // 1. Raycast interactive pieces
    const pieceIntersects = this.raycaster.intersectObjects(this.interactablePieces, true);
    let clickedPiece = null;
    let clickedSquare = null;

    if (pieceIntersects.length > 0) {
      let hitMesh = pieceIntersects[0].object;
      while (hitMesh && !hitMesh.userData.isPiece && hitMesh.parent) {
        hitMesh = hitMesh.parent;
      }
      if (hitMesh && hitMesh.userData.isPiece) {
        clickedPiece = hitMesh;
        clickedSquare = hitMesh.userData.square;
      }
    }

    // 2. Raycast board squares
    const squareIntersects = this.raycaster.intersectObjects(
      Array.from(this.board.squares.values()),
      false
    );
    if (squareIntersects.length > 0) {
      const sq = squareIntersects[0].object.userData.square;
      if (!clickedSquare) clickedSquare = sq;

      // If user clicked the square tile under a piece, resolve the piece
      if (!clickedPiece && this.getPieceAtSquare) {
        const pieceOnSq = this.getPieceAtSquare(sq);
        if (pieceOnSq && pieceOnSq.userData.isPiece) {
          clickedPiece = pieceOnSq;
        }
      }
    }

    // 3. Process the resolved target
    if (clickedPiece) {
      const sq = clickedSquare || clickedPiece.userData.square;

      // Friendly piece of the active player
      if (clickedPiece.userData.isMovable) {
        this.dragStartPos.set(clickedPiece.position.x, 0, clickedPiece.position.z);

        if (this.selectedPieceMesh === clickedPiece) {
          this.wasAlreadySelected = true;
        } else {
          this.wasAlreadySelected = false;
          this.selectPiece(clickedPiece, sq); // Floats up!
        }

        this.isDragging = true;
        if (this.orbitControls) this.orbitControls.enabled = false;
        return;
      }

      // Opponent piece
      if (this.selectedSquare) {
        // Attempt capture
        this.onAttemptMove(this.selectedSquare, sq);
        return;
      } else {
        // Opponent piece clicked without a friendly piece selected
        if (this.onInvalidSelect) {
          this.onInvalidSelect();
        }
        this.clearSelection();
        return;
      }
    }

    // Clicked an empty board square
    if (clickedSquare) {
      if (this.selectedSquare) {
        // Attempt move to square
        this.onAttemptMove(this.selectedSquare, clickedSquare);
      } else {
        this.clearSelection();
      }
      return;
    }

    // Clicked outside the board
    this.clearSelection();
  }

  onPointerMove(e) {
    if (!this.enabled) return;
    this.updateMouseCoords(e);

    if (this.isDragging && this.selectedPieceMesh) {
      const dragDist = Math.hypot(
        e.clientX - this.pointerDownPos.x,
        e.clientY - this.pointerDownPos.y
      );

      // Elevate higher and follow cursor while dragging across board
      if (dragDist > 6) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectionPoint)) {
          this.selectedPieceMesh.position.x = this.intersectionPoint.x;
          this.selectedPieceMesh.position.z = this.intersectionPoint.z;
          this.selectedPieceMesh.position.y = 0.65; // High hover height while dragging
        }
      }
      return;
    }

    // Hover effect: update cursor
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const pieceIntersects = this.raycaster.intersectObjects(this.interactablePieces, true);
    let isHoveringInteractive = false;

    if (pieceIntersects.length > 0) {
      let hitMesh = pieceIntersects[0].object;
      while (hitMesh && !hitMesh.userData.isPiece && hitMesh.parent) {
        hitMesh = hitMesh.parent;
      }
      if (hitMesh && hitMesh.userData.isPiece) {
        if (hitMesh.userData.isMovable) {
          isHoveringInteractive = true;
        } else if (this.selectedSquare) {
          isHoveringInteractive = true; // Can capture
        }
      }
    } else {
      // Check hover on squares
      const squareIntersects = this.raycaster.intersectObjects(
        Array.from(this.board.squares.values()),
        false
      );
      if (squareIntersects.length > 0) {
        const sq = squareIntersects[0].object.userData.square;
        if (this.getPieceAtSquare) {
          const pieceOnSq = this.getPieceAtSquare(sq);
          if (pieceOnSq && pieceOnSq.userData.isMovable) {
            isHoveringInteractive = true;
          }
        }
        if (this.selectedSquare) {
          isHoveringInteractive = true;
        }
      }
    }

    this.canvas.style.cursor = isHoveringInteractive ? 'pointer' : 'default';
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
      // Restore horizontal position
      this.selectedPieceMesh.position.x = this.dragStartPos.x;
      this.selectedPieceMesh.position.z = this.dragStartPos.z;

      if (dropSquare && dropSquare !== this.selectedSquare) {
        const fromSq = this.selectedSquare;
        this.onAttemptMove(fromSq, dropSquare);
        return;
      } else {
        // Snapped back to original square: keep floating selected!
        if (this.animator) {
          this.animator.animateLift(this.selectedPieceMesh, 0.35);
        } else {
          this.selectedPieceMesh.position.y = 0.35;
        }
      }
    } else {
      // Click without dragging
      if (this.wasAlreadySelected) {
        // Second click on the same selected piece toggles selection off
        this.clearSelection();
        return;
      } else {
        // Floating selected
        if (this.animator) {
          this.animator.animateLift(this.selectedPieceMesh, 0.35);
        } else {
          this.selectedPieceMesh.position.y = 0.35;
        }
      }
    }
  }

  selectPiece(mesh, square) {
    if (this.selectedPieceMesh && this.selectedPieceMesh !== mesh) {
      // Lower previous piece smoothly
      if (this.animator) {
        this.animator.animateDrop(this.selectedPieceMesh);
      } else {
        this.selectedPieceMesh.position.y = 0;
      }
    }

    this.selectedSquare = square;
    this.selectedPieceMesh = mesh;

    // Smoothly float the newly selected piece into the air
    if (this.animator) {
      this.animator.animateLift(mesh, 0.35);
    } else {
      mesh.position.y = 0.35;
    }

    this.onSelectPiece(square);
  }

  clearSelection() {
    if (this.selectedPieceMesh) {
      // Lower selected piece back to board level
      if (this.animator) {
        this.animator.animateDrop(this.selectedPieceMesh);
      } else {
        this.selectedPieceMesh.position.y = 0;
      }
      this.selectedPieceMesh = null;
    }
    this.selectedSquare = null;
    this.isDragging = false;
    this.wasAlreadySelected = false;
    if (this.orbitControls) this.orbitControls.enabled = true;
    this.onSelectPiece(null);
  }
}
