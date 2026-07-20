// player.js — 帽孩：移动 / 冲刺 / 跳跃 / 蹲 / 滑铲 / 血量 / 脱战回血 / 掉落重生
window.HS = window.HS || {};

HS.player = (function () {
  const P = () => HS.CFG.player;
  const pos = new THREE.Vector3(0, 8, 5);   // 脚底位置（出生楼顶）
  const vel = new THREE.Vector3();
  let yaw = Math.PI, pitch = 0;             // 初始面向地图中心外
  let height = HS.CFG.player.height;
  let grounded = false;
  let hp = HS.CFG.player.hp;
  let lastDamage = -99;
  let alive = true;
  let sliding = false, slideTimer = 0, slideCD = 0;
  const slideDir = new THREE.Vector3();
  let walkPhase = 0, stepTimer = 0;
  let model = null, parts = null;
  let onDeath = null;

  const spawn = new THREE.Vector3(0, 8, 5);

  function init(scene) {
    model = HS.buildHatKid();
    parts = model.parts;
    scene.add(model.group);
  }

  function reset() {
    pos.copy(spawn); vel.set(0, 0, 0);
    yaw = Math.PI; pitch = 0;
    hp = P().hp; alive = true;
    sliding = false; slideTimer = 0; slideCD = 0; lastDamage = -99;
    model.group.visible = true;
  }

  function update(dt, now) {
    if (!alive) return;
    const cfg = P();
    const input = HS.input;

    // —— 视角 ——
    const m = input.consumeMouse();
    const sens = HS.CFG.camera.sens;
    yaw -= m.dx * sens;
    pitch -= m.dy * sens;
    pitch = Math.max(-1.45, Math.min(1.45, pitch));

    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));

    // —— 滑铲状态 ——
    slideCD = Math.max(0, slideCD - dt);
    const sprintKey = input.pressed('ShiftLeft') || input.pressed('ShiftRight');
    const crouchKey = input.pressed('KeyC') || input.pressed('ControlLeft');
    const speedNow = Math.hypot(vel.x, vel.z);

    if (sliding) {
      slideTimer -= dt;
      // 滑铲中：沿滑铲方向减速
      const t = 1 - slideTimer / cfg.slide.duration;
      const sp = (cfg.sprintSpeed + cfg.slide.boost) * (1 - t * 0.55);
      vel.x = slideDir.x * sp;
      vel.z = slideDir.z * sp;
      if (slideTimer <= 0 || !grounded) { sliding = false; slideCD = cfg.slide.cooldown; }
      playerSprinting = false;
      playerCrouching = true;
    } else {
      // 触发滑铲：冲刺中 + 按 C + 在地面
      if (sprintKey && crouchKey && grounded && slideCD <= 0 && speedNow > cfg.walkSpeed) {
        sliding = true;
        slideTimer = cfg.slide.duration;
        slideDir.copy(speedNow > 0.5 ? new THREE.Vector3(vel.x, 0, vel.z).normalize() : fwd);
        HS.audio.slide();
      }
      // —— 正常移动 ——
      let wx = 0, wz = 0;
      if (input.pressed('KeyW')) wz += 1;
      if (input.pressed('KeyS')) wz -= 1;
      if (input.pressed('KeyD')) wx += 1;
      if (input.pressed('KeyA')) wx -= 1;
      const crouching = crouchKey && grounded;
      const sprinting = sprintKey && wz > 0 && !crouching && !HS.input.mouseDown.right;
      const maxSpd = crouching ? cfg.crouchSpeed : (sprinting ? cfg.sprintSpeed : cfg.walkSpeed);
      const wish = new THREE.Vector3()
        .addScaledVector(fwd, wz)
        .addScaledVector(right, wx);
      if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(maxSpd);
      const accel = grounded ? 12 : 3.5;
      vel.x += (wish.x - vel.x) * Math.min(1, accel * dt);
      vel.z += (wish.z - vel.z) * Math.min(1, accel * dt);
      playerSprinting = sprinting && speedNow > cfg.walkSpeed + 0.5;
      playerCrouching = crouching;
    }

    // —— 跳跃 ——
    if (input.justHit('Space') && grounded) {
      vel.y = cfg.jumpVel;
      sliding = false;
      HS.audio.jump();
    }

    // —— 重力 + 碰撞 ——
    vel.y = Math.max(-30, vel.y - cfg.gravity * dt);
    const targetH = sliding ? cfg.slideHeight : ((crouchKey && grounded) ? cfg.crouchHeight : cfg.height);
    height += (targetH - height) * Math.min(1, 14 * dt);
    grounded = HS.world.moveBody(pos, vel, cfg.radius, height, dt);

    // —— 掉出地图：扣血回出生点 ——
    if (pos.y < -2) {
      damage(cfg.fallDamage, true);
      pos.copy(spawn);
      vel.set(0, 0, 0);
    }

    // —— 脱战回血 ——
    if (now - lastDamage > cfg.regenDelay && hp < cfg.hp) {
      hp = Math.min(cfg.hp, hp + cfg.regenRate * dt);
    }

    // —— 模型与程序动画 ——
    model.group.position.copy(pos);
    model.group.rotation.y = Math.atan2(fwd.x, fwd.z);
    animate(dt, speedNow, now);

    // 脚步声
    if (grounded && speedNow > 2 && !sliding) {
      stepTimer -= dt * speedNow;
      if (stepTimer <= 0) { stepTimer = 3.2; HS.audio.step(); }
    }
  }

  let playerSprinting = false, playerCrouching = false;

  function animate(dt, speed, now) {
    const moving = speed > 0.5 && grounded;
    if (moving) walkPhase += dt * Math.min(speed, 9) * 1.6;
    const amp = Math.min(1, speed / 6) * 0.65;
    const s = Math.sin(walkPhase), c = Math.cos(walkPhase);
    // 腿部摆动
    parts.legL.rotation.x = moving ? s * amp : 0;
    parts.legR.rotation.x = moving ? -s * amp : 0;
    // 左臂摆动（右臂持伞不动，由武器系统控制）
    parts.armL.rotation.x = moving ? -s * amp * 0.7 : Math.sin(now * 2) * 0.05;
    // 滑铲姿态：身体后仰
    parts.body.rotation.x = sliding ? -0.5 : (playerCrouching ? 0.18 : 0);
    // 待机呼吸
    if (!moving) parts.body.position.y = 0.58 + Math.sin(now * 2.4) * 0.008;
    // 跳跃姿态：双腿收起
    if (!grounded) {
      parts.legL.rotation.x = 0.5;
      parts.legR.rotation.x = -0.3;
    }
  }

  function damage(n, isFall) {
    if (!alive) return;
    hp -= n;
    lastDamage = performance.now() / 1000;
    HS.ui.vignette();
    HS.effects.shake(isFall ? 0.25 : 0.4, 0.3);
    HS.audio.hurt();
    if (hp <= 0) {
      hp = 0;
      alive = false;
      model.group.visible = false;
      if (onDeath) onDeath();
    }
  }

  return {
    init, reset, update, damage,
    kick(dp) { pitch = Math.max(-1.45, Math.min(1.45, pitch + dp)); },   // 开火后坐力
    get pos() { return pos; },
    get vel() { return vel; },
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    get height() { return height; },
    get hp() { return hp; },
    get alive() { return alive; },
    get grounded() { return grounded; },
    get sliding() { return sliding; },
    get sprinting() { return playerSprinting; },
    get crouching() { return playerCrouching; },
    get parts() { return parts; },
    get mesh() { return model ? model.group : null; },
    set onDeath(cb) { onDeath = cb; },
    eyePos(out) {
      return (out || new THREE.Vector3()).copy(pos).add(new THREE.Vector3(0, height * 0.92, 0));
    }
  };
})();
