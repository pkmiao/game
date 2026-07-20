// models/mafia.js — 程序化拼装的《时光之帽》黑手软党打手
// 白西装、圆顶礼帽、胡子、红领带，块头比帽孩大
window.HS = window.HS || {};

HS.buildMafia = function () {
  const C = HS.CFG.colors;
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const g = (geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.castShadow = true;
    return mesh;
  };

  const root = new THREE.Group(); // 原点在脚底
  const parts = {};

  // 壮硕身体（白西装）
  const body = new THREE.Group();
  body.position.y = 0.82;
  body.add(g(new THREE.BoxGeometry(0.62, 0.58, 0.36), mat(C.mafiaSuit), 0, 0.16, 0));
  // 红领带
  body.add(g(new THREE.BoxGeometry(0.09, 0.34, 0.02), mat(C.red), 0, 0.18, 0.19));
  // 衬衫领口
  body.add(g(new THREE.BoxGeometry(0.2, 0.08, 0.02), mat(0x333333), 0, 0.4, 0.19));
  root.add(body);
  parts.body = body;

  // 头
  const head = new THREE.Group();
  head.position.y = 0.58; // 相对身体
  head.add(g(new THREE.SphereGeometry(0.19, 14, 10), mat(C.skin), 0, 0.1, 0));
  // 眼睛（凶一点：小黑点 + 浓眉）
  head.add(g(new THREE.SphereGeometry(0.028, 8, 6), mat(0x111111), -0.065, 0.12, 0.17));
  head.add(g(new THREE.SphereGeometry(0.028, 8, 6), mat(0x111111), 0.065, 0.12, 0.17));
  head.add(g(new THREE.BoxGeometry(0.09, 0.02, 0.02), mat(0x111111), -0.065, 0.165, 0.175));
  head.add(g(new THREE.BoxGeometry(0.09, 0.02, 0.02), mat(0x111111), 0.065, 0.165, 0.175));
  // 大胡子（黑手软党标志）
  const must = g(new THREE.BoxGeometry(0.16, 0.045, 0.04), mat(0x1a1a1a), 0, 0.045, 0.18);
  head.add(must);
  // 圆顶礼帽
  const hat = new THREE.Group();
  hat.position.y = 0.24;
  hat.add(g(new THREE.CylinderGeometry(0.21, 0.21, 0.025, 14), mat(C.mafiaHat), 0, 0.01, 0));
  const dome = g(new THREE.SphereGeometry(0.13, 12, 8), mat(C.mafiaHat), 0, 0.05, 0);
  dome.scale.set(1, 0.75, 1);
  hat.add(dome);
  head.add(hat);
  parts.hat = hat;
  body.add(head);
  parts.head = head;

  // 粗壮手臂（白袖子 + 大拳头）
  function makeArm(side) {
    const arm = new THREE.Group();
    arm.position.set(0.36 * side, 0.4, 0);
    arm.add(g(new THREE.CylinderGeometry(0.08, 0.075, 0.46, 8), mat(C.mafiaSuit), 0, -0.2, 0));
    arm.add(g(new THREE.SphereGeometry(0.085, 8, 6), mat(C.skin), 0, -0.46, 0)); // 拳头
    body.add(arm);
    return arm;
  }
  parts.armL = makeArm(-1);
  parts.armR = makeArm(1);

  // 腿（白西裤 + 黑皮鞋）
  function makeLeg(side) {
    const leg = new THREE.Group();
    leg.position.set(0.16 * side, 0.82, 0);
    leg.add(g(new THREE.CylinderGeometry(0.085, 0.08, 0.5, 8), mat(C.mafiaSuit), 0, -0.28, 0));
    leg.add(g(new THREE.BoxGeometry(0.14, 0.09, 0.24), mat(0x141414), 0, -0.56, 0.04));
    root.add(leg);
    return leg;
  }
  parts.legL = makeLeg(-1);
  parts.legR = makeLeg(1);

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: root, parts, height: 1.7 };
};
