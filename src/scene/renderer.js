import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class RenderPipeline {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = 'high';

    // 1. Core WebGL2 Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // 2. Post-processing Composer
    this.composer = null;
    this.bloomPass = null;
    this.renderPass = null;
  }

  setupPostProcessing(scene, camera) {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);

    this.composer = new EffectComposer(this.renderer);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Gentle bloom threshold at 1.35 so flat wood surfaces never bloom
    this.bloomPass = new UnrealBloomPass(size, 0.05, 0.22, 1.35);
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setQuality(quality) {
    this.quality = quality;
    if (quality === 'high') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      if (this.bloomPass) this.bloomPass.enabled = true;
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      if (this.bloomPass) this.bloomPass.enabled = false;
    } else {
      // low
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      if (this.bloomPass) this.bloomPass.enabled = false;
    }
  }

  resize(width, height) {
    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  render(scene, camera) {
    if (this.composer && this.quality !== 'low') {
      this.composer.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }
}
