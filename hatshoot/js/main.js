// main.js — 启动、游戏主循环、状态机（start / playing / paused / win / lose）
window.HS = window.HS || {};

(function () {
  let renderer, scene, camera, clock;
  let state = 'start';        // start | playing | paused | win | lose
  let startTime = 0;

  function boot() {
    // 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game').appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(HS.CFG.camera.fov, window.innerWidth / window.innerHeight, 0.05, 500);
    scene.add(camera);        // 必须加入场景，第一人称视图模型才可见

    // 模块初始化
    HS.ui.init();
    HS.world.build(scene);
    HS.effects.init(scene);
    HS.cameraRig.init(camera);
    HS.player.init(scene);
    HS.weapons.init(scene, camera);
    HS.enemies.init(scene);
    HS.enemies.spawnAll();

    // 输入与指针锁定
    HS.input.init(renderer.domElement, onLock, onUnlock);

    // 事件：开始 / 重开 / 继续
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    document.getElementById('resumeBtn').addEventListener('click', () => {
      HS.input.requestLock(renderer.domElement);
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && (state === 'win' || state === 'lose')) startGame();
    });

    // 玩家死亡 / 全灭 回调
    HS.player.onDeath = () => endGame(false);
    HS.enemies.onAllDead = () => endGame(true);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    HS.ui.show('start');
    clock = new THREE.Clock();
    renderer.setAnimationLoop(loop);
  }

  function startGame() {
    HS.audio.init();
    HS.audio.uiClick();
    HS.player.reset();
    HS.weapons.reset();
    HS.enemies.reset();
    HS.zipline.reset();
    startTime = performance.now() / 1000;
    HS.ui.show(null);
    HS.input.requestLock(renderer.domElement);
    // 即使指针锁定失败也进入游戏（用户可再点击画面）
    state = 'playing';
  }

  function endGame(win) {
    if (state !== 'playing') return;
    state = win ? 'win' : 'lose';
    const t = Math.round(performance.now() / 1000 - startTime);
    const stats = win
      ? `用时 ${Math.floor(t / 60)} 分 ${t % 60} 秒<br>剩余血量 ${Math.ceil(HS.player.hp)}`
      : `消灭了 ${HS.CFG.enemy.count - HS.enemies.remaining} / ${HS.CFG.enemy.count} 个黑手党`;
    HS.ui.showEnd(win, stats);
    if (win) HS.audio.win(); else HS.audio.lose();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function onLock() {
    if (state === 'paused' || state === 'playing') {
      state = 'playing';
      HS.ui.show(null);
    }
  }

  function onUnlock() {
    if (state === 'playing') {
      state = 'paused';
      HS.ui.show('pause');
    }
  }

  function loop() {
    const dt = Math.min(0.05, clock.getDelta());
    const now = performance.now() / 1000;

    if (state === 'playing') {
      // V 切换第一/第三人称
      if (HS.input.justHit('KeyV')) {
        HS.cameraRig.toggle();
        HS.audio.uiClick();
      }
      HS.player.update(dt, now);
      HS.weapons.update(dt, now);
      HS.zipline.update(dt);
      HS.enemies.update(dt, now);
      HS.effects.update(dt);
      HS.cameraRig.update(dt, now);
      HS.ui.updateHUD();
      HS.input.endFrame();
    } else {
      // 非游戏状态：丢弃输入累积，防止恢复时视角跳变
      HS.input.consumeMouse();
      HS.input.endFrame();
    }

    renderer.render(scene, camera);
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
