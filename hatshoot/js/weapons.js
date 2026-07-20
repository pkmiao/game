// weapons.js — 激光枪 / 榴弹发射器 / 药瓶手雷 / 雨伞近战 + 弹道 + 视图模型
window.HS = window.HS || {};

HS.weapons = (function () {
  const W = () => HS.CFG.weapons;
  let scene = null, camera = null;

  let current = 'laser';                 // 'laser' | 'grenade'
  let ammo = { laser: 0, grenade: 0 };
  let potions = 0;
  let reloading = false, reloadTimer = 0;
  let fireTimer = 0, meleeCD = 0, throwCD = 0, switchTimer = 0;
  let prevLeft = false;
  const projectiles = [];                // 榴弹与药瓶
  let recoil = 0;                        // 视图模型后座位移

  // 枪模（第三人称手持 + 第一人称视图模型 各一份）
  const handGuns = {};                   // 挂在玩家右手
  const viewGuns = {};                   // 挂在相机
  let viewRoot = null;                   // 第一人称视图模型容器
  let viewUmbrella = null;               // 第一人称雨伞

  function buildGun(kind) {
    const g = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x2e2e38 });
    const accent = new THREE.MeshLambertMaterial({ color: kind === 'laser' ? 0x9b4dff : 0xe63229 });
    if (kind === 'laser') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.42), dark); g.add(body);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), dark);
      barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, 0.33); g.add(barrel);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8),
        new THREE.MeshBasicMaterial({ color: 0xcc66ff }));
      tip.rotation.x = Math.PI / 2; tip.position.set(0, 0.02, 0.47); g.add(tip);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.16), accent);
      fin.position.set(0, 0.1, -0.05); g.add(fin);
    } else {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10), dark);
      tube.rotation.x = Math.PI / 2; g.add(tube);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 10), accent);
      ring.rotation.x = Math.PI / 2; ring.position.z = 0.18; g.add(ring);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), dark);
      grip.position.set(0, -0.1, -0.1); g.add(grip);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  function buildMiniUmbrella() {
    const u = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: HS.CFG.colors.hatPurple });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), m); u.add(shaft);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2, 8), m);
    canopy.position.y = 0.3; u.add(canopy);
    return u;
  }

  function init(s, cam) {
    scene = s; camera = cam;
    // 第一人称视图模型容器
    viewRoot = new THREE.Group();
    viewRoot.position.set(0.3, -0.28, -0.55);
    camera.add(viewRoot);
    ['laser', 'grenade'].forEach((k) => {
      viewGuns[k] = buildGun(k);
      viewGuns[k].rotation.y = Math.PI;    // 枪口朝 -Z（相机前方）
      viewRoot.add(viewGuns[k]);
      handGuns[k] = buildGun(k);
    });
    viewUmbrella = buildMiniUmbrella();
    viewUmbrella.position.set(0.45, -0.2, -0.3);
    viewUmbrella.rotation.z = 0.4;
    viewUmbrella.visible = false;
    camera.add(viewUmbrella);
    reset();
  }

  function reset() {
    current = 'laser';
    ammo.laser = W().laser.mag;
    ammo.grenade = W().grenade.mag;
    potions = W().potion.count;
    reloading = false; reloadTimer = 0;
    fireTimer = 0; meleeCD = 0; throwCD = 0; prevLeft = false;
    projectiles.forEach((p) => scene.remove(p.mesh));
    projectiles.length = 0;
  }

  // 把枪挂到帽孩右手（第三人称可见）
  function attachHandGuns() {
    const arm = HS.player.parts.armR;
    ['laser', 'grenade'].forEach((k) => {
      if (handGuns[k].parent !== arm) {
        arm.add(handGuns[k]);
        handGuns[k].position.set(0, -0.36, 0.12);
        handGuns[k].rotation.set(-Math.PI / 2, 0, 0); // 枪口朝身体前方
      }
      handGuns[k].visible = (k === current);
    });
  }

  // 雨伞：平时背在背上，挥击时回到手中
  function setUmbrellaOnBack() {
    const umb = HS.player.parts.umbrella;
    const body = HS.player.parts.body;
    if (umb.parent !== body) {
      body.add(umb);
      umb.position.set(0, 0.12, -0.2);
      umb.rotation.set(0.4, 0, 0.35);
    }
  }
  function setUmbrellaInHand() {
    const umb = HS.player.parts.umbrella;
    const arm = HS.player.parts.armR;
    if (umb.parent !== arm) {
      arm.add(umb);
      umb.position.set(0, -0.36, 0.02);
      umb.rotation.set(0.5, 0, 0);
    }
  }

  function camDir() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  }
  function muzzlePos(fp) {
    const fwd = camDir();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const base = camera.position.clone();
    return fp
      ? base.addScaledVector(fwd, 0.6).addScaledVector(right, 0.25).add(new THREE.Vector3(0, -0.18, 0))
      : base.addScaledVector(fwd, 0.5).addScaledVector(right, 0.3).add(new THREE.Vector3(0, -0.25, 0));
  }

  function update(dt, now) {
    if (!HS.player.alive) return;
    const input = HS.input;
    fireTimer = Math.max(0, fireTimer - dt);
    meleeCD = Math.max(0, meleeCD - dt);
    throwCD = Math.max(0, throwCD - dt);
    switchTimer = Math.max(0, switchTimer - dt);
    recoil = Math.max(0, recoil - dt * 3);

    attachHandGuns();
    if (meleeCD <= W().umbrella.cooldown - 0.28) setUmbrellaOnBack();

    // —— 切换武器 ——
    if (input.justHit('Digit1') && current !== 'laser') switchTo('laser');
    if (input.justHit('Digit2') && current !== 'grenade') switchTo('grenade');

    // —— 换弹 ——
    if (reloading) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) {
        reloading = false;
        ammo[current] = W()[current].mag;
        HS.audio.reload();
      }
    } else if (input.justHit('KeyR') && ammo[current] < W()[current].mag) {
      reloading = true;
      reloadTimer = W()[current].reload;
      HS.audio.reload();
    }

    // —— 开火 ——
    const left = input.mouseDown.left;
    const aiming = input.mouseDown.right;
    if (current === 'laser') {
      if (left && !reloading && fireTimer <= 0 && switchTimer <= 0) {
        if (ammo.laser > 0) fireLaser(aiming);
        else { reloading = true; reloadTimer = W().laser.reload; HS.audio.reload(); }
      }
    } else {
      if (left && !prevLeft && !reloading && fireTimer <= 0 && switchTimer <= 0) {
        if (ammo.grenade > 0) fireGrenade();
        else { reloading = true; reloadTimer = W().grenade.reload; HS.audio.reload(); }
      }
    }
    prevLeft = left;

    // —— 雨伞近战 ——
    if (input.justHit('KeyF') && meleeCD <= 0) meleeSwing();

    // —— 药瓶手雷 ——
    if ((input.justHit('KeyG') || input.justHit('Digit4')) && potions > 0 && throwCD <= 0) {
      throwPotion();
    }

    updateProjectiles(dt);
    updateViewmodel(dt, now, aiming);
  }

  function switchTo(k) {
    current = k;
    reloading = false;
    switchTimer = 0.25;
    HS.audio.uiClick();
  }

  // —— 激光枪：即时命中 ——
  function fireLaser(aiming) {
    const cfg = W().laser;
    fireTimer = cfg.interval;
    ammo.laser--;
    const spread = aiming ? 0 : cfg.spreadHip;
    const dir = camDir();
    dir.x += (Math.random() - 0.5) * spread * 2;
    dir.y += (Math.random() - 0.5) * spread * 2;
    dir.z += (Math.random() - 0.5) * spread * 2;
    dir.normalize();
    const origin = camera.position.clone();

    const worldDist = HS.world.rayHit(origin, dir, 120);
    const eHit = HS.enemies.raycast(origin, dir, Math.min(worldDist, 120));
    let end;
    if (eHit) {
      end = eHit.point;
      const res = HS.enemies.damage(eHit.enemy, cfg.damage, { dir });
      HS.effects.hitFlash(end);
      HS.ui.hitmarker(res === 'kill');
      HS.audio[res === 'kill' ? 'kill' : 'hit']();
    } else {
      const d = Math.min(worldDist, 120);
      end = origin.clone().addScaledVector(dir, d === Infinity ? 120 : d);
      if (worldDist !== Infinity) HS.effects.sparks(end, 0xffffff, 4, 2);
    }
    HS.effects.beam(muzzlePos(HS.cameraRig.firstPerson), end);
    HS.player.kick(0.004);
    recoil = Math.min(0.15, recoil + 0.05);
    HS.audio.laser();
  }

  // —— 榴弹发射器：抛物线弹体，命中即爆 ——
  function fireGrenade() {
    const cfg = W().grenade;
    fireTimer = cfg.interval;
    ammo.grenade--;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x333340 })
    );
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.02, 6, 10),
      new THREE.MeshBasicMaterial({ color: 0xe63229 })
    );
    mesh.add(band);
    mesh.position.copy(muzzlePos(true));
    scene.add(mesh);
    const dir = camDir();
    projectiles.push({
      kind: 'grenade', mesh,
      vel: dir.multiplyScalar(cfg.projSpeed).add(new THREE.Vector3(0, 2, 0))
    });
    HS.player.kick(0.03);
    recoil = 0.2;
    HS.cameraRig.shake(0.15, 0.12);
    HS.audio.grenadeFire();
  }

  // —— 药瓶手雷 ——
  function throwPotion() {
    const cfg = W().potion;
    potions--;
    throwCD = 0.5;
    const mesh = new THREE.Group();
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8),
      new THREE.MeshLambertMaterial({ color: 0x9b4dff, transparent: true, opacity: 0.85 })
    );
    mesh.add(bottle);
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 0.08, 8),
      new THREE.MeshLambertMaterial({ color: 0xd9c8ff })
    );
    neck.position.y = 0.14; mesh.add(neck);
    mesh.position.copy(muzzlePos(true));
    scene.add(mesh);
    projectiles.push({
      kind: 'potion', mesh,
      vel: camDir().multiplyScalar(cfg.throwSpeed).add(new THREE.Vector3(0, 3, 0)),
      spin: Math.random() * 8 + 4
    });
    HS.audio.swing();
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.vel.y -= 20 * dt;
      const pPos = p.mesh.position;
      // 用世界碰撞体做点移动（半径很小）；记录碰撞前速度以检测撞墙
      const preX = p.vel.x, preZ = p.vel.z;
      const hitGround = HS.world.moveBody(pPos, p.vel, 0.09, 0.09, dt);
      const hitWall = (Math.abs(preX) > 0.01 && p.vel.x === 0) ||
                      (Math.abs(preZ) > 0.01 && p.vel.z === 0);
      if (p.spin) p.mesh.rotation.x += p.spin * dt;
      // 命中敌人也算引爆
      const nearEnemy = HS.enemies.nearest(pPos, 0.6);
      if (hitGround || hitWall || nearEnemy || pPos.y < -30) {
        if (p.kind === 'grenade') explode(pPos.clone());
        else shatter(pPos.clone());
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
      }
    }
  }

  function explode(at) {
    const cfg = W().grenade;
    HS.effects.explosion(at, cfg.radius);
    HS.audio.explosion();
    HS.enemies.explode(at, cfg.radius, cfg.damage);
    // 自伤
    const d = HS.player.pos.distanceTo(at);
    if (d < cfg.radius) {
      const dmg = cfg.damage * (1 - d / cfg.radius) * cfg.selfFactor;
      if (dmg > 1) HS.player.damage(dmg);
    }
  }

  function shatter(at) {
    const cfg = W().potion;
    HS.audio.shatter();
    HS.audio.poison();
    HS.effects.poisonCloud(at, cfg.radius, cfg.duration, cfg.dps);
  }

  // —— 雨伞挥击 ——
  function meleeSwing() {
    const cfg = W().umbrella;
    meleeCD = cfg.cooldown;
    setUmbrellaInHand();
    const arm = HS.player.parts.armR;
    // 挥击动画：手臂快速下劈
    let t = 0;
    const swingAnim = setInterval(() => {
      t += 0.016;
      const k = Math.min(1, t / 0.22);
      arm.rotation.x = -2.1 + k * 2.4;
      if (k >= 1) { clearInterval(swingAnim); arm.rotation.x = 0; }
    }, 16);

    HS.audio.swing();
    const origin = HS.player.eyePos(new THREE.Vector3());
    const fwd = new THREE.Vector3(-Math.sin(HS.player.yaw), 0, -Math.cos(HS.player.yaw));
    const hits = HS.enemies.meleeArc(origin, fwd, cfg.range, cfg.arc);
    if (hits.length > 0) {
      HS.audio.punch();
      HS.cameraRig.shake(0.12, 0.1);
      let killed = false;
      hits.forEach((e) => {
        const dir = e.pos.clone().sub(HS.player.pos).setY(0).normalize();
        if (HS.enemies.damage(e, cfg.damage, { dir, kb: cfg.knockback }) === 'kill') killed = true;
        HS.effects.hitFlash(e.pos.clone().add(new THREE.Vector3(0, 1, 0)));
      });
      HS.ui.hitmarker(killed);
      if (killed) HS.audio.kill();
    }
    // 第一人称雨伞动画
    if (HS.cameraRig.firstPerson && viewUmbrella) {
      viewUmbrella.visible = true;
      let t2 = 0;
      const anim2 = setInterval(() => {
        t2 += 0.016;
        const k = Math.min(1, t2 / 0.25);
        viewUmbrella.rotation.x = -1.6 + k * 1.8;
        if (k >= 1) { clearInterval(anim2); viewUmbrella.visible = false; viewUmbrella.rotation.x = 0; }
      }, 16);
    }
  }

  // —— 视图模型（第一人称）：摆动 + 后座 + 瞄准位移 ——
  function updateViewmodel(dt, now, aiming) {
    const fp = HS.cameraRig.firstPerson;
    viewRoot.visible = fp;
    if (!fp) return;
    viewGuns.laser.visible = current === 'laser';
    viewGuns.grenade.visible = current === 'grenade';
    const speed = Math.hypot(HS.player.vel.x, HS.player.vel.z);
    const bob = HS.player.grounded ? Math.sin(now * 8) * 0.012 * Math.min(1, speed / 6) : 0;
    const aimY = aiming ? 0.06 : 0, aimX = aiming ? -0.12 : 0;
    viewRoot.position.x += ((0.3 + aimX) - viewRoot.position.x) * Math.min(1, 12 * dt);
    viewRoot.position.y += ((-0.28 + aimY + bob) - viewRoot.position.y) * Math.min(1, 12 * dt);
    viewRoot.position.z = -0.55 + recoil;
    viewRoot.rotation.x = reloading ? -0.5 : 0;
  }

  return {
    init, reset, update,
    get current() { return current; },
    get ammo() { return ammo; },
    get potions() { return potions; },
    get reloading() { return reloading; },
    weaponName: () => W()[current].name,
    magSize: () => W()[current].mag
  };
})();
