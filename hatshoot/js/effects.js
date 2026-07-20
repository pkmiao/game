// effects.js — 光束 / 火花 / 爆炸 / 毒雾 / 屏幕震动（纯视觉，无外部资源）
window.HS = window.HS || {};

HS.effects = (function () {
  let scene = null;
  const live = [];          // { obj, update(dt)->bool 存活 }
  let flashLight = null;

  function init(s) {
    scene = s;
    flashLight = new THREE.PointLight(0xffcc66, 0, 20);
    scene.add(flashLight);
  }

  function add(obj, fn) { scene.add(obj); live.push({ obj, fn }); }

  // 激光光束：亮紫色细圆柱，快速淡出
  function beam(from, to, color) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 0.05) return;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, len, 6),
      new THREE.MeshBasicMaterial({ color: color || 0xcc66ff, transparent: true, opacity: 0.95 })
    );
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    let life = 0.09;
    const total = life;
    add(mesh, (dt) => {
      life -= dt;
      mesh.material.opacity = 0.95 * Math.max(0, life / total);
      return life > 0;
    });
  }

  // 火花粒子
  function sparks(at, color, count, spread) {
    const n = count || 10;
    const geo = new THREE.BufferGeometry();
    const posArr = new Float32Array(n * 3);
    const vels = [];
    for (let i = 0; i < n; i++) {
      posArr[i * 3] = at.x; posArr[i * 3 + 1] = at.y; posArr[i * 3 + 2] = at.z;
      vels.push(new THREE.Vector3(
        (Math.random() - 0.5) * (spread || 5),
        Math.random() * 4,
        (Math.random() - 0.5) * (spread || 5)
      ));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: color || 0xffdd44, size: 0.08, transparent: true, opacity: 1
    }));
    let life = 0.35;
    add(pts, (dt) => {
      life -= dt;
      const p = geo.attributes.position.array;
      for (let i = 0; i < n; i++) {
        vels[i].y -= 12 * dt;
        p[i * 3] += vels[i].x * dt;
        p[i * 3 + 1] += vels[i].y * dt;
        p[i * 3 + 2] += vels[i].z * dt;
      }
      geo.attributes.position.needsUpdate = true;
      pts.material.opacity = Math.max(0, life / 0.35);
      return life > 0;
    });
  }

  // 爆炸：膨胀光球 + 粒子 + 闪光 + 震屏
  function explosion(at, radius) {
    flashLight.position.copy(at);
    flashLight.intensity = 4;
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffa832, transparent: true, opacity: 0.85 })
    );
    ball.position.copy(at);
    let life = 0.4;
    add(ball, (dt) => {
      life -= dt;
      const t = 1 - Math.max(0, life / 0.4);
      ball.scale.setScalar(0.3 + t * radius);
      ball.material.opacity = 0.85 * (1 - t);
      return life > 0;
    });
    sparks(at, 0xffcc44, 22, 9);
    sparks(at, 0xff5533, 14, 6);
    HS.cameraRig.shake(0.5, 0.35);
  }

  // 毒雾：紫色半透明圆柱，持续伤害敌人
  function poisonCloud(at, radius, duration, dps) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 1.6, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: HS.CFG.colors.poison, transparent: true, opacity: 0.3,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    mesh.position.copy(at).add(new THREE.Vector3(0, 0.8, 0));
    let life = duration, tick = 0;
    add(mesh, (dt) => {
      life -= dt;
      mesh.rotation.y += dt * 1.5;
      mesh.material.opacity = 0.3 * Math.min(1, life / 0.6);
      mesh.scale.setScalar(1 + Math.sin(life * 5) * 0.05);
      tick -= dt;
      if (tick <= 0) {   // 每 0.2 秒结算一次毒伤
        tick = 0.2;
        HS.enemies.poisonTick(mesh.position, radius, dps * 0.2);
      }
      return life > 0;
    });
    sparks(at, 0x9b4dff, 12, 3);
  }

  // 命中反馈闪光（小）
  function hitFlash(at, color) {
    sparks(at, color || 0xff4444, 6, 3);
  }

  function update(dt) {
    flashLight.intensity = Math.max(0, flashLight.intensity - dt * 20);
    for (let i = live.length - 1; i >= 0; i--) {
      if (!live[i].fn(dt)) {
        scene.remove(live[i].obj);
        if (live[i].obj.geometry) live[i].obj.geometry.dispose();
        if (live[i].obj.material) live[i].obj.material.dispose();
        live.splice(i, 1);
      }
    }
  }

  return {
    init, beam, sparks, explosion, poisonCloud, hitFlash, update,
    shake(mag, dur) { HS.cameraRig.shake(mag, dur); }
  };
})();
