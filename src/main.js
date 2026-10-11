import * as THREE from 'three';
import './styles/index.css';

import { RenderPipeline } from './scene/renderer.js';
import { CameraManager } from './scene/camera.js';
import { loadAllTextures, createMaterials } from './scene/materials.js';
import { setupEnvironment } from './scene/environment.js';
import { createBoard, HighlightManager } from './scene/board.js';
import { sound } from './audio/sound.js';
import { UIController } from './ui/ui.js';
import { GameController } from './game/GameController.js';

async function bootstrap() {
  const canvas = document.getElementById('scene');

  // 1. Scene & Core Renderer
  const scene = new THREE.Scene();
  const renderPipeline = new RenderPipeline(canvas);
  scene.renderer = renderPipeline.renderer;

  // 2. Camera & OrbitControls
  const cameraManager = new CameraManager(canvas);
  renderPipeline.setupPostProcessing(scene, cameraManager.camera);

  // 3. UI Controller Handlers
  let gameController = null;

  const ui = new UIController({
    onToggleView: () => {
      const nextView = cameraManager.cycleView();
      ui.showToast(`View: ${nextView.charAt(0).toUpperCase() + nextView.slice(1)}`);
    },
    onToggleSound: (forcedVal) => {
      if (typeof forcedVal === 'boolean') {
        sound.enabled = forcedVal;
      } else {
        sound.enabled = !sound.enabled;
      }
      ui.setSoundMuted(!sound.enabled);
      ui.showToast(sound.enabled ? 'Sound enabled' : 'Sound muted');
    },
    onQualityChange: (q) => {
      renderPipeline.setQuality(q);
      ui.showToast(`Quality: ${q.charAt(0).toUpperCase() + q.slice(1)}`);
    },
    onToggleLegal: (val) => {
      if (gameController) gameController.showLegal = val;
    },
    onToggleRotate: (val) => {
      if (gameController) gameController.rotateOnTurn = val;
    },
    onUndo: () => {
      if (gameController) gameController.undo();
    },
    onHint: () => {
      if (gameController) gameController.hint();
    },
    onFlip: () => {
      if (gameController) gameController.flipBoard();
    },
    onResign: () => {
      if (gameController) gameController.resign();
    },
    onStartGame: (config) => {
      if (gameController) {
        gameController.startNewGame(config);
      }
    },
    onRematch: () => {
      if (gameController) {
        const config = ui.getMenuConfig();
        gameController.startNewGame(config);
      }
    },
    onCopyPGN: () => {
      if (gameController) {
        const pgn = gameController.chess.pgn();
        navigator.clipboard.writeText(pgn || '1. (no moves)').then(() => {
          ui.showToast('PGN copied to clipboard');
        });
      }
    },
    onCopyFEN: () => {
      if (gameController) {
        const fen = gameController.chess.fen();
        navigator.clipboard.writeText(fen).then(() => {
          ui.showToast('FEN copied to clipboard');
        });
      }
    },
    onLoadFEN: (fen) => {
      if (gameController) gameController.loadFEN(fen);
    },
  });

  // 4. Asset loading progress
  ui.setLoaderProgress(0.15, 'Turning wood pieces…');

  await loadAllTextures((p) => {
    ui.setLoaderProgress(0.15 + p * 0.35, 'Polishing boxwood & walnut veneers…');
  });

  ui.setLoaderProgress(0.55, 'Mixing lacquer clearcoat…');
  const materials = createMaterials();

  ui.setLoaderProgress(0.70, 'Crafting tournament board…');
  const board = createBoard(materials);
  scene.add(board.group);

  const highlightManager = new HighlightManager(board.highlightsGroup);
  board.highlightManager = highlightManager;

  ui.setLoaderProgress(0.85, 'Igniting studio illumination…');
  await setupEnvironment(scene, materials, (p) => {
    ui.setLoaderProgress(0.85 + p * 0.15, 'Reflecting ambient light…');
  });

  // 5. Initialize Game Controller
  gameController = new GameController({
    scene,
    cameraManager,
    board,
    materials,
    ui,
  });

  // 6. Start default initial game on board
  gameController.startNewGame({
    mode: 'ai',
    color: 'w',
    level: 3,
    time: 'none',
  });

  // 7. Hide loader and reveal scene
  ui.setLoaderProgress(1.0, 'Ready');
  setTimeout(() => {
    ui.hideLoader();
  }, 400);

  // 8. Handle Window Resize
  function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    cameraManager.resize(w, h);
    renderPipeline.resize(w, h);
  }
  window.addEventListener('resize', onWindowResize);

  // 9. Main Render Loop
  function animate() {
    requestAnimationFrame(animate);

    cameraManager.update();
    gameController.update();
    renderPipeline.render(scene, cameraManager.camera);
  }
  animate();
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  const statusEl = document.getElementById('loader-status');
  if (statusEl) statusEl.textContent = 'Failed to load: ' + err.message;
});
