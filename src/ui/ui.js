/**
 * UI Controller for Staunton Chess:
 * Manages HUD, Clocks, Move List, Captured Pieces, Modals, and Notifications.
 */

// Elegant inline SVGs for Staunton pieces used in UI avatars, captured trays, and promotion
export const PIECE_SVGS = {
  wp: `<svg viewBox="0 0 45 45"><path fill="#f3dfc1" stroke="#2a1a0b" stroke-width="1.5" d="m22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></svg>`,
  wr: `<svg viewBox="0 0 45 45"><path fill="#f3dfc1" stroke="#2a1a0b" stroke-width="1.5" d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5V17h17v14.5H14zM11 14h23v-5h-4v2h-4v-2h-7v2h-4v-2h-4v5z"/></svg>`,
  wn: `<svg viewBox="0 0 45 45"><path fill="#f3dfc1" stroke="#2a1a0b" stroke-width="1.5" d="M22 10c-3.5 0-6.5 2-8 5-1.5 3-1 7.5 1 10-1.5 2-3 4-3 7 0 4.5 4 7 10 7s10-2.5 10-7c0-3-1.5-5-3-7 2-2.5 2.5-7 1-10-1.5-3-4.5-5-8-5z"/></svg>`,
  wb: `<svg viewBox="0 0 45 45"><path fill="#f3dfc1" stroke="#2a1a0b" stroke-width="1.5" d="M22.5 8c-3 0-5.5 3.5-5.5 8 0 3 1.5 5.5 3.5 7-3 2-5 5.5-5 9.5 0 4.5 3 7 7 7s7-2.5 7-7c0-4-2-7.5-5-9.5 2-1.5 3.5-4 3.5-7 0-4.5-2.5-8-5.5-8z"/></svg>`,
  wq: `<svg viewBox="0 0 45 45"><path fill="#f3dfc1" stroke="#2a1a0b" stroke-width="1.5" d="M9 39h27v-3H9v3zm3-3v-3.5h21V36H12zm-3-8l4-15 7 10 2.5-12 2.5 12 7-10 4 15H9z"/></svg>`,
  wk: `<svg viewBox="0 0 45 45"><path fill="#f3dfc1" stroke="#2a1a0b" stroke-width="1.5" d="M22.5 6v4m-2-2h4M9 39h27v-3H9v3zm3-3v-3.5h21V36H12zm3-3.5c-3-3-4-8-4-12 0-5 4-9 11.5-9s11.5 4 11.5 9c0 4-1 9-4 12H15z"/></svg>`,
  bp: `<svg viewBox="0 0 45 45"><path fill="#1a130e" stroke="#cfa66e" stroke-width="1.5" d="m22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></svg>`,
  br: `<svg viewBox="0 0 45 45"><path fill="#1a130e" stroke="#cfa66e" stroke-width="1.5" d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5V17h17v14.5H14zM11 14h23v-5h-4v2h-4v-2h-7v2h-4v-2h-4v5z"/></svg>`,
  bn: `<svg viewBox="0 0 45 45"><path fill="#1a130e" stroke="#cfa66e" stroke-width="1.5" d="M22 10c-3.5 0-6.5 2-8 5-1.5 3-1 7.5 1 10-1.5 2-3 4-3 7 0 4.5 4 7 10 7s10-2.5 10-7c0-3-1.5-5-3-7 2-2.5 2.5-7 1-10-1.5-3-4.5-5-8-5z"/></svg>`,
  bb: `<svg viewBox="0 0 45 45"><path fill="#1a130e" stroke="#cfa66e" stroke-width="1.5" d="M22.5 8c-3 0-5.5 3.5-5.5 8 0 3 1.5 5.5 3.5 7-3 2-5 5.5-5 9.5 0 4.5 3 7 7 7s7-2.5 7-7c0-4-2-7.5-5-9.5 2-1.5 3.5-4 3.5-7 0-4.5-2.5-8-5.5-8z"/></svg>`,
  bq: `<svg viewBox="0 0 45 45"><path fill="#1a130e" stroke="#cfa66e" stroke-width="1.5" d="M9 39h27v-3H9v3zm3-3v-3.5h21V36H12zm-3-8l4-15 7 10 2.5-12 2.5 12 7-10 4 15H9z"/></svg>`,
  bk: `<svg viewBox="0 0 45 45"><path fill="#1a130e" stroke="#cfa66e" stroke-width="1.5" d="M22.5 6v4m-2-2h4M9 39h27v-3H9v3zm3-3v-3.5h21V36H12zm3-3.5c-3-3-4-8-4-12 0-5 4-9 11.5-9s11.5 4 11.5 9c0 4-1 9-4 12H15z"/></svg>`,
};

export class UIController {
  constructor(handlers) {
    this.h = handlers;

    // Elements
    this.el = {
      app: document.getElementById('app'),
      panel: document.getElementById('panel'),
      status: document.getElementById('status'),
      movesContainer: document.getElementById('moves'),
      moveList: document.querySelector('.move-list'),
      toast: document.getElementById('toast'),
      loader: document.getElementById('loader'),
      loaderFill: document.getElementById('loader-fill'),
      loaderStatus: document.getElementById('loader-status'),

      // Top bar
      btnView: document.getElementById('btn-view'),
      btnSound: document.getElementById('btn-sound'),
      btnSettings: document.getElementById('btn-settings'),
      btnFullscreen: document.getElementById('btn-fullscreen'),

      // Player cards
      cardTop: document.getElementById('card-top'),
      cardBottom: document.getElementById('card-bottom'),

      // Actions
      btnUndo: document.getElementById('btn-undo'),
      btnHint: document.getElementById('btn-hint'),
      btnFlip: document.getElementById('btn-flip'),
      btnNew: document.getElementById('btn-new'),
      btnResign: document.getElementById('btn-resign'),

      // Modals
      menuBackdrop: document.getElementById('menu'),
      btnStart: document.getElementById('btn-start'),
      levelSlider: document.getElementById('level'),
      levelOut: document.getElementById('level-out'),

      promoBackdrop: document.getElementById('promotion'),
      promoOptions: document.querySelector('.promo-options'),
      promoCancel: document.getElementById('promo-cancel'),

      gameoverBackdrop: document.getElementById('gameover'),
      goTitle: document.getElementById('go-title'),
      goSub: document.getElementById('go-sub'),
      btnRematch: document.getElementById('btn-rematch'),
      btnReview: document.getElementById('btn-review'),
      btnMenuGo: document.getElementById('btn-menu'),

      settingsBackdrop: document.getElementById('settings'),
      btnSettingsClose: document.getElementById('btn-settings-close'),
      optLegal: document.getElementById('opt-legal'),
      optRotate: document.getElementById('opt-rotate'),
      optSound: document.getElementById('opt-sound'),
      btnCopyPgn: document.getElementById('btn-copy-pgn'),
      btnCopyFen: document.getElementById('btn-copy-fen'),
      fenInput: document.getElementById('fen-input'),
      btnLoadFen: document.getElementById('btn-load-fen'),
    };

    this.toastTimer = null;
    this.selectedPromoResolve = null;

    this.bindEvents();
    this.setupSegmentedControls();
  }

  setLoaderProgress(progress, statusText) {
    if (this.el.loaderFill) {
      this.el.loaderFill.style.width = `${Math.round(progress * 100)}%`;
    }
    if (this.el.loaderStatus && statusText) {
      this.el.loaderStatus.textContent = statusText;
    }
  }

  hideLoader() {
    if (this.el.loader) {
      this.el.loader.classList.add('done');
      setTimeout(() => {
        if (this.el.loader) this.el.loader.style.display = 'none';
      }, 1100);
    }
  }

  bindEvents() {
    this.el.btnView.addEventListener('click', () => this.h.onToggleView());
    this.el.btnSound.addEventListener('click', () => this.h.onToggleSound());
    this.el.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    this.el.btnSettings.addEventListener('click', () => this.showSettings(true));
    this.el.btnSettingsClose.addEventListener('click', () => this.showSettings(false));

    this.el.btnUndo.addEventListener('click', () => this.h.onUndo());
    this.el.btnHint.addEventListener('click', () => this.h.onHint());
    this.el.btnFlip.addEventListener('click', () => this.h.onFlip());
    this.el.btnNew.addEventListener('click', () => this.showMenu(true));
    this.el.btnResign.addEventListener('click', () => this.h.onResign());

    this.el.btnStart.addEventListener('click', () => {
      const config = this.getMenuConfig();
      this.showMenu(false);
      this.h.onStartGame(config);
    });

    this.el.levelSlider.addEventListener('input', (e) => {
      const v = e.target.value;
      const names = [
        'Casual (800)',
        'Novice (1100)',
        'Club Player (1400)',
        'Intermediate (1650)',
        'Advanced (1900)',
        'Expert (2150)',
        'Master (2400)',
        'Grandmaster (2700+)',
      ];
      this.el.levelOut.textContent = `Level ${v} · ${names[v - 1]}`;
      e.target.style.setProperty('--fill', `${((v - 1) / 7) * 100}%`);
    });

    this.el.promoCancel.addEventListener('click', () => {
      this.hidePromotion();
      if (this.selectedPromoResolve) {
        this.selectedPromoResolve(null);
        this.selectedPromoResolve = null;
      }
    });

    this.el.btnRematch.addEventListener('click', () => {
      this.showGameOver(false);
      this.h.onRematch();
    });

    this.el.btnReview.addEventListener('click', () => {
      this.showGameOver(false);
    });

    this.el.btnMenuGo.addEventListener('click', () => {
      this.showGameOver(false);
      this.showMenu(true);
    });

    this.el.btnCopyPgn.addEventListener('click', () => this.h.onCopyPGN());
    this.el.btnCopyFen.addEventListener('click', () => this.h.onCopyFEN());
    this.el.btnLoadFen.addEventListener('click', () => {
      const fen = this.el.fenInput.value.trim();
      if (fen) this.h.onLoadFEN(fen);
    });

    this.el.optLegal.addEventListener('change', (e) => this.h.onToggleLegal(e.target.checked));
    this.el.optRotate.addEventListener('change', (e) => this.h.onToggleRotate(e.target.checked));
    this.el.optSound.addEventListener('change', (e) => this.h.onToggleSound(e.target.checked));

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'f' || e.key === 'F') this.h.onFlip();
      if (e.key === 'v' || e.key === 'V') this.h.onToggleView();
      if (e.key === 'm' || e.key === 'M') this.h.onToggleSound();
      if (e.key === 'h' || e.key === 'H') this.h.onHint();
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) this.h.onUndo();
      if (e.key === 'Escape') {
        this.showSettings(false);
        this.hidePromotion();
      }
    });
  }

  setupSegmentedControls() {
    document.querySelectorAll('.segmented').forEach((segGroup) => {
      const buttons = segGroup.querySelectorAll('.seg');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
          btn.setAttribute('aria-pressed', 'true');

          // Handle conditional fields
          if (segGroup.dataset.name === 'mode') {
            const isAI = btn.dataset.value === 'ai';
            document.querySelectorAll('[data-when="ai"]').forEach((el) => {
              el.style.display = isAI ? 'block' : 'none';
            });
          }
          if (segGroup.dataset.name === 'quality') {
            this.h.onQualityChange(btn.dataset.value);
          }
        });
      });
    });
  }

  getMenuConfig() {
    const getVal = (name) => {
      const btn = document.querySelector(`.segmented[data-name="${name}"] .seg[aria-pressed="true"]`);
      return btn ? btn.dataset.value : null;
    };
    return {
      mode: getVal('mode') || 'ai',
      color: getVal('color') || 'w',
      level: parseInt(this.el.levelSlider.value, 10) || 3,
      time: getVal('time') || 'none',
    };
  }

  showMenu(show = true) {
    this.el.menuBackdrop.classList.toggle('hidden', !show);
  }

  showSettings(show = true) {
    this.el.settingsBackdrop.classList.toggle('hidden', !show);
  }

  showPromotion(color) {
    return new Promise((resolve) => {
      this.selectedPromoResolve = resolve;
      this.el.promoOptions.innerHTML = '';

      const pieces = [
        { type: 'q', name: 'Queen' },
        { type: 'r', name: 'Rook' },
        { type: 'b', name: 'Bishop' },
        { type: 'n', name: 'Knight' },
      ];

      pieces.forEach((p) => {
        const btn = document.createElement('button');
        btn.className = 'promo-option';
        const svgStr = PIECE_SVGS[`${color}${p.type}`];
        btn.innerHTML = `${svgStr}<span>${p.name}</span>`;
        btn.addEventListener('click', () => {
          this.hidePromotion();
          resolve(p.type);
          this.selectedPromoResolve = null;
        });
        this.el.promoOptions.appendChild(btn);
      });

      this.el.promoBackdrop.classList.remove('hidden');
    });
  }

  hidePromotion() {
    this.el.promoBackdrop.classList.add('hidden');
  }

  showGameOver(show, title = '', subtitle = '') {
    if (show) {
      this.el.goTitle.textContent = title;
      this.el.goSub.textContent = subtitle;
      this.el.gameoverBackdrop.classList.remove('hidden');
    } else {
      this.el.gameoverBackdrop.classList.add('hidden');
    }
  }

  updatePlayerCards(topPlayer, bottomPlayer) {
    const renderCard = (cardEl, p) => {
      cardEl.querySelector('.name').textContent = p.name;
      cardEl.querySelector('.avatar').innerHTML = PIECE_SVGS[`${p.color}k`];
      cardEl.classList.toggle('active', p.active);
      cardEl.classList.toggle('thinking-on', p.thinking);

      const clockEl = cardEl.querySelector('.clock');
      if (p.timeStr) {
        clockEl.textContent = p.timeStr;
        clockEl.classList.remove('none');
        clockEl.classList.toggle('low', p.isLowTime);
      } else {
        clockEl.classList.add('none');
      }

      // Render captured pieces
      const capturedEl = cardEl.querySelector('.captured');
      capturedEl.innerHTML = '';
      if (p.captured && p.captured.length > 0) {
        p.captured.forEach((type) => {
          const enemyColor = p.color === 'w' ? 'b' : 'w';
          const span = document.createElement('span');
          span.innerHTML = PIECE_SVGS[`${enemyColor}${type}`];
          span.className = 'cap-icon';
          capturedEl.appendChild(span);
        });
      }
      if (p.advantage > 0) {
        const advSpan = document.createElement('span');
        advSpan.className = 'adv';
        advSpan.textContent = `+${p.advantage}`;
        capturedEl.appendChild(advSpan);
      }
    };

    renderCard(this.el.cardTop, topPlayer);
    renderCard(this.el.cardBottom, bottomPlayer);
  }

  updateStatus(text, isCheck = false) {
    this.el.status.textContent = text;
    this.el.status.classList.toggle('check', isCheck);
  }

  updateMoveList(history = []) {
    this.el.moveList.innerHTML = '';
    const hasMoves = history.length > 0;
    this.el.movesContainer.classList.toggle('has-moves', hasMoves);

    for (let i = 0; i < history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const li = document.createElement('li');

      const numSpan = document.createElement('span');
      numSpan.className = 'num';
      numSpan.textContent = `${moveNum}.`;
      li.appendChild(numSpan);

      const whiteMv = document.createElement('span');
      whiteMv.className = `mv ${i === history.length - 1 ? 'latest' : ''}`;
      whiteMv.textContent = history[i].san;
      li.appendChild(whiteMv);

      if (history[i + 1]) {
        const blackMv = document.createElement('span');
        blackMv.className = `mv ${i + 1 === history.length - 1 ? 'latest' : ''}`;
        blackMv.textContent = history[i + 1].san;
        li.appendChild(blackMv);
      } else {
        const emptySpan = document.createElement('span');
        li.appendChild(emptySpan);
      }

      this.el.moveList.appendChild(li);
    }

    // Auto-scroll to bottom of moves
    this.el.movesContainer.scrollTop = this.el.movesContainer.scrollHeight;
  }

  showToast(msg, isWarn = false) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.el.toast.textContent = msg;
    this.el.toast.classList.toggle('warn', isWarn);
    this.el.toast.classList.add('show');
    this.toastTimer = setTimeout(() => {
      this.el.toast.classList.remove('show');
    }, 2800);
  }

  setSoundMuted(isMuted) {
    this.el.btnSound.classList.toggle('muted', isMuted);
    this.el.optSound.checked = !isMuted;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }
}
