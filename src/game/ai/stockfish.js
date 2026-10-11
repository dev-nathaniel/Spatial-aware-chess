/**
 * Stockfish 19 WASM Web Worker Controller with pure-JS Minimax fallback.
 */

const LEVEL_CONFIG = {
  1: { depth: 2, skill: 0, movetime: 250, errorRate: 0.35 },
  2: { depth: 3, skill: 3, movetime: 400, errorRate: 0.20 },
  3: { depth: 5, skill: 6, movetime: 600, errorRate: 0.10 },
  4: { depth: 7, skill: 9, movetime: 800, errorRate: 0.04 },
  5: { depth: 9, skill: 12, movetime: 1100, errorRate: 0.0 },
  6: { depth: 12, skill: 15, movetime: 1500, errorRate: 0.0 },
  7: { depth: 15, skill: 18, movetime: 2000, errorRate: 0.0 },
  8: { depth: 18, skill: 20, movetime: 2500, errorRate: 0.0 },
};

export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.pendingResolve = null;
    this.level = 3;
    this.useFallback = false;
    this.evaluation = 0;
    this.onEvaluation = null;

    this.initWorker();
  }

  initWorker() {
    try {
      this.worker = new Worker('/stockfish/stockfish-19-lite-single.js');
      this.worker.onmessage = (e) => this.handleMessage(e.data);
      this.worker.onerror = (err) => {
        console.warn('Stockfish worker error, switching to fallback engine', err);
        this.useFallback = true;
      };

      this.send('uci');
      this.send('isready');
      this.setLevel(this.level);
    } catch (e) {
      console.warn('Failed to start Stockfish Web Worker, using fallback JS engine', e);
      this.useFallback = true;
    }
  }

  send(command) {
    if (this.worker && !this.useFallback) {
      this.worker.postMessage(command);
    }
  }

  setLevel(lvl) {
    this.level = Math.max(1, Math.min(8, lvl));
    const cfg = LEVEL_CONFIG[this.level];
    this.send(`setoption name Skill Level value ${cfg.skill}`);
  }

  handleMessage(line) {
    if (typeof line !== 'string') return;

    if (line === 'readyok' || line === 'uciok') {
      this.ready = true;
      return;
    }

    // Parse score info
    if (line.startsWith('info') && line.includes('score')) {
      const cpMatch = line.match(/score cp (-?\d+)/);
      if (cpMatch) {
        this.evaluation = parseInt(cpMatch[1], 10) / 100;
        if (this.onEvaluation) this.onEvaluation(this.evaluation);
      }
      const mateMatch = line.match(/score mate (-?\d+)/);
      if (mateMatch) {
        const moves = parseInt(mateMatch[1], 10);
        this.evaluation = moves > 0 ? 100 : -100;
        if (this.onEvaluation) this.onEvaluation(this.evaluation);
      }
    }

    // Parse best move
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const moveUci = parts[1];
      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve(moveUci !== '(none)' ? moveUci : null);
      }
    }
  }

  getBestMove(fen, chessInstance) {
    const cfg = LEVEL_CONFIG[this.level];

    // If fallback engine is required
    if (this.useFallback || !this.worker) {
      return Promise.resolve(this.minimaxBestMove(chessInstance, cfg.depth));
    }

    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.send(`position fen ${fen}`);
      this.send(`go depth ${cfg.depth} movetime ${cfg.movetime}`);

      // Safety timeout: if Stockfish doesn't reply in time, fallback to minimax
      setTimeout(() => {
        if (this.pendingResolve === resolve) {
          console.warn('Stockfish timeout, resolving via fallback');
          this.pendingResolve = null;
          resolve(this.minimaxBestMove(chessInstance, 3));
        }
      }, cfg.movetime + 2200);
    });
  }

  /**
   * Lightweight pure-JS Minimax fallback with piece-square evaluation
   */
  minimaxBestMove(chess, maxDepth = 3) {
    if (!chess) return null;
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    // Piece values
    const pieceVals = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    function evaluateBoard(ch) {
      let score = 0;
      const board = ch.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece) {
            const val = pieceVals[piece.type] || 0;
            // Center control bonus
            const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
            const centerBonus = (7 - centerDist) * 3;
            const pieceScore = val + centerBonus;
            score += piece.color === 'w' ? pieceScore : -pieceScore;
          }
        }
      }
      return score;
    }

    const isMaximizing = chess.turn() === 'w';
    let bestMove = moves[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    // Shuffle moves slightly to avoid mechanical identical games
    moves.sort(() => Math.random() - 0.5);

    // Prioritize captures
    moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

    for (const m of moves) {
      chess.move(m);
      const score = this.minimax(chess, maxDepth - 1, -Infinity, Infinity, !isMaximizing, evaluateBoard);
      chess.undo();

      if (isMaximizing ? score > bestScore : score < bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }

    const promo = bestMove.promotion ? bestMove.promotion : '';
    return `${bestMove.from}${bestMove.to}${promo}`;
  }

  minimax(chess, depth, alpha, beta, isMaximizing, evaluateBoard) {
    if (depth === 0 || chess.isGameOver()) {
      return evaluateBoard(chess);
    }

    const moves = chess.moves({ verbose: true });
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        chess.move(m);
        const evalScore = this.minimax(chess, depth - 1, alpha, beta, false, evaluateBoard);
        chess.undo();
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        chess.move(m);
        const evalScore = this.minimax(chess, depth - 1, alpha, beta, true, evaluateBoard);
        chess.undo();
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  stop() {
    this.send('stop');
  }

  destroy() {
    if (this.worker) {
      this.send('quit');
      this.worker.terminate();
      this.worker = null;
    }
  }
}
