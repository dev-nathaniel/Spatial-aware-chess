import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const CAMERA_PRESETS = {
  white: {
    position: new THREE.Vector3(0, 19, 23),
    target: new THREE.Vector3(0, 0.2, 0),
  },
  black: {
    position: new THREE.Vector3(0, 19, -23),
    target: new THREE.Vector3(0, 0.2, 0),
  },
  top: {
    position: new THREE.Vector3(0, 31, 0.01),
    target: new THREE.Vector3(0, 0, 0),
  },
  cinematic: {
    position: new THREE.Vector3(18, 16, 18),
    target: new THREE.Vector3(0, 0.4, 0),
  },
};

export class CameraManager {
  constructor(canvas) {
    this.camera = new THREE.PerspectiveCamera(
      38, // Telephoto FOV for natural, cinematic proportions
      window.innerWidth / window.innerHeight,
      0.5,
      120
    );
    this.camera.position.copy(CAMERA_PRESETS.white.position);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.copy(CAMERA_PRESETS.white.target);
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08; // Prevent viewing underneath table
    this.controls.minDistance = 12.0;
    this.controls.maxDistance = 46.0;

    this.currentViewKey = 'white';
    this.animating = false;
    this.animStart = 0;
    this.animDuration = 1100;
    this.startPos = new THREE.Vector3();
    this.endPos = new THREE.Vector3();
    this.startTarget = new THREE.Vector3();
    this.endTarget = new THREE.Vector3();
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  transitionTo(presetKey, duration = 1200) {
    const targetPreset = CAMERA_PRESETS[presetKey];
    if (!targetPreset) return;

    this.currentViewKey = presetKey;
    this.animating = true;
    this.animStart = performance.now();
    this.animDuration = duration;

    this.startPos.copy(this.camera.position);
    this.endPos.copy(targetPreset.position);
    this.startTarget.copy(this.controls.target);
    this.endTarget.copy(targetPreset.target);
  }

  cycleView() {
    const keys = ['white', 'black', 'top', 'cinematic'];
    const nextIdx = (keys.indexOf(this.currentViewKey) + 1) % keys.length;
    this.transitionTo(keys[nextIdx]);
    return keys[nextIdx];
  }

  update() {
    if (this.animating) {
      const now = performance.now();
      const elapsed = now - this.animStart;
      const progress = Math.min(1, elapsed / this.animDuration);

      // Smooth easeInOutCubic
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.camera.position.lerpVectors(this.startPos, this.endPos, ease);
      this.controls.target.lerpVectors(this.startTarget, this.endTarget, ease);

      if (progress >= 1) {
        this.animating = false;
      }
    }

    this.controls.update();
  }
}
