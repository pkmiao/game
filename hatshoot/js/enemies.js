// enemies.js — 黑手党打手：生成 / AI（巡逻→追击→挥拳）/ 受击 / 死亡 / 清场计数
window.HS = window.HS || {};

HS.enemies = (function () {
  const E = () => HS.CFG.enemy;
  let scene = null;
  const list = [];
  let remaining = 0;
  let onAllDead = null;

  // 每栋楼（出生楼除外）刷 2 个，共 12 个
  function spawnAll() {
    const roofs = HS.world.rooftops.slice(1);
    roofs.forEach((r) => {
      spawn(r.cx - r.w * 0.25, r.y, r.cz - r.d * 0.25, r);
      spawn(r.cx + r.w * 0.25, r.y, r.cz + r.d * 0.25, r);
    });
    remaining = list.length;
    HS.ui.setEnemies(remaining, list.length);
  }

  function spawn(x, y, z, roof) {
    const model = HS.buildMafia();
    model.group.position.set(x, y, z);
    scene.add(model.group);
    const mats = [];
    model.group.traverse((o) => { if (o.isMesh) mats.push(o.material); });
    list.push({
      group: model.group, parts: model.parts, mats,
      pos: model.group.position, vel: new THREE.Vector3(),
      yaw: Math.random() * Math.PI * 2,
      hp: E().hp, state: 'idle', stateT: 0,
      roof, walkPhase: Math.random() * 10, flashT: 0,
      wanderT: 0, alive: true, grounded: false
    });
  }

  function reset() {
    list.forEach((e) => scene.remove(e.group));
    list.length = 0;
    spawnAll();
  }

  function update(dt, now) {
    const p = HS.player;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e.state === 'dying') { updateDying(e, dt, i); continue; }
      if (!e.alive) continue;

      // 受击红闪
      if (e.flashT > 0) {
        e.flashT -= dt;
        if (e.flashT <= 0) e.mats.forEach((m) => m.emissive && m.emissive.setHex(0));
      }

      const toPlayer = p.pos.clone().sub(e.pos);
      const distXZ = Math.hypot(toPlayer.x, toPlayer.z);
      const dy = Math.abs(toPlayer.y);
      const cfg = E();

      switch (e.state) {
        case 'idle':
          // 原地晃悠：偶尔转身
          e.wanderT -= dt;
          if (e.wanderT <= 0) { e.wanderT = 2 + Math.random() * 3; e.yaw += (Math.random() - 0.5) * 1.5; }
          if (p.alive && distXZ < cfg.aggroRange && dy < 6) e.state = 'chase';
          break;

        case 'chase': {
          if (!p.alive) { e.state = 'idle'; break; }
          // 面向玩家移动
          e.yaw = Math.atan2(toPlayer.x, toPlayer.z);
          if (distXZ > cfg.attackRange || dy > 2) {
            const dir = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
            e.vel.x = dir.x * cfg.speed;
            e.vel.z = dir.z * cfg.speed;
          } else { e.vel.x = 0; e.vel.z = 0; }
          // 进入攻击距离
          if (distXZ < cfg.attackRange && dy < 2) {
            e.state = 'windup';
            e.stateT = cfg.windup;
            e.vel.x = 0; e.vel.z = 0;
          }
          break;
        }

        case 'windup':
          e.yaw = Math.atan2(toPlayer.x, toPlayer.z);
          e.parts.armR.rotation.x = -2.4;   // 举拳
          e.stateT -= dt;
          if (e.stateT <= 0) {
            e.parts.armR.rotation.x = 0.5;  // 挥下
            if (p.alive && distXZ < cfg.hitRange && dy < 2.2) {
              p.damage(cfg.damage);
              HS.audio.punch();
            }
            e.state = 'recover';
            e.stateT = cfg.recover;
          }
          break;

        case 'recover':
          e.stateT -= dt;
          if (e.stateT <= 0) { e.parts.armR.rotation.x = 0; e.state = 'chase'; }
          break;
      }

      // —— 物理：重力 + 碰撞，并限制在自己楼顶范围内 ——
      e.vel.y = Math.max(-30, e.vel.y - 22 * dt);
      e.grounded = HS.world.moveBody(e.pos, e.vel, 0.4, 1.7, dt);
      const m = 0.5;
      e.pos.x = Math.max(e.roof.cx - e.roof.w / 2 + m, Math.min(e.roof.cx + e.roof.w / 2 - m, e.pos.x));
      e.pos.z = Math.max(e.roof.cz - e.roof.d / 2 + m, Math.min(e.roof.cz + e.roof.d / 2 - m, e.pos.z));
      // 被击退/爆炸轰出楼顶 → 掉下去摔死
      if (e.pos.y < -2) { hurt(e, 9999, null); continue; }

      // —— 敌人之间简单挤开 ——
      for (const o of list) {
        if (o === e || !o.alive || o.state === 'dying') continue;
        const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > 0.0001 && d2 < 0.64) {
          const d = Math.sqrt(d2);
          e.pos.x += (dx / d) * (0.8 - d) * 0.5;
          e.pos.z += (dz / d) * (0.8 - d) * 0.5;
        }
      }

      // —— 模型朝向与走路动画 ——
      e.group.rotation.y = Math.atan2(Math.sin(e.yaw), Math.cos(e.yaw));
      const spd = Math.hypot(e.vel.x, e.vel.z);
      if (spd > 0.5) {
        e.walkPhase += dt * spd * 2;
        const s = Math.sin(e.walkPhase);
        e.parts.legL.rotation.x = s * 0.55;
        e.parts.legR.rotation.x = -s * 0.55;
      } else {
        e.parts.legL.rotation.x *= 0.8;
        e.parts.legR.rotation.x *= 0.8;
        e.parts.armL.rotation.x *= 0.8;
      }
    }
  }

  function updateDying(e, dt, index) {
    e.stateT += dt;
    // 后仰倒地
    const k = Math.min(1, e.stateT / 0.3);
    e.group.rotation.x = -Math.PI / 2 * k;
    if (e.stateT > 0.8) {
      // 淡出
      e.mats.forEach((m) => { m.transparent = true; m.opacity = Math.max(0, 1 - (e.stateT - 0.8)); });
      if (e.stateT > 1.8) {
        scene.remove(e.group);
        e.alive = false;
        list.splice(index, 1);
      }
    }
  }

  // —— 对外接口 ——

  // 射击射线检测：返回最近命中 { enemy, point, dist }
  const _v = new THREE.Vector3();
  function raycast(origin, dir, maxDist) {
    let best = null;
    for (const e of list) {
      if (!e.alive || e.state === 'dying') continue;
      // 身体近似球：中心在 0.85 米高，半径 0.75
      _v.set(e.pos.x, e.pos.y + 0.85, e.pos.z);
      const oc = _v.clone().sub(origin);
      const t = oc.dot(dir);
      if (t < 0 || t > maxDist) continue;
      const d2 = oc.lengthSq() - t * t;
      if (d2 < 0.75 * 0.75) {
        const dist = t - Math.sqrt(Math.max(0, 0.5625 - d2));
        if (!best || dist < best.dist) {
          best = { enemy: e, dist, point: origin.clone().addScaledVector(dir, dist) };
        }
      }
    }
    return best;
  }

  // 雨伞扇形近战判定
  function meleeArc(origin, fwd, range, arc) {
    const hits = [];
    for (const e of list) {
      if (!e.alive || e.state === 'dying') continue;
      const to = e.pos.clone().sub(origin);
      if (Math.abs(to.y) > 2.2) continue;
      to.y = 0;
      const d = to.length();
      if (d > range + 0.4) continue;
      if (d < 0.5 || to.normalize().dot(fwd) > Math.cos(arc)) hits.push(e);
    }
    return hits;
  }

  // 伤害入口：返回 'kill' | 'hit'
  function hurt(e, dmg, opts) {
    if (!e.alive || e.state === 'dying') return 'hit';
    e.hp -= dmg;
    e.flashT = 0.12;
    e.mats.forEach((m) => m.emissive && m.emissive.setHex(0x881111));
    if (opts && opts.dir && opts.kb) {
      e.vel.addScaledVector(opts.dir, opts.kb);
      e.vel.y += opts.kb * 0.35;
    }
    if (e.hp <= 0) {
      e.state = 'dying';
      e.stateT = 0;
      e.vel.set(0, 0, 0);
      remaining--;
      HS.ui.setEnemies(remaining, E().count);
      if (remaining <= 0 && onAllDead) onAllDead();
      HS.weapons.spawnDrop(e.pos);
      return 'kill';
    }
    // 被打会激怒：进入追击
    if (e.state === 'idle') e.state = 'chase';
    return 'hit';
  }

  // 爆炸范围伤害（带击退抛起）
  function explode(center, radius, maxDmg) {
    for (const e of [...list]) {
      if (!e.alive || e.state === 'dying') continue;
      const ep = e.pos.clone().add(new THREE.Vector3(0, 0.8, 0));
      const d = ep.distanceTo(center);
      if (d > radius) continue;
      const dir = ep.clone().sub(center).setY(0);
      if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
      dir.normalize();
      const dmg = maxDmg * (1 - d / radius);
      e.vel.y += 4;
      hurt(e, dmg, { dir, kb: 5 });
    }
  }

  // 毒雾持续伤害
  function poisonTick(center, radius, dmg) {
    for (const e of [...list]) {
      if (!e.alive || e.state === 'dying') continue;
      const dx = e.pos.x - center.x, dz = e.pos.z - center.z;
      if (dx * dx + dz * dz < radius * radius && Math.abs(e.pos.y - center.y) < 2.5) {
        hurt(e, dmg, null);
      }
    }
  }

  // 最近的敌人（榴弹近炸用）
  function nearest(pos, r) {
    for (const e of list) {
      if (!e.alive || e.state === 'dying') continue;
      if (e.pos.distanceToSquared(pos) < r * r) return e;
    }
    return null;
  }

  return {
    init(s) { scene = s; },
    spawnAll, reset, update,
    raycast, meleeArc, damage: hurt, explode, poisonTick, nearest,
    get list() { return list; },
    get remaining() { return remaining; },
    set onAllDead(cb) { onAllDead = cb; }
  };
})();
