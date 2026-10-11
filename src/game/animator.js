import * as THREE from 'three';
import { squareToWorld } from '../scene/board.js';

export class Animator {
  constructor() {
    this.activeAnimations = [];
    this.capturedCounts = { w: 0, b: 0 };
  }

  resetCapturedCounts() {
    this.capturedCounts = { w: 0, b: 0 };
  }

  animateMove(pieceMesh, fromSquare, toSquare, onComplete) {
    const start = squareToWorld(fromSquare);
    const end = squareToWorld(toSquare);

    const distance = start.distanceTo(end);
    const duration = Math.min(550, Math.max(300, distance * 55));
    const peakHeight = Math.min(2.4, 0.8 + distance * 0.15);

    const anim = {
      mesh: pieceMesh,
      startTime: performance.now(),
      duration,
      startPos: start.clone(),
      endPos: end.clone(),
      peakHeight,
      onComplete,
      update(now) {
        const elapsed = now - this.startTime;
        const progress = Math.min(1, elapsed / this.duration);

        // Smooth cubic ease-in-out for horizontal travel
        const ease =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        this.mesh.position.x = THREE.MathUtils.lerp(this.startPos.x, this.endPos.x, ease);
        this.mesh.position.z = THREE.MathUtils.lerp(this.startPos.z, this.endPos.z, ease);

        // Parabolic vertical arc + settle bounce at the very end
        if (progress < 0.9) {
          const arcP = progress / 0.9;
          this.mesh.position.y = Math.sin(arcP * Math.PI) * this.peakHeight;
        } else {
          // Landing settle
          const settleP = (progress - 0.9) / 0.1;
          this.mesh.position.y = Math.sin(settleP * Math.PI) * 0.06;
        }

        // Slight dynamic pitch in travel direction
        const dx = this.endPos.x - this.startPos.x;
        const dz = this.endPos.z - this.startPos.z;
        const tiltFactor = Math.sin(progress * Math.PI) * 0.08;
        this.mesh.rotation.z = -dx * tiltFactor * 0.05;
        this.mesh.rotation.x = dz * tiltFactor * 0.05;

        if (progress >= 1) {
          this.mesh.position.copy(this.endPos);
          this.mesh.position.y = 0;
          this.mesh.rotation.x = 0;
          this.mesh.rotation.z = 0;
          return true; // Finished
        }
        return false;
      },
    };

    this.activeAnimations.push(anim);
  }

  animateCapture(pieceMesh, pieceColor, onComplete) {
    const currentPos = pieceMesh.position.clone();

    // Place captured pieces neatly along the mahogany side margins
    const sideX = pieceColor === 'w' ? 11.5 : -11.5;
    const index = this.capturedCounts[pieceColor]++;
    const sideZ = -7.0 + (index % 8) * 2.0;
    const secondRowOffset = Math.floor(index / 8) * 1.6 * (pieceColor === 'w' ? 1 : -1);
    const targetPos = new THREE.Vector3(sideX + secondRowOffset, 0, sideZ);

    const anim = {
      mesh: pieceMesh,
      startTime: performance.now(),
      duration: 520,
      startPos: currentPos,
      endPos: targetPos,
      update(now) {
        const elapsed = now - this.startTime;
        const progress = Math.min(1, elapsed / this.duration);
        const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        this.mesh.position.lerpVectors(this.startPos, this.endPos, ease);
        this.mesh.position.y = Math.sin(progress * Math.PI) * 1.8;

        if (progress >= 1) {
          this.mesh.position.copy(this.endPos);
          this.mesh.position.y = 0;
          if (onComplete) onComplete();
          return true;
        }
        return false;
      },
    };

    this.activeAnimations.push(anim);
  }

  toppleKing(kingMesh) {
    const startRotX = kingMesh.rotation.x;
    const startRotZ = kingMesh.rotation.z;
    const anim = {
      mesh: kingMesh,
      startTime: performance.now(),
      duration: 700,
      update(now) {
        const elapsed = now - this.startTime;
        const progress = Math.min(1, elapsed / this.duration);
        const ease = 1 - Math.pow(1 - progress, 2);

        this.mesh.rotation.z = startRotZ + ease * (Math.PI / 2.3);
        this.mesh.position.y = Math.max(0, 0.4 * (1 - ease));

        return progress >= 1;
      },
    };
    this.activeAnimations.push(anim);
  }

  update() {
    const now = performance.now();
    for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
      const anim = this.activeAnimations[i];
      const finished = anim.update(now);
      if (finished) {
        if (anim.onComplete) anim.onComplete();
        this.activeAnimations.splice(i, 1);
      }
    }
  }

  isAnimating() {
    return this.activeAnimations.length > 0;
  }
}
