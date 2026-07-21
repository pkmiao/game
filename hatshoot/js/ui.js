// ui.js — HUD 与界面（开始 / 暂停 / 胜负结算）
window.HS = window.HS || {};

HS.ui = (function () {
  const $ = (id) => document.getElementById(id);
  let el = {};
  let hitTimer = null, vigTimer = null;

  function init() {
    el = {
      hud: $('hud'), enemyCount: $('enemyCount'), enemyTotal: $('enemyTotal'),
      healthNum: $('healthNum'), healthBar: $('healthBar'),
      weaponName: $('weaponName'), ammo: $('ammo'), potions: $('potions'),
      reloadHint: $('reloadHint'), hitmarker: $('hitmarker'), vignette: $('vignette'),
      startScreen: $('startScreen'), endScreen: $('endScreen'), pauseScreen: $('pauseScreen'),
      endTitle: $('endTitle'), endStats: $('endStats'),
      ziplineHint: $('ziplineHint'), pickupHint: $('pickupHint')
    };
  }

  // 每帧刷新 HUD
  function updateHUD() {
    const p = HS.player, w = HS.weapons;
    el.healthNum.textContent = Math.ceil(p.hp);
    el.healthBar.style.width = Math.max(0, p.hp) + '%';
    el.weaponName.textContent = w.weaponName() + (HS.cameraRig.firstPerson ? ' · 第一人称' : ' · 第三人称');
    const a = w.ammo[w.current];
    el.ammo.textContent = a + ' / ' + w.reserve[w.current];
    el.potions.textContent = '药瓶 × ' + w.potions + '（G 投掷）';
    el.reloadHint.textContent = w.reloading
      ? '装弹中…'
      : (a === 0 ? (w.reserve[w.current] > 0 ? '按 R 换弹' : '弹药耗尽，去捡补给！') : '');
  }

  function ziplineHint(show) {
    if (el.ziplineHint) el.ziplineHint.style.display = show ? 'block' : 'none';
  }

  function pickup(text) {
    if (!el.pickupHint) return;
    el.pickupHint.textContent = text;
    el.pickupHint.style.display = 'block';
    if (el._pickupTimer) clearTimeout(el._pickupTimer);
    el._pickupTimer = setTimeout(() => { el.pickupHint.style.display = 'none'; }, 1600);
  }

  function setEnemies(n, total) {
    el.enemyCount.textContent = n;
    el.enemyTotal.textContent = total;
  }

  // 命中标记（击杀变红）
  function hitmarker(kill) {
    el.hitmarker.className = kill ? 'kill' : '';
    el.hitmarker.style.opacity = 1;
    if (hitTimer) clearTimeout(hitTimer);
    hitTimer = setTimeout(() => { el.hitmarker.style.opacity = 0; }, kill ? 220 : 110);
  }

  // 受击红晕
  function vignette() {
    el.vignette.style.transition = 'none';
    el.vignette.style.opacity = 1;
    if (vigTimer) clearTimeout(vigTimer);
    vigTimer = setTimeout(() => {
      el.vignette.style.transition = 'opacity .6s';
      el.vignette.style.opacity = 0;
    }, 90);
  }

  function show(name) {
    el.startScreen.classList.toggle('hidden', name !== 'start');
    el.endScreen.classList.toggle('hidden', name !== 'end');
    el.pauseScreen.classList.toggle('hidden', name !== 'pause');
    el.hud.classList.toggle('hidden', name === 'start' || name === 'end');
  }

  function showEnd(win, stats) {
    el.endTitle.innerHTML = win
      ? '<span class="red">任务完成！</span>'
      : '被黑手党<span class="red">打倒</span>了';
    el.endStats.innerHTML = stats;
    show('end');
  }

  return { init, updateHUD, setEnemies, hitmarker, vignette, show, showEnd, ziplineHint, pickup };
})();
