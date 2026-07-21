window.HS = window.HS || {};

HS.buildMafia = function () {
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const g = (geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.castShadow = true;
    return mesh;
  };

  const suitBlue = 0x2f6fd0;
  const suitBlueD = 0x235bb0;
  const pantsBlue = 0x2a63c0;
  const shirtW = 0xeef1f5;
  const tieRed = 0xc0282a;
  const strapW = 0xe8ebf0;
  const apronW = 0xdfe3ea;
  const beltK = 0x15151a;
  const skin = 0xe8b07a;
  const nose = 0xd98a4a;
  const dark = 0x141414;
  const tooth = 0xf2f2ee;
  const shoe = 0x141416;

  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = -0.215;
  root.add(inner);
  const parts = {};

  const body = new THREE.Group();
  body.position.y = 0.82;
  body.add(g(new THREE.BoxGeometry(0.66, 0.6, 0.4), mat(suitBlue), 0, 0.14, 0));
  body.add(g(new THREE.SphereGeometry(0.13, 10, 8), mat(suitBlue), -0.34, 0.4, 0));
  body.add(g(new THREE.SphereGeometry(0.13, 10, 8), mat(suitBlue), 0.34, 0.4, 0));

  body.add(g(new THREE.BoxGeometry(0.2, 0.12, 0.05), mat(shirtW), 0, 0.4, 0.18));
  const lapL = g(new THREE.BoxGeometry(0.1, 0.22, 0.03), mat(suitBlueD), -0.12, 0.3, 0.2);
  lapL.rotation.z = 0.25;
  body.add(lapL);
  const lapR = g(new THREE.BoxGeometry(0.1, 0.22, 0.03), mat(suitBlueD), 0.12, 0.3, 0.2);
  lapR.rotation.z = -0.25;
  body.add(lapR);

  body.add(g(new THREE.BoxGeometry(0.07, 0.07, 0.05), mat(tieRed), 0, 0.36, 0.22));
  const tie = g(new THREE.BoxGeometry(0.08, 0.32, 0.03), mat(tieRed), 0, 0.16, 0.21);
  body.add(tie);
  const tieTip = g(new THREE.ConeGeometry(0.05, 0.08, 4), mat(tieRed), 0, -0.02, 0.21);
  tieTip.rotation.y = Math.PI / 4;
  body.add(tieTip);

  const strapL = g(new THREE.BoxGeometry(0.05, 0.52, 0.02), mat(strapW), -0.15, 0.18, 0.21);
  strapL.rotation.z = 0.13;
  body.add(strapL);
  const strapR = g(new THREE.BoxGeometry(0.05, 0.52, 0.02), mat(strapW), 0.15, 0.18, 0.21);
  strapR.rotation.z = -0.13;
  body.add(strapR);

  body.add(g(new THREE.BoxGeometry(0.46, 0.52, 0.03), mat(apronW), 0, -0.2, 0.21));
  body.add(g(new THREE.BoxGeometry(0.52, 0.06, 0.05), mat(beltK), 0, 0.02, 0.21));
  body.add(g(new THREE.BoxGeometry(0.32, 0.05, 0.03), mat(beltK), 0, -0.04, -0.2));
  const tailL = g(new THREE.BoxGeometry(0.03, 0.32, 0.02), mat(beltK), 0.07, -0.28, -0.21);
  tailL.rotation.z = 0.25;
  body.add(tailL);
  const tailR = g(new THREE.BoxGeometry(0.03, 0.28, 0.02), mat(beltK), -0.05, -0.26, -0.21);
  tailR.rotation.z = -0.18;
  body.add(tailR);
  inner.add(body);
  parts.body = body;

  const head = new THREE.Group();
  head.position.y = 0.58;
  const skull = g(new THREE.SphereGeometry(0.19, 16, 12), mat(skin), 0, 0.1, 0);
  skull.scale.set(1, 0.96, 1.02);
  head.add(skull);
  head.add(g(new THREE.BoxGeometry(0.12, 0.012, 0.01), mat(nose), 0, 0.24, 0.165));
  head.add(g(new THREE.BoxGeometry(0.13, 0.012, 0.01), mat(nose), 0, 0.215, 0.17));

  const browL = g(new THREE.BoxGeometry(0.1, 0.028, 0.02), mat(dark), -0.065, 0.165, 0.175);
  browL.rotation.z = -0.35;
  head.add(browL);
  const browR = g(new THREE.BoxGeometry(0.1, 0.028, 0.02), mat(dark), 0.065, 0.165, 0.175);
  browR.rotation.z = 0.35;
  head.add(browR);
  head.add(g(new THREE.SphereGeometry(0.03, 8, 6), mat(dark), -0.065, 0.12, 0.175));
  head.add(g(new THREE.SphereGeometry(0.03, 8, 6), mat(dark), 0.065, 0.12, 0.175));

  const noseM = g(new THREE.BoxGeometry(0.06, 0.1, 0.08), mat(nose), 0, 0.08, 0.2);
  head.add(noseM);

  const mustL = g(new THREE.BoxGeometry(0.08, 0.035, 0.03), mat(dark), -0.05, 0.02, 0.185);
  mustL.rotation.z = 0.3;
  head.add(mustL);
  const mustR = g(new THREE.BoxGeometry(0.08, 0.035, 0.03), mat(dark), 0.05, 0.02, 0.185);
  mustR.rotation.z = -0.3;
  head.add(mustR);

  head.add(g(new THREE.BoxGeometry(0.12, 0.055, 0.02), mat(dark), 0, -0.025, 0.165));
  head.add(g(new THREE.BoxGeometry(0.1, 0.04, 0.02), mat(tooth), 0, -0.025, 0.175));
  head.add(g(new THREE.BoxGeometry(0.012, 0.04, 0.02), mat(dark), 0, -0.025, 0.18));

  const earL = g(new THREE.SphereGeometry(0.045, 8, 6), mat(skin), -0.18, 0.1, 0);
  const earR = g(new THREE.SphereGeometry(0.045, 8, 6), mat(skin), 0.18, 0.1, 0);
  head.add(earL); head.add(earR);
  body.add(head);
  parts.head = head;

  function makeArm(side) {
    const arm = new THREE.Group();
    arm.position.set(0.34 * side, 0.4, 0);
    const upper = g(new THREE.CylinderGeometry(0.1, 0.09, 0.34, 8), mat(suitBlue), 0.04 * side, -0.17, 0.02);
    upper.rotation.z = 0.12 * side;
    arm.add(upper);
    arm.add(g(new THREE.SphereGeometry(0.1, 10, 8), mat(suitBlue), 0.1 * side, -0.34, 0.05));
    const fore = g(new THREE.CylinderGeometry(0.09, 0.085, 0.3, 8), mat(suitBlue), -0.02 * side, -0.36, 0.18);
    fore.rotation.x = 1.45;
    fore.rotation.z = -0.6 * side;
    arm.add(fore);
    arm.add(g(new THREE.SphereGeometry(0.024, 6, 5), mat(tieRed), 0.07 * side, -0.33, 0.12));
    arm.add(g(new THREE.SphereGeometry(0.024, 6, 5), mat(tieRed), 0.03 * side, -0.345, 0.17));
    arm.add(g(new THREE.SphereGeometry(0.024, 6, 5), mat(tieRed), -0.01 * side, -0.36, 0.22));
    arm.add(g(new THREE.SphereGeometry(0.11, 10, 8), mat(skin), -0.08 * side, -0.38, 0.32));
    const knuckle = g(new THREE.BoxGeometry(0.1, 0.08, 0.06), mat(skin), -0.08 * side, -0.36, 0.4);
    arm.add(knuckle);
    body.add(arm);
    return arm;
  }
  parts.armL = makeArm(1);
  parts.armR = makeArm(-1);

  function makeLeg(side) {
    const leg = new THREE.Group();
    leg.position.set(0.16 * side, 0.82, 0);
    leg.add(g(new THREE.CylinderGeometry(0.09, 0.085, 0.5, 8), mat(pantsBlue), 0, -0.28, 0));
    leg.add(g(new THREE.BoxGeometry(0.15, 0.09, 0.26), mat(shoe), 0, -0.56, 0.04));
    inner.add(leg);
    return leg;
  }
  parts.legL = makeLeg(1);
  parts.legR = makeLeg(-1);

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: root, parts, height: 1.7 };
};
