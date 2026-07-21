window.HS = window.HS || {};

HS.weapons = (function () {
  const W = () => HS.CFG.weapons;
  let scene = null, camera = null;

  let current = 'laser';
  const ammo = { laser: 0, grenade: 0 };
  const reserve = { laser: 0, grenade: 0 };
  let potions = 0;
  let reloading = false, reloadTimer = 0;
  let fireTimer = 0, meleeCD = 0, throwCD = 0, switchTimer = 0;
  let prevLeft = false;
  const projectiles = [];
  const drops = [];
  let recoil = 0;

  const handGuns = {};
  const viewGuns = {};
  let viewRoot = null;
  let viewUmbrella = null;

  function buildGun(kind) {
    const g = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x2e2e38 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x444450 });
    const accent = new THREE.MeshLambertMaterial({ color: kind === 'laser' ? 0x9b4dff : 0xe63229 });
    const muzzle = new THREE.Object3D();
    if (kind === 'laser') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.42), dark); g.add(body);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), dark);
      barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, 0.33); g.add(barrel);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8),
        new THREE.MeshBasicMaterial({ color: 0xcc66ff }));
      tip.rotation.x = Math.PI / 2; tip.position.set(0, 0.02, 0.47); g.add(tip);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.16), accent);
      fin.position.set(0, 0.1, -0.05); g.add(fin);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), dark);
      grip.position.set(0, -0.1, -0.08); g.add(grip);
      muzzle.position.set(0, 0.02, 0.49);
    } else {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12), metal);
      cyl.rotation.x = Math.PI / 2; cyl.position.set(0, 0.02, 0.06); g.add(cyl);
      const capF = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.02, 12), dark);
      capF.rotation.x = Math.PI / 2; capF.position.set(0, 0.02, 0.15); g.add(capF);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.17, 8),
          new THREE.MeshBasicMaterial({ color: 0x111114 }));
        hole.rotation.x = Math.PI / 2;
        hole.position.set(Math.cos(a) * 0.062, 0.02 + Math.sin(a) * 0.062, 0.06);
        g.add(hole);
      }
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.34, 8), dark);
      barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.085, 0.24); g.add(barrel);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.22), accent);
      rail.position.set(0, 0.13, 0.06); g.add(rail);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), dark);
      grip.position.set(0, -0.1, -0.06); grip.rotation.x = -0.2; g.add(grip);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.2), metal);
      stock.position.set(0, -0.02, -0.22); g.add(stock);
      const fore = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.12), dark);
      fore.position.set(0, -0.08, 0.12); g.add(fore);
      muzzle.position.set(0, 0.085, 0.42);
    }
    g.add(muzzle);
    g.muzzle = muzzle;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  function buildFlask(scale) {
    const s = scale || 1;
    const m = new THREE.Group();
    const glass = new THREE.MeshLambertMaterial({ color: HS.CFG.colors.flaskGlass, transparent: true, opacity: 0.7 });
    const liquid = new THREE.MeshLambertMaterial({ color: HS.CFG.colors.flaskLiquid, transparent: true, opacity: 0.85 });
    const cork = new THREE.MeshLambertMaterial({ color: 0x8a5a2b });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.1 * s, 0.16 * s, 10), glass);
    body.position.y = 0.02 * s; m.add(body);
    const liq = new THREE.Mesh(new THREE.ConeGeometry(0.085 * s, 0.1 * s, 10), liquid);
    liq.position.y = -0.01 * s; m.add(liq);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * s, 0.03 * s, 0.1 * s, 8), glass);
    neck.position.y = 0.13 * s; m.add(neck);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.026 * s, 0.026 * s, 0.03 * s, 8), cork);
    top.position.y = 0.19 * s; m.add(top);
    m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return m;
  }

  function buildDropMesh(kind) {
    if (kind === 'potion') return buildFlask(0.9);
    const g = new THREE.Group();
    if (kind === 'laser') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.2),
        new THREE.MeshLambertMaterial({ color: 0x6a3d9a }));
      g.add(box);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.21),
        new THREE.MeshBasicMaterial({ color: 0xcc66ff }));
      g.add(stripe);
    } else {
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8),
        new THREE.MeshLambertMaterial({ color: 0x3a6b3a }));
      shell.rotation.x = Math.PI / 2; g.add(shell);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x222228 }));
      tip.position.z = 0.08; g.add(tip);
    }
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8),
      new THREE.MeshBasicMaterial({ color: kind === 'potion' ? 0x9b4dff : (kind === 'laser' ? 0xcc66ff : 0x66ff66), transparent: true, opacity: 0.18 }));
    g.add(glow);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  function init(s, cam) {
    scene = s; camera = cam;
    viewRoot = new THREE.Group();
    viewRoot.position.set(0.3, -0.28, -0.55);
    camera.add(viewRoot);
    ['laser', 'grenade'].forEach((k) => {
      viewGuns[k] = buildGun(k);
      viewGuns[k].rotation.y = Math.PI;
      viewRoot.add(viewGuns[k]);
      handGuns[k] = buildGun(k);
    });
    viewUmbrella = HS.buildUmbrella();
    viewUmbrella.scale.setScalar(0.9);
    viewUmbrella.position.set(0.42, -0.18, -0.32);
    viewUmbrella.rotation.set(0.3, 0, 0.5);
    viewUmbrella.visible = false;
    camera.add(viewUmbrella);
    reset();
  }

  function reset() {
    current = 'laser';
    const sg = W().startGroups;
    ammo.laser = W().laser.mag;
    ammo.grenade = W().grenade.mag;
    reserve.laser = W().laser.mag * sg;
    reserve.grenade = W().grenade.mag * sg;
    potions = W().potion.count;
    reloading = false; reloadTimer = 0;
    fireTimer = 0; meleeCD = 0; throwCD = 0; prevLeft = false;
    projectiles.forEach((p) => scene.remove(p.mesh));
    projectiles.length = 0;
    drops.forEach((d) => scene.remove(d.mesh));
    drops.length = 0;
  }

  function umbrellaInHand() { return meleeCD > W().umbrella.cooldown - 0.28; }

  function attachHandGuns() {
    const armR = HS.player.parts.armR;
    const armL = HS.player.parts.armL;
    const inHand = umbrellaInHand();
    const holding = !inHand && !HS.player.sliding && !(HS.zipline && HS.zipline.active);
    ['laser', 'grenade'].forEach((k) => {
      if (handGuns[k].parent !== armR) {
        armR.add(handGuns[k]);
        handGuns[k].position.set(0, -0.34, 0.1);
        handGuns[k].rotation.set(-Math.PI / 2, 0, 0);
      }
      handGuns[k].visible = (k === current) && holding;
    });
    if (holding) {
      armR.rotation.x += ((-1.35) - armR.rotation.x) * 0.3;
      armR.rotation.z += ((0.12) - armR.rotation.z) * 0.3;
      armL.rotation.x += ((-1.3) - armL.rotation.x) * 0.3;
      armL.rotation.z += ((-0.55) - armL.rotation.z) * 0.3;
    }
  }

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

  function aimPoint() {
    const o = camera.position;
    const d = camDir();
    const wd = HS.world.rayHit(o, d, 120);
    const wdClamped = wd === Infinity ? 120 : wd;
    const eh = HS.enemies.raycast(o, d, wdClamped);
    if (eh) return eh.point;
    return o.clone().addScaledVector(d, wdClamped);
  }

  function dirToAim(origin) {
    const dir = aimPoint().sub(origin);
    if (dir.lengthSq() < 0.0001) return camDir();
    return dir.normalize();
  }

  const _wp = new THREE.Vector3();
  function muzzleWorldPos() {
    const fp = HS.cameraRig.firstPerson;
    const gun = fp ? viewGuns[current] : handGuns[current];
    return gun.muzzle.getWorldPosition(_wp.clone());
  }
  function throwOrigin() {
    if (HS.cameraRig.firstPerson) {
      const fwd = camDir();
      return camera.position.clone().addScaledVector(fwd, 0.5).add(new THREE.Vector3(0.25, -0.2, 0));
    }
    const arm = HS.player.parts.armR;
    const hand = new THREE.Object3D();
    hand.position.set(0, -0.35, 0.1);
    arm.add(hand);
    arm.updateMatrixWorld(true);
    const w = hand.getWorldPosition(new THREE.Vector3());
    arm.remove(hand);
    return w;
  }

  function update(dt, now) {
    if (!HS.player.alive) return;
    scene.updateMatrixWorld();
    const input = HS.input;
    fireTimer = Math.max(0, fireTimer - dt);
    meleeCD = Math.max(0, meleeCD - dt);
    throwCD = Math.max(0, throwCD - dt);
    switchTimer = Math.max(0, switchTimer - dt);
    recoil = Math.max(0, recoil - dt * 3);

    attachHandGuns();
    if (!umbrellaInHand()) setUmbrellaOnBack();

    if (input.justHit('Digit1') && current !== 'laser') switchTo('laser');
    if (input.justHit('Digit2') && current !== 'grenade') switchTo('grenade');

    if (reloading) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) {
        reloading = false;
        const need = W()[current].mag - ammo[current];
        const take = Math.min(need, reserve[current]);
        ammo[current] += take;
        reserve[current] -= take;
        HS.audio.reload();
      }
    } else if (input.justHit('KeyR') && ammo[current] < W()[current].mag && reserve[current] > 0) {
      reloading = true;
      reloadTimer = W()[current].reload;
      HS.audio.reload();
    }

    const left = input.mouseDown.left;
    const aiming = input.mouseDown.right;
    if (current === 'laser') {
      if (left && !reloading && fireTimer <= 0 && switchTimer <= 0) {
        if (ammo.laser > 0) fireLaser(aiming);
        else if (reserve.laser > 0) { reloading = true; reloadTimer = W().laser.reload; HS.audio.reload(); }
      }
    } else {
      if (left && !prevLeft && !reloading && fireTimer <= 0 && switchTimer <= 0) {
        if (ammo.grenade > 0) fireGrenade();
        else if (reserve.grenade > 0) { reloading = true; reloadTimer = W().grenade.reload; HS.audio.reload(); }
      }
    }
    prevLeft = left;

    if ((input.justHit('KeyF') || input.justHit('Digit3')) && meleeCD <= 0) meleeSwing();

    if ((input.justHit('KeyG') || input.justHit('Digit4')) && potions > 0 && throwCD <= 0) {
      throwPotion();
    }

    updateProjectiles(dt);
    updateDrops(dt, now);
    updateViewmodel(dt, now, aiming);
  }

  function switchTo(k) {
    current = k;
    reloading = false;
    switchTimer = 0.25;
    HS.audio.uiClick();
  }

  function fireLaser(aiming) {
    const cfg = W().laser;
    fireTimer = cfg.interval;
    ammo.laser--;
    const origin = muzzleWorldPos();
    const dir = dirToAim(origin);
    const spread = aiming ? 0 : cfg.spreadHip;
    dir.x += (Math.random() - 0.5) * spread * 2;
    dir.y += (Math.random() - 0.5) * spread * 2;
    dir.z += (Math.random() - 0.5) * spread * 2;
    dir.normalize();

    const worldDist = HS.world.rayHit(origin, dir, 120);
    const wdClamped = worldDist === Infinity ? 120 : worldDist;
    const eHit = HS.enemies.raycast(origin, dir, Math.min(wdClamped, 120));
    let end;
    if (eHit) {
      end = eHit.point;
      const res = HS.enemies.damage(eHit.enemy, cfg.damage, { dir });
      HS.effects.hitFlash(end);
      HS.ui.hitmarker(res === 'kill');
      HS.audio[res === 'kill' ? 'kill' : 'hit']();
    } else {
      end = origin.clone().addScaledVector(dir, Math.min(wdClamped, 120));
      if (worldDist !== Infinity) HS.effects.sparks(end, 0xffffff, 4, 2);
    }
    HS.effects.beam(origin, end);
    HS.player.kick(0.004);
    recoil = Math.min(0.15, recoil + 0.05);
    HS.audio.laser();
  }

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
    const origin = muzzleWorldPos();
    mesh.position.copy(origin);
    scene.add(mesh);
    const dir = dirToAim(origin);
    projectiles.push({
      kind: 'grenade', mesh,
      vel: dir.multiplyScalar(cfg.projSpeed).add(new THREE.Vector3(0, 1.5, 0))
    });
    HS.player.kick(0.03);
    recoil = 0.2;
    HS.cameraRig.shake(0.15, 0.12);
    HS.audio.grenadeFire();
  }

  function throwPotion() {
    const cfg = W().potion;
    potions--;
    throwCD = 0.5;
    const mesh = buildFlask(1);
    const origin = throwOrigin();
    mesh.position.copy(origin);
    scene.add(mesh);
    const dir = dirToAim(origin);
    projectiles.push({
      kind: 'potion', mesh,
      vel: dir.multiplyScalar(cfg.throwSpeed).add(new THREE.Vector3(0, 2, 0)),
      spin: Math.random() * 8 + 4
    });
    HS.audio.swing();
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.vel.y -= 20 * dt;
      const pPos = p.mesh.position;
      const preX = p.vel.x, preZ = p.vel.z;
      const hitGround = HS.world.moveBody(pPos, p.vel, 0.09, 0.09, dt);
      const hitWall = (Math.abs(preX) > 0.01 && p.vel.x === 0) ||
                      (Math.abs(preZ) > 0.01 && p.vel.z === 0);
      if (p.spin) p.mesh.rotation.x += p.spin * dt;
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

  function spawnDrop(at) {
    if (Math.random() > 0.7) return;
    const r = Math.random();
    const kind = r < 0.45 ? 'laser' : (r < 0.8 ? 'grenade' : 'potion');
    const mesh = buildDropMesh(kind);
    const baseY = at.y + 0.55;
    mesh.position.set(at.x + (Math.random() - 0.5) * 0.6, baseY, at.z + (Math.random() - 0.5) * 0.6);
    scene.add(mesh);
    drops.push({ kind, mesh, baseY, t: Math.random() * 6 });
  }

  function updateDrops(dt, now) {
    const pp = HS.player.pos;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t += dt;
      d.mesh.position.y = d.baseY + Math.sin(d.t * 2.2) * 0.12;
      d.mesh.rotation.y += dt * 1.5;
      const dx = d.mesh.position.x - pp.x, dz = d.mesh.position.z - pp.z;
      const dy = Math.abs(d.mesh.position.y - (pp.y + 0.6));
      if (Math.hypot(dx, dz) < 1.0 && dy < 1.3 && HS.player.alive) {
        pickup(d.kind);
        scene.remove(d.mesh);
        drops.splice(i, 1);
      }
    }
  }

  function pickup(kind) {
    if (kind === 'potion') {
      potions += 1;
      HS.ui.pickup('拾取 药瓶 +1');
    } else if (kind === 'laser') {
      reserve.laser += W().laser.mag;
      HS.ui.pickup('拾取 激光弹 +' + W().laser.mag);
    } else {
      reserve.grenade += W().grenade.mag;
      HS.ui.pickup('拾取 榴弹 +' + W().grenade.mag);
    }
    HS.audio.uiClick();
  }

  function meleeSwing() {
    const cfg = W().umbrella;
    meleeCD = cfg.cooldown;
    setUmbrellaInHand();
    const arm = HS.player.parts.armR;
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
    if (HS.cameraRig.firstPerson && viewUmbrella) {
      viewUmbrella.visible = true;
      let t2 = 0;
      const anim2 = setInterval(() => {
        t2 += 0.016;
        const k = Math.min(1, t2 / 0.25);
        viewUmbrella.rotation.x = -1.6 + k * 1.8;
        if (k >= 1) { clearInterval(anim2); viewUmbrella.visible = false; viewUmbrella.rotation.x = 0.3; }
      }, 16);
    }
  }

  function updateViewmodel(dt, now, aiming) {
    const fp = HS.cameraRig.firstPerson;
    viewRoot.visible = fp;
    viewUmbrella.visible = fp && umbrellaInHand();
    if (!fp) return;
    viewGuns.laser.visible = current === 'laser' && !umbrellaInHand();
    viewGuns.grenade.visible = current === 'grenade' && !umbrellaInHand();
    const speed = Math.hypot(HS.player.vel.x, HS.player.vel.z);
    const bob = HS.player.grounded ? Math.sin(now * 8) * 0.012 * Math.min(1, speed / 6) : 0;
    const aimY = aiming ? 0.06 : 0, aimX = aiming ? -0.12 : 0;
    viewRoot.position.x += ((0.3 + aimX) - viewRoot.position.x) * Math.min(1, 12 * dt);
    viewRoot.position.y += ((-0.28 + aimY + bob) - viewRoot.position.y) * Math.min(1, 12 * dt);
    viewRoot.position.z = -0.55 + recoil;
    viewRoot.rotation.x = reloading ? -0.5 : 0;
  }

  return {
    init, reset, update, spawnDrop,
    holdingGun: () => !umbrellaInHand(),
    umbrellaInHand,
    get current() { return current; },
    get ammo() { return ammo; },
    get reserve() { return reserve; },
    get potions() { return potions; },
    get reloading() { return reloading; },
    weaponName: () => W()[current].name,
    magSize: () => W()[current].mag
  };
})();
