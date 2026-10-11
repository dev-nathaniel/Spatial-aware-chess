import * as THREE from 'three';
import { Chess } from 'chess.js';
import { squareToWorld } from '../scene/board.js';
import { getPieceGeometry, createFeltPadGeometry, PIECE_RADII } from '../scene/pieces/factory.js';
import { sound } from '../audio/sound.js';
import { StockfishEngine } from './ai/stockfish.js';
import { Animator } from './animator.js';
import { InputManager } from './input.js';

export class GameController {
  constructor({ scene, cameraManager, board, materials, ui }) {
    this.scene = scene;
    this.cameraManager = cameraManager;
    this.board = board;
    this.materials = materials;
    this.ui = ui;

    this.chess = new Chess();
    this.ai = new StockfishEngine();
    this.animator = new Animator();

    this.pieceMeshes = new Map(); // square -> mesh
    this.piecesGroup = new THREE.Group();
    this.piecesGroup.name = 'PiecesGroup';
    this.scene.add(this.piecesGroup);

    // Game configuration
    this.mode = 'ai'; // 'ai' or 'local'
    this.playerColor = 'w'; // 'w' or 'b'
    this.flipped = false;
    this.rotateOnTurn = true;
    this.showLegal = true;

    // Time controls
    this.timeControl = 'none';
    this.whiteTime = 0;
    this.blackTime = 0;
    this.increment = 0;
    this.clockInterval = null;
    this.lastClockTick = 0;

    // Input manager
    this.input = new InputManager(
      this.cameraManager.controls.domElement,
      this.cameraManager.camera,
      this.board,
      this.onSelectSquare.bind(this),
      this.onAttemptMove.bind(this)
    );
    this.input.setOrbitControls(this.cameraManager.controls);

    this.isAiThinking = false;
    this.gameOver = false;
  }

  startNewGame({ mode = 'ai', color = 'w', level = 3, time = 'none' }) {
    this.mode = mode;
    this.playerColor = color === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : color;
    this.timeControl = time;
    this.gameOver = false;
    this.isAiThinking = false;

    this.ai.setLevel(level);

    // Setup clocks
    this.initClocks(time);

    // Reset chess.js state
    this.chess.reset();
    this.animator.resetCapturedCounts();
    this.board.highlightManager.clear();

    // Spawn 3D pieces
    this.spawnAllPieces();

    // Camera orientation
    this.flipped = this.playerColor === 'b';
    this.cameraManager.transitionTo(this.flipped ? 'black' : 'white');

    this.updateGameStateUI();

    // If human is Black and playing vs AI, AI makes the first move
    if (this.mode === 'ai' && this.playerColor === 'b') {
      setTimeout(() => this.makeAiMove(), 600);
    }
  }

  initClocks(time) {
    if (this.clockInterval) clearInterval(this.clockInterval);

    if (time === 'none') {
      this.whiteTime = 0;
      this.blackTime = 0;
      this.increment = 0;
      return;
    }

    const [mins, inc] = time.split('+').map(Number);
    this.whiteTime = mins * 60;
    this.blackTime = mins * 60;
    this.increment = inc || 0;
    this.lastClockTick = performance.now();

    this.clockInterval = setInterval(() => {
      if (this.gameOver || this.timeControl === 'none') return;
      const now = performance.now();
      const delta = (now - this.lastClockTick) / 1000;
      this.lastClockTick = now;

      if (this.chess.turn() === 'w') {
        this.whiteTime = Math.max(0, this.whiteTime - delta);
        if (this.whiteTime <= 0) this.onTimeOut('w');
      } else {
        this.blackTime = Math.max(0, this.blackTime - delta);
        if (this.blackTime <= 0) this.onTimeOut('b');
      }

      this.updatePlayerCards();
    }, 100);
  }

  onTimeOut(color) {
    this.gameOver = true;
    const winner = color === 'w' ? 'Black' : 'White';
    sound.playGameEnd(winner[0].toLowerCase() === this.playerColor);
    this.ui.showGameOver(true, 'Time Out', `${winner} wins on time.`);
  }

  spawnAllPieces() {
    // Clear existing meshes
    while (this.piecesGroup.children.length > 0) {
      const obj = this.piecesGroup.children[0];
      this.piecesGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    this.pieceMeshes.clear();

    const boardState = this.chess.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardState[r][c];
        if (piece) {
          const square = `${files[c]}${8 - r}`;
          this.createPieceMesh(piece.type, piece.color, square);
        }
      }
    }

    this.updateInteractablePieces();
  }

  createPieceMesh(type, color, square) {
    const geo = getPieceGeometry(type);
    const mat = color === 'w' ? this.materials.whitePiece : this.materials.blackPiece;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Green felt underside
    const radius = PIECE_RADII[type] || 0.52;
    const feltGeo = createFeltPadGeometry(radius);
    const feltMesh = new THREE.Mesh(feltGeo, this.materials.felt);
    mesh.add(feltMesh);

    // Initial position
    const pos = squareToWorld(square);
    mesh.position.set(pos.x, 0, pos.z);

    // Knights face the opposing army
    if (type === 'n') {
      mesh.rotation.y = color === 'w' ? -Math.PI / 2 : Math.PI / 2;
    }

    mesh.userData = {
      isPiece: true,
      type,
      color,
      square,
      isMovable: false,
    };

    this.piecesGroup.add(mesh);
    this.pieceMeshes.set(square, mesh);
    return mesh;
  }

  updateInteractablePieces() {
    const turn = this.chess.turn();
    const isHumanTurn =
      this.mode === 'local' || (this.mode === 'ai' && turn === this.playerColor);

    const interactables = [];
    this.pieceMeshes.forEach((mesh) => {
      const isMovable = !this.gameOver && !this.isAiThinking && isHumanTurn && mesh.userData.color === turn;
      mesh.userData.isMovable = isMovable;
      interactables.push(mesh);
    });

    this.input.setInteractablePieces(interactables);
  }

  onSelectSquare(square) {
    if (!square || !this.showLegal) {
      this.board.highlightManager.setSelected(null);
      this.board.highlightManager.setLegalMoves([]);
      return;
    }

    this.board.highlightManager.setSelected(square);
    const moves = this.chess.moves({ square, verbose: true });
    this.board.highlightManager.setLegalMoves(moves);
  }

  async onAttemptMove(fromSquare, toSquare) {
    if (this.gameOver || this.isAiThinking || this.animator.isAnimating()) return;

    // Find legal move matching from & to
    const legalMoves = this.chess.moves({ verbose: true });
    const matches = legalMoves.filter((m) => m.from === fromSquare && m.to === toSquare);

    if (matches.length === 0) {
      // Not a valid move
      this.input.clearSelection();
      return;
    }

    let promotion = undefined;
    if (matches.some((m) => m.promotion)) {
      // Pawn reached back rank: show promotion dialog
      promotion = await this.ui.showPromotion(this.chess.turn());
      if (!promotion) {
        this.input.clearSelection();
        return;
      }
    }

    this.input.clearSelection();
    this.executeMove({ from: fromSquare, to: toSquare, promotion });
  }

  executeMove({ from, to, promotion }) {
    const pieceMesh = this.pieceMeshes.get(from);
    if (!pieceMesh) return;

    // Apply move in chess.js
    let moveObj;
    try {
      moveObj = this.chess.move({ from, to, promotion });
    } catch {
      return;
    }

    if (!moveObj) return;

    // Add time increment
    if (this.timeControl !== 'none') {
      if (moveObj.color === 'w') this.whiteTime += this.increment;
      else this.blackTime += this.increment;
    }

    // Check for captured piece
    const capturedMesh = this.pieceMeshes.get(to);
    if (capturedMesh) {
      this.pieceMeshes.delete(to);
      this.animator.animateCapture(capturedMesh, capturedMesh.userData.color, () => {
        // Retain on side tray
      });
      sound.playCapture();
    } else {
      sound.playMove(moveObj.piece);
    }

    // Move piece mesh mapping
    this.pieceMeshes.delete(from);
    this.pieceMeshes.set(to, pieceMesh);
    pieceMesh.userData.square = to;

    // Handle Castling
    if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
      // King moved, also move rook
      sound.playCastle();
      let rookFrom, rookTo;
      if (to === 'g1') { rookFrom = 'h1'; rookTo = 'f1'; }
      else if (to === 'c1') { rookFrom = 'a1'; rookTo = 'd1'; }
      else if (to === 'g8') { rookFrom = 'h8'; rookTo = 'f8'; }
      else if (to === 'c8') { rookFrom = 'a8'; rookTo = 'd8'; }

      const rookMesh = this.pieceMeshes.get(rookFrom);
      if (rookMesh) {
        this.pieceMeshes.delete(rookFrom);
        this.pieceMeshes.set(rookTo, rookMesh);
        rookMesh.userData.square = rookTo;
        this.animator.animateMove(rookMesh, rookFrom, rookTo);
      }
    }

    // Handle En Passant
    if (moveObj.flags.includes('e')) {
      const epCaptureSquare = `${to[0]}${from[1]}`;
      const epMesh = this.pieceMeshes.get(epCaptureSquare);
      if (epMesh) {
        this.pieceMeshes.delete(epCaptureSquare);
        this.animator.animateCapture(epMesh, epMesh.userData.color);
        sound.playCapture();
      }
    }

    // Handle Pawn Promotion mesh replacement
    if (promotion) {
      this.piecesGroup.remove(pieceMesh);
      if (pieceMesh.geometry) pieceMesh.geometry.dispose();
      this.createPieceMesh(promotion, moveObj.color, to);
    } else {
      // Normal move animation
      this.animator.animateMove(pieceMesh, from, to);
    }

    // Board highlights
    this.board.highlightManager.setLastMove(from, to);
    this.board.highlightManager.setSelected(null);
    this.board.highlightManager.setLegalMoves([]);

    // Check status
    if (this.chess.inCheck()) {
      sound.playCheck();
      const kingSquare = this.findKingSquare(this.chess.turn());
      this.board.highlightManager.setCheck(kingSquare);
    } else {
      this.board.highlightManager.setCheck(null);
    }

    this.updateGameStateUI();

    // Check game over
    if (this.chess.isGameOver()) {
      this.handleGameOver();
      return;
    }

    // Camera rotation for local 2-player mode
    if (this.mode === 'local' && this.rotateOnTurn) {
      const isWhiteTurn = this.chess.turn() === 'w';
      this.cameraManager.transitionTo(isWhiteTurn ? 'white' : 'black');
    }

    // Trigger AI if it's AI's turn
    if (this.mode === 'ai' && this.chess.turn() !== this.playerColor) {
      this.makeAiMove();
    }
  }

  async makeAiMove() {
    this.isAiThinking = true;
    this.updateGameStateUI();

    const fen = this.chess.fen();
    const uciMove = await this.ai.getBestMove(fen, this.chess);

    this.isAiThinking = false;
    if (!uciMove || this.gameOver) {
      this.updateGameStateUI();
      return;
    }

    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

    this.executeMove({ from, to, promotion });
  }

  findKingSquare(color) {
    const board = this.chess.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) {
          return `${files[c]}${8 - r}`;
        }
      }
    }
    return null;
  }

  handleGameOver() {
    this.gameOver = true;
    if (this.clockInterval) clearInterval(this.clockInterval);

    if (this.chess.isCheckmate()) {
      const loserColor = this.chess.turn();
      const winner = loserColor === 'w' ? 'Black' : 'White';
      const isHumanWin = winner[0].toLowerCase() === this.playerColor;

      // Topple the defeated king
      const kingSquare = this.findKingSquare(loserColor);
      const kingMesh = this.pieceMeshes.get(kingSquare);
      if (kingMesh) this.animator.toppleKing(kingMesh);

      sound.playGameEnd(isHumanWin);
      this.ui.showGameOver(true, 'Checkmate', `${winner} wins by checkmate!`);
    } else if (this.chess.isDraw()) {
      let reason = 'Draw';
      if (this.chess.isStalemate()) reason = 'Stalemate';
      else if (this.chess.isThreefoldRepetition()) reason = 'Threefold Repetition';
      else if (this.chess.isInsufficientMaterial()) reason = 'Insufficient Material';
      sound.playGameEnd(false);
      this.ui.showGameOver(true, reason, 'The game ended in a draw.');
    }
  }

  undo() {
    if (this.gameOver || this.isAiThinking || this.animator.isAnimating()) return;

    // In vs AI mode: undo 2 half-moves (both AI and human)
    const undoCount = this.mode === 'ai' ? 2 : 1;
    for (let i = 0; i < undoCount; i++) {
      if (this.chess.history().length > 0) {
        this.chess.undo();
      }
    }

    this.spawnAllPieces();
    this.board.highlightManager.clear();
    this.updateGameStateUI();
    this.ui.showToast('Move taken back');
  }

  async hint() {
    if (this.gameOver || this.isAiThinking) return;
    this.ui.showToast('Evaluating optimal move…');
    const uciMove = await this.ai.getBestMove(this.chess.fen(), this.chess);
    if (uciMove) {
      const from = uciMove.slice(0, 2);
      const to = uciMove.slice(2, 4);
      this.board.highlightManager.setLastMove(from, to);
      this.ui.showToast(`Hint: ${from} → ${to}`);
    }
  }

  flipBoard() {
    this.flipped = !this.flipped;
    this.cameraManager.transitionTo(this.flipped ? 'black' : 'white');
  }

  resign() {
    if (this.gameOver) return;
    this.gameOver = true;
    if (this.clockInterval) clearInterval(this.clockInterval);

    const winner = this.playerColor === 'w' ? 'Black' : 'White';
    sound.playGameEnd(false);
    this.ui.showGameOver(true, 'Resignation', `${winner} wins by resignation.`);
  }

  loadFEN(fen) {
    try {
      this.chess.load(fen);
      this.spawnAllPieces();
      this.board.highlightManager.clear();
      this.updateGameStateUI();
      this.ui.showToast('Position loaded successfully');
      this.ui.showSettings(false);
    } catch {
      this.ui.showToast('Invalid FEN string', true);
    }
  }

  updateGameStateUI() {
    this.updatePlayerCards();

    // Status text
    let statusText = '';
    const turnName = this.chess.turn() === 'w' ? 'White' : 'Black';
    if (this.gameOver) {
      statusText = 'Game Over';
    } else if (this.isAiThinking) {
      statusText = 'Computer is thinking…';
    } else if (this.chess.inCheck()) {
      statusText = `${turnName} is in Check!`;
    } else {
      statusText = `${turnName} to move`;
    }
    this.ui.updateStatus(statusText, this.chess.inCheck());

    // Move history
    this.ui.updateMoveList(this.chess.history({ verbose: true }));

    this.updateInteractablePieces();
  }

  updatePlayerCards() {
    const turn = this.chess.turn();
    const captured = this.getCapturedPieces();

    const formatTime = (secs) => {
      if (this.timeControl === 'none') return null;
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Calculate material advantage
    const pieceVals = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let whiteMaterial = 0;
    let blackMaterial = 0;
    captured.b.forEach((p) => (whiteMaterial += pieceVals[p] || 0));
    captured.w.forEach((p) => (blackMaterial += pieceVals[p] || 0));

    const whiteAdv = Math.max(0, whiteMaterial - blackMaterial);
    const blackAdv = Math.max(0, blackMaterial - whiteMaterial);

    const isBottomWhite = !this.flipped;

    const whitePlayer = {
      name: this.mode === 'ai' && this.playerColor === 'b' ? 'Computer (Stockfish)' : 'White',
      color: 'w',
      active: turn === 'w',
      thinking: this.isAiThinking && turn === 'w',
      timeStr: formatTime(this.whiteTime),
      isLowTime: this.whiteTime < 30 && this.timeControl !== 'none',
      captured: captured.b,
      advantage: whiteAdv,
    };

    const blackPlayer = {
      name: this.mode === 'ai' && this.playerColor === 'w' ? 'Computer (Stockfish)' : 'Black',
      color: 'b',
      active: turn === 'b',
      thinking: this.isAiThinking && turn === 'b',
      timeStr: formatTime(this.blackTime),
      isLowTime: this.blackTime < 30 && this.timeControl !== 'none',
      captured: captured.w,
      advantage: blackAdv,
    };

    const top = isBottomWhite ? blackPlayer : whitePlayer;
    const bottom = isBottomWhite ? whitePlayer : blackPlayer;
    this.ui.updatePlayerCards(top, bottom);
  }

  getCapturedPieces() {
    const initial = {
      w: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
      b: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    };
    const board = this.chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          initial[p.color][p.type]--;
        }
      }
    }

    const capturedW = [];
    const capturedB = [];
    ['q', 'r', 'b', 'n', 'p'].forEach((t) => {
      for (let i = 0; i < initial.w[t]; i++) capturedW.push(t);
      for (let i = 0; i < initial.b[t]; i++) capturedB.push(t);
    });

    return { w: capturedW, b: capturedB };
  }

  update() {
    this.animator.update();
  }
}
