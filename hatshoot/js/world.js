// world.js — 镜之边缘风格地图：白色漂浮楼群 + 红色点缀 + 天空云海 + AABB 碰撞
window.HS = window.HS || {};

HS.world = (function () {
  const C = () => HS.CFG.colors;
  const colliders = [];   // THREE.Box3 列表（楼体、箱子、木板）
  const rooftops = [];    // 供敌人生成：{cx, cz, w, d, y}

  function addBox(scene, cx, cy, cz, w, h, d, color, opts) {
    opts = opts || {};
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color })
    );
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = opts.castShadow !== false;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (opts.edges !== false) {
      const eg = new THREE.EdgesGeometry(mesh.geometry);
      const line = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: C().edge }));
      mesh.add(line);
    }
    if (opts.collide !== false) {
      colliders.push(new THREE.Box3(
        new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
        new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2)
      ));
    }
    return mesh;
  }

  // —— 地图布局：7 栋漂浮大楼（间隙 3~4.5 米，可跳）——
  const buildings = [
    { cx: 0,   cz: 0,   w: 22, d: 22, h: 8  },   // 出生楼
    { cx: 20,  cz: 3,   w: 12, d: 14, h: 9  },
    { cx: 17,  cz: -21, w: 13, d: 13, h: 9.5 },
    { cx: -14, cz: -21, w: 16, d: 13, h: 10.5 },
    { cx: -21, cz: 3,   w: 13, d: 13, h: 9  },
    { cx: -10, cz: 22,  w: 15, d: 14, h: 11 },
    { cx: 13,  cz: 21,  w: 12, d: 12, h: 9.5 }
  ];

  // 红色箱子（掩体 + 垫脚）
  const crates = [
    { x: 5,   y: 8,   z: 3,   s: 1.4 }, { x: -6,  y: 8,   z: -5,  s: 1 },
    { x: 20,  y: 9,   z: 7,   s: 1.2 }, { x: 16,  y: 9,   z: -1,  s: 1 },
    { x: 14,  y: 9.5, z: -18, s: 1.3 }, { x: 21,  y: 9.5, z: -24, s: 1 },
    { x: -17, y: 10.5, z: -18, s: 1.4 }, { x: -10, y: 10.5, z: -24, s: 1 },
    { x: -24, y: 9,   z: 6,   s: 1.2 }, { x: -18, y: 9,   z: -1,  s: 1 },
    { x: -13, y: 11,  z: 25,  s: 1.4 }, { x: -6,  y: 11,  z: 19,  s: 1 },
    { x: 10,  y: 9.5, z: 24,  s: 1.2 }, { x: 16,  y: 9.5, z: 18,  s: 1 }
  ];

  function build(scene) {
    const cols = C();

    // 天空 & 雾
    scene.background = new THREE.Color(cols.sky);
    scene.fog = new THREE.Fog(cols.fog, 70, 240);

    // 光照：太阳 + 天空半球光
    const sun = new THREE.DirectionalLight(0xffffff, 0.95);
    sun.position.set(50, 90, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
    sun.shadow.camera.far = 260;
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0xffffff, 0.55));

    // 云海（楼下的白色海洋，掉下去前看到的）
    const cloudSea = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    cloudSea.rotation.x = -Math.PI / 2;
    cloudSea.position.y = -18;
    cloudSea.receiveShadow = false;
    scene.add(cloudSea);
    // 几朵立体云
    for (let i = 0; i < 14; i++) {
      const cl = new THREE.Mesh(
        new THREE.SphereGeometry(4 + Math.random() * 5, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
      );
      cl.scale.y = 0.35;
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 90;
      cl.position.set(Math.cos(a) * r, -10 + Math.random() * 14, Math.sin(a) * r);
      scene.add(cl);
    }

    // 大楼（从云海伸出的白色塔楼，底部在云下）
    buildings.forEach((b) => {
      const bodyH = b.h + 24; // 楼体伸到云下
      addBox(scene, b.cx, b.h - bodyH / 2, b.cz, b.w, bodyH, b.d, cols.building);
      rooftops.push({ cx: b.cx, cz: b.cz, w: b.w, d: b.d, y: b.h });
      // 楼顶红色点缀：管道
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, b.w * 0.7, 8),
        new THREE.MeshLambertMaterial({ color: cols.red })
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(b.cx, b.h + 0.12, b.cz - b.d / 2 + 0.4);
      pipe.castShadow = true;
      scene.add(pipe);
      // 白色空调箱
      addBox(scene, b.cx + b.w / 2 - 1.4, b.h + 0.4, b.cz + b.d / 2 - 1.4, 1.6, 0.8, 1.6, 0xe8ecf1);
      // 天线
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 3.2, 6),
        new THREE.MeshLambertMaterial({ color: 0x8899aa })
      );
      ant.position.set(b.cx - b.w / 2 + 1, b.h + 1.6, b.cz - b.d / 2 + 1);
      scene.add(ant);
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshLambertMaterial({ color: cols.red })
      );
      tip.position.set(ant.position.x, b.h + 3.3, ant.position.z);
      scene.add(tip);
    });

    // 出生楼加一扇红色消防门装饰（靠墙立着）
    addBox(scene, -3, 8 + 1.1, -10.6, 1.4, 2.2, 0.15, cols.red, { collide: false });

    // 红色箱子
    crates.forEach((c) => addBox(scene, c.x, c.y + c.s / 2, c.z, c.s, c.s, c.s, cols.red));

    // 远处剪影楼群（镜之边缘式天际线，无碰撞）
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + Math.random() * 0.2;
      const r = 110 + Math.random() * 80;
      const w = 12 + Math.random() * 18;
      const h = 20 + Math.random() * 45;
      const m = addBox(scene, Math.cos(a) * r, h / 2 - 16, Math.sin(a) * r, w, h, w, 0xdde7f2,
        { collide: false, edges: false, castShadow: false });
      m.material.fog = true;
    }

    return { colliders, rooftops };
  }

  // —— 碰撞：胶囊近似为 AABB（脚底 pos，半径 r，高 h），逐轴解算 ——
  // 返回 true 表示站在地面上
  function moveBody(pos, vel, r, h, dt) {
    let grounded = false;

    // X 轴
    pos.x += vel.x * dt;
    for (const b of colliders) {
      if (overlap(pos, r, h, b)) {
        if (vel.x > 0) pos.x = b.min.x - r; else if (vel.x < 0) pos.x = b.max.x + r;
        vel.x = 0;
      }
    }
    // Z 轴
    pos.z += vel.z * dt;
    for (const b of colliders) {
      if (overlap(pos, r, h, b)) {
        if (vel.z > 0) pos.z = b.min.z - r; else if (vel.z < 0) pos.z = b.max.z + r;
        vel.z = 0;
      }
    }
    // Y 轴
    pos.y += vel.y * dt;
    for (const b of colliders) {
      if (overlap(pos, r, h, b)) {
        if (vel.y <= 0) { pos.y = b.max.y; grounded = true; }
        else pos.y = b.min.y - h;
        vel.y = 0;
      }
    }
    return grounded;
  }

  function overlap(pos, r, h, b) {
    return pos.x + r > b.min.x && pos.x - r < b.max.x &&
           pos.y + h > b.min.y && pos.y < b.max.y &&
           pos.z + r > b.min.z && pos.z - r < b.max.z;
  }

  // 射线 vs 所有碰撞体，返回最近命中距离（没有则 Infinity）
  const _tmp = new THREE.Vector3();
  function rayHit(origin, dir, maxDist) {
    const ray = new THREE.Ray(origin, dir);
    let best = Infinity;
    for (const b of colliders) {
      const p = ray.intersectBox(b, _tmp);
      if (p) {
        const d = origin.distanceTo(p);
        if (d < best && d <= maxDist) best = d;
      }
    }
    return best;
  }

  return { build, moveBody, rayHit, colliders, rooftops };
})();
