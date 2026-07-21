window.HS = window.HS || {};

HS.buildUmbrella = function () {
  const C = HS.CFG.colors;
  const u = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: C.umbWood });
  const blue = new THREE.MeshLambertMaterial({ color: C.umbBlue });
  const blueD = new THREE.MeshLambertMaterial({ color: 0x2f7fb0 });
  const starM = new THREE.MeshBasicMaterial({ color: C.umbStar, side: THREE.DoubleSide });
  const tipM = new THREE.MeshLambertMaterial({ color: 0x4a2c12 });
  const mk = (geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.castShadow = true;
    return mesh;
  };

  u.add(mk(new THREE.CylinderGeometry(0.016, 0.02, 0.26, 8), wood, 0, -0.24, 0));
  u.add(mk(new THREE.SphereGeometry(0.026, 8, 6), wood, 0, -0.38, 0));

  const canopyTop = mk(new THREE.ConeGeometry(0.15, 0.34, 10), blue, 0, 0.2, 0);
  u.add(canopyTop);
  const canopyBot = mk(new THREE.ConeGeometry(0.15, 0.14, 10), blue, 0, -0.02, 0);
  canopyBot.rotation.x = Math.PI;
  u.add(canopyBot);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const fr = mk(new THREE.ConeGeometry(0.035, 0.09, 4), blueD, Math.cos(a) * 0.135, -0.1, Math.sin(a) * 0.135);
    fr.rotation.x = Math.PI;
    u.add(fr);
  }

  u.add(mk(new THREE.ConeGeometry(0.022, 0.07, 6), tipM, 0, 0.4, 0));

  const starShape = new THREE.Shape();
  const R = 0.06, r = 0.025;
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
    if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
  }
  const starGeo = new THREE.ShapeGeometry(starShape);
  const placeStar = (rotY) => {
    const s = new THREE.Mesh(starGeo, starM);
    s.position.set(Math.sin(rotY) * 0.152, 0.18, Math.cos(rotY) * 0.152);
    s.rotation.y = rotY;
    s.rotation.x = -0.25;
    u.add(s);
  };
  placeStar(0);
  placeStar(Math.PI * 0.7);
  placeStar(-Math.PI * 0.7);

  u.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return u;
};

HS.buildHatKid = function () {
  const C = HS.CFG.colors;
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const g = (geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.castShadow = true;
    return mesh;
  };

  const root = new THREE.Group();
  const parts = {};

  const body = new THREE.Group();
  body.position.y = 0.58;
  body.add(g(new THREE.BoxGeometry(0.4, 0.34, 0.25), mat(C.shirtPurple), 0, 0.16, 0));
  body.add(g(new THREE.BoxGeometry(0.42, 0.16, 0.27), mat(C.shirtPurple), 0, -0.06, 0));
  body.add(g(new THREE.BoxGeometry(0.05, 0.3, 0.02), mat(C.capeYellow), 0, 0.16, 0.135));

  const collar = g(new THREE.TorusGeometry(0.13, 0.05, 8, 14), mat(C.capeYellow), 0, 0.34, 0.02);
  collar.rotation.x = Math.PI / 2;
  body.add(collar);
  const cape = g(new THREE.BoxGeometry(0.46, 0.5, 0.04), mat(C.capeYellow), 0, 0.06, -0.15);
  cape.rotation.x = 0.12;
  body.add(cape);
  const capeL = g(new THREE.BoxGeometry(0.16, 0.42, 0.05), mat(C.capeYellow), -0.2, 0.02, -0.06);
  capeL.rotation.z = 0.25;
  body.add(capeL);
  const capeR = g(new THREE.BoxGeometry(0.16, 0.42, 0.05), mat(C.capeYellow), 0.2, 0.02, -0.06);
  capeR.rotation.z = -0.25;
  body.add(capeR);

  const lock = g(new THREE.BoxGeometry(0.07, 0.08, 0.03), mat(C.lockGray), 0, 0.18, 0.14);
  body.add(lock);
  const shackle = g(new THREE.TorusGeometry(0.028, 0.008, 6, 10, Math.PI), mat(C.lockGray), 0, 0.23, 0.14);
  body.add(shackle);
  root.add(body);
  parts.body = body;

  const head = new THREE.Group();
  head.position.y = 0.42;
  head.add(g(new THREE.SphereGeometry(0.21, 16, 12), mat(C.skin), 0, 0.12, 0));
  const eyeWhiteL = g(new THREE.SphereGeometry(0.05, 10, 8), mat(0xffffff), -0.075, 0.14, 0.17);
  const eyeWhiteR = g(new THREE.SphereGeometry(0.05, 10, 8), mat(0xffffff), 0.075, 0.14, 0.17);
  head.add(eyeWhiteL); head.add(eyeWhiteR);
  head.add(g(new THREE.SphereGeometry(0.028, 8, 6), mat(C.eyeBlue), -0.072, 0.14, 0.205));
  head.add(g(new THREE.SphereGeometry(0.028, 8, 6), mat(C.eyeBlue), 0.072, 0.14, 0.205));
  head.add(g(new THREE.SphereGeometry(0.012, 6, 5), mat(0x111111), -0.068, 0.14, 0.225));
  head.add(g(new THREE.SphereGeometry(0.012, 6, 5), mat(0x111111), 0.068, 0.14, 0.225));
  const hairM = mat(C.hair);
  const hairBack = g(new THREE.SphereGeometry(0.2, 12, 8), hairM, 0, 0.16, -0.06);
  hairBack.scale.set(1.05, 0.95, 0.95);
  head.add(hairBack);
  head.add(g(new THREE.SphereGeometry(0.075, 8, 6), hairM, -0.19, 0.0, 0.02));
  head.add(g(new THREE.SphereGeometry(0.075, 8, 6), hairM, 0.19, 0.0, 0.02));
  head.add(g(new THREE.SphereGeometry(0.06, 8, 6), hairM, -0.16, -0.12, 0.04));
  head.add(g(new THREE.SphereGeometry(0.06, 8, 6), hairM, 0.16, -0.12, 0.04));
  const fringe = g(new THREE.SphereGeometry(0.16, 12, 8), hairM, 0, 0.24, 0.1);
  fringe.scale.set(1.1, 0.5, 0.7);
  head.add(fringe);

  const hat = new THREE.Group();
  hat.position.y = 0.26;
  hat.add(g(new THREE.CylinderGeometry(0.23, 0.23, 0.03, 16), mat(C.hatPurple), 0, 0.02, 0));
  hat.add(g(new THREE.CylinderGeometry(0.135, 0.15, 0.28, 16), mat(C.hatPurple), 0, 0.17, 0));
  hat.add(g(new THREE.CylinderGeometry(0.152, 0.155, 0.05, 16), mat(C.hatYellow), 0, 0.075, 0));
  hat.rotation.z = 0.06;
  head.add(hat);
  parts.hat = hat;
  body.add(head);
  parts.head = head;

  function makeArm(side) {
    const arm = new THREE.Group();
    arm.position.set(0.24 * side, 0.3, 0);
    arm.add(g(new THREE.CylinderGeometry(0.055, 0.05, 0.22, 8), mat(C.shirtPurple), 0, -0.11, 0));
    arm.add(g(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 8), mat(C.skin), 0, -0.27, 0));
    arm.add(g(new THREE.SphereGeometry(0.05, 8, 6), mat(C.skin), 0, -0.35, 0));
    body.add(arm);
    return arm;
  }
  parts.armL = makeArm(1);
  parts.armR = makeArm(-1);

  const umb = HS.buildUmbrella();
  umb.position.set(0, -0.36, 0.02);
  umb.rotation.x = 0.5;
  parts.armR.add(umb);
  parts.umbrella = umb;

  function makeLeg(side, isLeft) {
    const leg = new THREE.Group();
    leg.position.set(0.1 * side, 0.6, 0);
    leg.add(g(new THREE.CylinderGeometry(0.07, 0.06, 0.26, 8), mat(C.shirtPurple), 0, -0.13, 0));
    const knee = new THREE.Group();
    knee.position.set(0, -0.26, 0);
    knee.add(g(new THREE.SphereGeometry(0.06, 8, 6), mat(C.sockWhite), 0, 0, 0));
    knee.add(g(new THREE.CylinderGeometry(0.055, 0.05, 0.26, 8), mat(C.sockWhite), 0, -0.13, 0));
    knee.add(g(new THREE.BoxGeometry(0.1, 0.08, 0.17), mat(C.bootBrown), 0, -0.3, 0.03));
    leg.add(knee);
    root.add(leg);
    if (isLeft) parts.kneeL = knee; else parts.kneeR = knee;
    return leg;
  }
  parts.legL = makeLeg(1, true);
  parts.legR = makeLeg(-1, false);

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: root, parts, height: 1.2 };
};
