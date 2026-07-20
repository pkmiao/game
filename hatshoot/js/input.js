// input.js — 键鼠输入与指针锁定
window.HS = window.HS || {};

HS.input = (function () {
  const keys = {};          // 按住状态：{ KeyW: true, ... }
  const justPressed = {};   // 本帧刚按下（边沿触发）
  let dx = 0, dy = 0;       // 鼠标位移累积
  let locked = false;
  let mouseDown = { left: false, right: false };
  let lockCb = null, unlockCb = null;

  function init(dom, onLock, onUnlock) {
    lockCb = onLock; unlockCb = onUnlock;

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      keys[e.code] = true;
      justPressed[e.code] = true;
      // 阻止空格/Tab 等滚动页面
      if (['Space', 'Tab', 'KeyC'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });

    document.addEventListener('mousemove', (e) => {
      if (!locked) return;
      dx += e.movementX || 0;
      dy += e.movementY || 0;
    });
    document.addEventListener('mousedown', (e) => {
      if (!locked) return;
      if (e.button === 0) mouseDown.left = true;
      if (e.button === 2) mouseDown.right = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) mouseDown.left = false;
      if (e.button === 2) mouseDown.right = false;
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      locked = (document.pointerLockElement === dom);
      if (locked && lockCb) lockCb();
      if (!locked && unlockCb) unlockCb();
    });
  }

  function requestLock(dom) {
    try {
      const p = dom.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { dom.requestPointerLock(); } catch (e) {} });
    } catch (e) {
      try { dom.requestPointerLock(); } catch (e2) {}
    }
  }

  return {
    init,
    requestLock,
    keys,
    mouseDown,
    isLocked: () => locked,
    pressed: (code) => !!keys[code],
    // 边沿触发：读取一次后清除（每帧由主循环统一清理）
    justHit: (code) => !!justPressed[code],
    consumeMouse() { const r = { dx, dy }; dx = 0; dy = 0; return r; },
    endFrame() { for (const k in justPressed) justPressed[k] = false; }
  };
})();
