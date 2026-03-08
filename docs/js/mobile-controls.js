// Mobile controls module for Dungeon Escape
// Provides touch d-pad, context-sensitive action buttons, swipe support, settings

(function() {
  'use strict';

  // Wait for main.js to initialize
  function waitForGame() {
    if (window.game && window.render) {
      init();
    } else {
      setTimeout(waitForGame, 50);
    }
  }

  const isMobile = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  // === SETTINGS ===
  const DEFAULTS = {
    fontSize: 16,
    controlScheme: 'both',
    controlLayout: 'default',
    vibration: true,
  };

  function loadSettings() {
    try {
      const saved = localStorage.getItem('dungeon-settings');
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  }

  function saveSettings(settings) {
    try { localStorage.setItem('dungeon-settings', JSON.stringify(settings)); } catch {}
  }

  let settings = loadSettings();

  // === VIBRATION ===
  function vibrate(ms = 25) {
    if (settings.vibration && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }

  // === COMMAND DISPATCH ===
  function dispatch(cmd) {
    vibrate();
    window.game.handleCommand(cmd);
    window.render();
    updateControls();
  }

  // === D-PAD ===
  let repeatTimer = null;
  let repeatInterval = null;

  function setupDpad() {
    const dpad = document.getElementById('mobile-dpad');
    if (!dpad) return;

    const dirs = {
      up:    { type: 'move', dx: 0, dy: -1 },
      down:  { type: 'move', dx: 0, dy: 1 },
      left:  { type: 'move', dx: -1, dy: 0 },
      right: { type: 'move', dx: 1, dy: 0 },
    };

    dpad.querySelectorAll('[data-dir]').forEach(btn => {
      const dir = btn.dataset.dir;
      const cmd = dirs[dir];
      if (!cmd) return;

      function handlePress(e) {
        e.preventDefault();
        const gs = window.game.getState();

        if (gs.state === 'playing') {
          dispatch(cmd);
        } else if (gs.state === 'inventory') {
          if (dir === 'up') dispatch({ type: 'select_up' });
          else if (dir === 'down') dispatch({ type: 'select_down' });
        }

        // Hold-to-repeat for movement
        clearTimeout(repeatTimer);
        clearInterval(repeatInterval);
        repeatTimer = setTimeout(() => {
          repeatInterval = setInterval(() => {
            const s = window.game.getState();
            if (s.state === 'playing') {
              dispatch(cmd);
            } else if (s.state === 'inventory') {
              if (dir === 'up') dispatch({ type: 'select_up' });
              else if (dir === 'down') dispatch({ type: 'select_down' });
            }
          }, 120);
        }, 350);
      }

      function handleRelease(e) {
        e.preventDefault();
        clearTimeout(repeatTimer);
        clearInterval(repeatInterval);
      }

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('touchend', handleRelease, { passive: false });
      btn.addEventListener('touchcancel', handleRelease, { passive: false });
    });

    // Center button = wait
    const center = dpad.querySelector('[data-action="wait"]');
    if (center) {
      center.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const gs = window.game.getState();
        if (gs.state === 'playing') dispatch({ type: 'wait' });
      }, { passive: false });
    }
  }

  // === SWIPE SUPPORT ===
  let swipeStart = null;

  function setupSwipe() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    canvas.addEventListener('touchstart', (e) => {
      if (settings.controlScheme === 'dpad') return;
      if (e.touches.length !== 1) return;
      swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      if (!swipeStart) return;
      if (settings.controlScheme === 'dpad') { swipeStart = null; return; }

      const dx = e.changedTouches[0].clientX - swipeStart.x;
      const dy = e.changedTouches[0].clientY - swipeStart.y;
      const dt = Date.now() - swipeStart.t;
      swipeStart = null;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30 || dt > 600) return; // Too short or too slow

      const gs = window.game.getState();
      if (gs.state !== 'playing') return;

      // Determine dominant axis
      if (Math.abs(dx) > Math.abs(dy)) {
        dispatch({ type: 'move', dx: dx > 0 ? 1 : -1, dy: 0 });
      } else {
        dispatch({ type: 'move', dx: 0, dy: dy > 0 ? 1 : -1 });
      }
    }, { passive: true });
  }

  // === CONTEXT-SENSITIVE ACTION BUTTONS ===
  function updateControls() {
    const gs = window.game.getState();
    const actions = document.getElementById('mobile-actions');
    if (!actions) return;

    actions.innerHTML = '';

    switch (gs.state) {
      case 'title':
        actions.innerHTML = makeBtn('New Game', 'action-start', () => dispatch({ type: 'newgame' }));
        break;

      case 'playing':
        actions.innerHTML = [
          makeBtn('Pickup', 'action-pickup', () => dispatch({ type: 'pickup' })),
          makeBtn('Stairs >', 'action-stairs' + (isOnStairs(gs) ? ' available' : ''), () => dispatch({ type: 'descend' })),
          makeBtn('Inventory', 'action-inventory', () => dispatch({ type: 'inventory' })),
          makeBtn('Wait', 'action-wait', () => dispatch({ type: 'wait' })),
        ].join('');
        break;

      case 'combat':
        const hasPotions = gs.player.inventory.some(i => i.type === 'potion');
        actions.innerHTML = [
          makeBtn('Attack', 'action-attack', () => dispatch({ type: 'attack' })),
          makeBtn('Defend', 'action-defend', () => dispatch({ type: 'defend' })),
          makeBtn('Flee', 'action-flee', () => dispatch({ type: 'flee' })),
          makeBtn('Potion', 'action-potion' + (hasPotions ? '' : ' disabled'), () => {
            const idx = gs.player.inventory.findIndex(i => i.type === 'potion');
            if (idx >= 0) dispatch({ type: 'useItem', index: idx });
          }),
        ].join('');
        break;

      case 'inventory':
        actions.innerHTML = [
          makeBtn('Use / Equip', 'action-use', () => dispatch({ type: 'use' })),
          makeBtn('Drop', 'action-drop', () => dispatch({ type: 'drop' })),
          makeBtn('Close', 'action-close', () => dispatch({ type: 'close' })),
        ].join('');
        break;

      case 'gameover':
      case 'victory':
        actions.innerHTML = makeBtn('New Game', 'action-newgame', () => dispatch({ type: 'newgame' }));
        break;
    }

    // Bind click/touch handlers from data-handler attributes
    actions.querySelectorAll('[data-handler]').forEach(btn => {
      const id = btn.dataset.handler;
      const handler = _handlers[id];
      if (handler) {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); handler(); }, { passive: false });
        btn.addEventListener('click', (e) => { e.preventDefault(); handler(); });
      }
    });

    // Update mobile stats bar
    updateMobileStats(gs);
  }

  const _handlers = {};
  let _handlerId = 0;

  function makeBtn(label, classes, handler) {
    const id = 'h' + (++_handlerId);
    _handlers[id] = handler;
    return `<button class="mobile-btn ${classes}" data-handler="${id}">${label}</button>`;
  }

  function isOnStairs(gs) {
    if (!gs.floor || !gs.player) return false;
    return gs.player.x === gs.floor.stairsDownX && gs.player.y === gs.floor.stairsDownY;
  }

  // === MOBILE STATS BAR ===
  function updateMobileStats(gs) {
    const bar = document.getElementById('mobile-stats-bar');
    if (!bar || bar.style.display === 'none') return;
    if (!gs.player) { bar.innerHTML = ''; return; }

    const p = gs.player;
    bar.innerHTML = `
      <div class="mobile-bar-row">
        <span class="mobile-bar-label">HP</span>
        <div class="mobile-bar-track"><div class="mobile-bar-fill mobile-bar-hp" style="width:${(p.hp/p.maxHp)*100}%"></div></div>
        <span class="mobile-bar-text">${p.hp}/${p.maxHp}</span>
        <span class="mobile-bar-label" style="margin-left:8px">MP</span>
        <div class="mobile-bar-track"><div class="mobile-bar-fill mobile-bar-mp" style="width:${(p.mp/p.maxMp)*100}%"></div></div>
        <span class="mobile-bar-text">${p.mp}/${p.maxMp}</span>
        <span class="mobile-bar-text" style="margin-left:8px">Lv${p.level} F${gs.floorLevel}</span>
        <span class="mobile-bar-text">ATK:${p.attack} DEF:${p.defense}</span>
      </div>
    `;
  }

  // === SETTINGS PANEL ===
  function setupSettings() {
    const btn = document.getElementById('settings-btn');
    const panel = document.getElementById('settings-panel');
    const closeBtn = document.getElementById('settings-close');
    if (!btn || !panel) return;

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'settings-backdrop';
    document.body.appendChild(backdrop);

    function open() {
      panel.style.display = 'block';
      backdrop.style.display = 'block';
    }
    function close() {
      panel.style.display = 'none';
      backdrop.style.display = 'none';
    }

    btn.addEventListener('click', open);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); open(); }, { passive: false });
    closeBtn.addEventListener('click', close);
    closeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); close(); }, { passive: false });
    backdrop.addEventListener('click', close);
    backdrop.addEventListener('touchstart', (e) => { e.preventDefault(); close(); }, { passive: false });

    // Font size
    const fontSlider = document.getElementById('setting-fontsize');
    const fontValue = document.getElementById('fontsize-value');
    fontSlider.value = settings.fontSize;
    fontValue.textContent = settings.fontSize;
    fontSlider.addEventListener('input', () => {
      settings.fontSize = parseInt(fontSlider.value);
      fontValue.textContent = settings.fontSize;
      window.setFontSize(settings.fontSize);
      saveSettings(settings);
    });

    // Control scheme
    const controlScheme = document.getElementById('setting-controls');
    controlScheme.value = settings.controlScheme;
    controlScheme.addEventListener('change', () => {
      settings.controlScheme = controlScheme.value;
      applyControlScheme();
      saveSettings(settings);
    });

    // Control layout
    const controlLayout = document.getElementById('setting-layout');
    controlLayout.value = settings.controlLayout;
    controlLayout.addEventListener('change', () => {
      settings.controlLayout = controlLayout.value;
      applyControlLayout();
      saveSettings(settings);
    });

    // Vibration
    const vibToggle = document.getElementById('setting-vibration');
    vibToggle.checked = settings.vibration;
    vibToggle.addEventListener('change', () => {
      settings.vibration = vibToggle.checked;
      saveSettings(settings);
    });
  }

  function applyControlScheme() {
    document.body.classList.remove('controls-swipe-only', 'controls-dpad-only');
    if (settings.controlScheme === 'swipe') {
      document.body.classList.add('controls-swipe-only');
    } else if (settings.controlScheme === 'dpad') {
      document.body.classList.add('controls-dpad-only');
    }
  }

  function applyControlLayout() {
    document.body.classList.toggle('controls-swapped', settings.controlLayout === 'swapped');
  }

  // === MOBILE START / NEWGAME BUTTON ON OVERLAYS ===
  function setupOverlayButtons() {
    // Title screen mobile start
    const startBtn = document.getElementById('mobile-start-btn');
    if (startBtn) {
      startBtn.addEventListener('touchstart', (e) => { e.preventDefault(); dispatch({ type: 'newgame' }); }, { passive: false });
      startBtn.addEventListener('click', (e) => { e.preventDefault(); dispatch({ type: 'newgame' }); });
    }
  }

  // === WRAP RENDER TO UPDATE CONTROLS ===
  function wrapRender() {
    const originalRender = window.render;
    window.render = function() {
      originalRender();
      updateControls();
    };
  }

  // === INIT ===
  function init() {
    if (!isMobile()) {
      // On desktop, still add settings button but hide mobile controls
      return;
    }

    document.body.classList.add('is-mobile');

    // Apply saved settings
    applyControlScheme();
    applyControlLayout();
    if (settings.fontSize !== 16) {
      window.setFontSize(settings.fontSize);
    }

    // Setup all components
    setupDpad();
    setupSwipe();
    setupSettings();
    setupOverlayButtons();
    wrapRender();

    // Initial render to populate buttons
    updateControls();

    console.log('Mobile controls initialized');
  }

  // Start
  waitForGame();
})();
