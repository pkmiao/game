window.HS = window.HS || {};

HS.player = (function () {
  const P = () => HS.CFG.player;
  const pos = new THREE.Vector3(0, 8, 5);
  const vel = new THREE.Vector3();
  let yaw = Math.PI, pitch = 0;
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

    const m = input.consumeMouse();
    const sens = HS.CFG.camera.sens;
    yaw -= m.dx * sens;
    pitch -= m.dy * sens;
    pitch = Math.max(-1.45, Math.min(1.45, pitch));

    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    const speedNow = Math.hypot(vel.x, vel.z);

    const ziplineOn = HS.zipline && HS.zipline.active;

    if (ziplineOn) {
      HS.zipline.applyTo(pos, vel, dt);
      grounded = false;
      playerSprinting = false;
      playerCrouching = false;
      height += (cfg.height - height) * Math.min(1, 14 * dt);
    } else {
      slideCD = Math.max(0, slideCD - dt);
      const sprintKey = input.pressed('ShiftLeft') || input.pressed('ShiftRight');
      const crouchKey = input.pressed('KeyC') || input.pressed('ControlLeft');

      if (sliding) {
        slideTimer -= dt;
        const t = 1 - slideTimer / cfg.slide.duration;
        const sp = (cfg.sprintSpeed + cfg.slide.boost) * (1 - t * 0.55);
        vel.x = slideDir.x * sp;
        vel.z = slideDir.z * sp;
        if (slideTimer <= 0 || !grounded) { sliding = false; slideCD = cfg.slide.cooldown; }
        playerSprinting = false;
        playerCrouching = true;
      } else {
        if (sprintKey && crouchKey && grounded && slideCD <= 0 && speedNow > cfg.walkSpeed) {
          sliding = true;
          slideTimer = cfg.slide.duration;
          slideDir.copy(speedNow > 0.5 ? new THREE.Vector3(vel.x, 0, vel.z).normalize() : fwd);
          HS.audio.slide();
        }
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

      if (input.justHit('Space') && grounded) {
        vel.y = cfg.jumpVel;
        sliding = false;
        HS.audio.jump();
      }

      vel.y = Math.max(-30, vel.y - cfg.gravity * dt);
      const targetH = sliding ? cfg.slideHeight : ((input.pressed('KeyC') || input.pressed('ControlLeft')) && grounded) ? cfg.crouchHeight : cfg.height;
      height += (targetH - height) * Math.min(1, 14 * dt);
      grounded = HS.world.moveBody(pos, vel, cfg.radius, height, dt);
    }

    if (pos.y < -2) {
      damage(9999, true);
      return;
    }

    if (now - lastDamage > cfg.regenDelay && hp < cfg.hp) {
      hp = Math.min(cfg.hp, hp + cfg.regenRate * dt);
    }

    model.group.position.copy(pos);
    model.group.rotation.y = Math.atan2(fwd.x, fwd.z);
    animate(dt, speedNow, now, ziplineOn);

    if (grounded && speedNow > 2 && !sliding) {
      stepTimer -= dt * speedNow;
      if (stepTimer <= 0) { stepTimer = 3.2; HS.audio.step(); }
    }
  }

  let playerSprinting = false, playerCrouching = false;

  function lerpRot(part, tx, tz, k) {
    part.rotation.x += (tx - part.rotation.x) * k;
    part.rotation.z += (tz - part.rotation.z) * k;
  }

  function animate(dt, speed, now, ziplineOn) {
    const moving = speed > 0.5 && grounded && !sliding && !ziplineOn;
    if (moving) walkPhase += dt * Math.min(speed, 9) * 1.6;
    const amp = Math.min(1, speed / 6) * 0.65;
    const s = Math.sin(walkPhase);
    const crouch = playerCrouching && !sliding && !ziplineOn;
    const gunHold = !sliding && !ziplineOn && HS.weapons.holdingGun();

    let bodyY = 0.58;
    if (sliding) bodyY = 0.22;
    else if (crouch) bodyY = 0.34;
    if (!moving && !sliding) bodyY += Math.sin(now * 2.4) * 0.008;
    parts.body.position.y += (bodyY - parts.body.position.y) * Math.min(1, 14 * dt);
    parts.body.rotation.x += ((sliding ? -0.35 : (crouch ? 0.12 : 0)) - parts.body.rotation.x) * 0.3;

    if (sliding) {
      lerpRot(parts.legL, -0.5, 0, 0.3);
      lerpRot(parts.legR, -0.3, 0, 0.3);
      parts.kneeL.rotation.x += (-2.0 - parts.kneeL.rotation.x) * 0.3;
      parts.kneeR.rotation.x += (-1.7 - parts.kneeR.rotation.x) * 0.3;
    } else if (crouch) {
      lerpRot(parts.legL, -1.5, 0, 0.3);
      lerpRot(parts.legR, -1.5, 0, 0.3);
      parts.kneeL.rotation.x += (1.5 - parts.kneeL.rotation.x) * 0.3;
      parts.kneeR.rotation.x += (1.5 - parts.kneeR.rotation.x) * 0.3;
    } else if (!grounded) {
      lerpRot(parts.legL, 0.5, 0, 0.3);
      lerpRot(parts.legR, -0.3, 0, 0.3);
      parts.kneeL.rotation.x += (0.4 - parts.kneeL.rotation.x) * 0.3;
      parts.kneeR.rotation.x += (0.2 - parts.kneeR.rotation.x) * 0.3;
    } else {
      lerpRot(parts.legL, moving ? s * amp : 0, 0, 0.35);
      lerpRot(parts.legR, moving ? -s * amp : 0, 0, 0.35);
      parts.kneeL.rotation.x += ((moving ? Math.max(0, -s) * amp * 0.6 : 0) - parts.kneeL.rotation.x) * 0.35;
      parts.kneeR.rotation.x += ((moving ? Math.max(0, s) * amp * 0.6 : 0) - parts.kneeR.rotation.x) * 0.35;
    }

    if (ziplineOn) {
      lerpRot(parts.armL, -2.6, -0.35, 0.3);
      lerpRot(parts.armR, -2.6, 0.35, 0.3);
    } else if (!gunHold && !HS.weapons.umbrellaInHand()) {
      const alx = moving ? -s * amp * 0.7 : Math.sin(now * 2) * 0.05;
      lerpRot(parts.armL, alx, 0, 0.25);
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
    kick(dp) { pitch = Math.max(-1.45, Math.min(1.45, pitch + dp)); },
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
