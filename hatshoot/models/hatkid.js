// models/hatkid.js — 程序化拼装的帽孩（紫高帽、黄上衣、蓝裤、手持雨伞）
// 返回 { group, parts }，parts 中四肢为关节 Group，便于代码动画
window.HS = window.HS || {};

HS.buildHatKid = function () {
  const C = HS.CFG.colors;
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const g = (geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.castShadow = true;
    return mesh;
  };

  const root = new THREE.Group();      // 原点在脚底
  const parts = {};

  // 身体（黄色外套）
  const body = new THREE.Group();
  body.position.y = 0.58;
  body.add(g(new THREE.BoxGeometry(0.42, 0.42, 0.26), mat(C.hatYellow), 0, 0.12, 0));
  // 拉链（紫色竖条）
  body.add(g(new THREE.BoxGeometry(0.05, 0.4, 0.02), mat(C.hatPurple), 0, 0.12, 0.14));
  root.add(body);
  parts.body = body;

  // 头（大一点的卡通头）
  const head = new THREE.Group();
  head.position.y = 0.42; // 相对身体
  const headMesh = g(new THREE.SphereGeometry(0.21, 16, 12), mat(C.skin), 0, 0.12, 0);
  head.add(headMesh);
  // 眼睛
  head.add(g(new THREE.SphereGeometry(0.032, 8, 6), mat(0x222222), -0.075, 0.14, 0.185));
  head.add(g(new THREE.SphereGeometry(0.032, 8, 6), mat(0x222222), 0.075, 0.14, 0.185));
  // 棕色头发（后脑 + 两侧）
  const hairM = mat(C.hair);
  const hairBack = g(new THREE.SphereGeometry(0.2, 12, 8), hairM, 0, 0.16, -0.06);
  hairBack.scale.set(1.05, 0.9, 0.9);
  head.add(hairBack);
  head.add(g(new THREE.SphereGeometry(0.07, 8, 6), hairM, -0.2, 0.02, -0.02));
  head.add(g(new THREE.SphereGeometry(0.07, 8, 6), hairM, 0.2, 0.02, -0.02));
  // 紫色高帽：帽筒 + 帽檐 + 黄色帽带
  const hat = new THREE.Group();
  hat.position.y = 0.26;
  hat.add(g(new THREE.CylinderGeometry(0.23, 0.23, 0.03, 16), mat(C.hatPurple), 0, 0.02, 0)); // 帽檐
  hat.add(g(new THREE.CylinderGeometry(0.135, 0.15, 0.26, 16), mat(C.hatPurple), 0, 0.16, 0)); // 帽筒
  hat.add(g(new THREE.CylinderGeometry(0.152, 0.155, 0.05, 16), mat(C.hatYellow), 0, 0.075, 0)); // 帽带
  hat.rotation.z = 0.06;
  head.add(hat);
  parts.hat = hat;
  body.add(head);
  parts.head = head;

  // 手臂（肩关节在原点，几何体向下偏移）
  function makeArm(side) { // side: -1 左, 1 右
    const arm = new THREE.Group();
    arm.position.set(0.24 * side, 0.3, 0);
    arm.add(g(new THREE.CylinderGeometry(0.055, 0.05, 0.34, 8), mat(C.hatYellow), 0, -0.14, 0));
    arm.add(g(new THREE.SphereGeometry(0.055, 8, 6), mat(C.skin), 0, -0.33, 0)); // 手
    body.add(arm);
    return arm;
  }
  parts.armL = makeArm(-1);
  parts.armR = makeArm(1);

  // 雨伞（挂在右手末端）
  const umb = new THREE.Group();
  umb.position.set(0, -0.36, 0.02);
  const umbM = mat(C.hatPurple);
  umb.add(g(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 6), umbM, 0, 0, 0)); // 伞杆
  const canopy = g(new THREE.ConeGeometry(0.16, 0.22, 8), umbM, 0, 0.28, 0);
  umb.add(canopy);
  umb.add(g(new THREE.SphereGeometry(0.02, 6, 4), mat(0xffffff), 0, 0.41, 0)); // 伞尖
  // 伞柄弯钩
  umb.add(g(new THREE.TorusGeometry(0.045, 0.012, 6, 10, Math.PI), mat(C.hatYellow), 0, -0.33, 0));
  umb.rotation.x = 0.5; // 平时斜持
  parts.armR.add(umb);
  parts.umbrella = umb;

  // 腿（髋关节在原点）
  function makeLeg(side) {
    const leg = new THREE.Group();
    leg.position.set(0.11 * side, 0.58, 0);
    leg.add(g(new THREE.CylinderGeometry(0.06, 0.055, 0.32, 8), mat(C.pants), 0, -0.18, 0)); // 蓝裤
    leg.add(g(new THREE.BoxGeometry(0.09, 0.07, 0.16), mat(0x663399), 0, -0.37, 0.03)); // 鞋子
    root.add(leg);
    return leg;
  }
  parts.legL = makeLeg(-1);
  parts.legR = makeLeg(1);

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: root, parts, height: 1.2 };
};
