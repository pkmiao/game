window.HS = window.HS || {};

HS.zipline = (function () {
  const Z = () => HS.CFG.zipline;
  let active = false;
  let phase = 0;
  let curve = null;
  let length = 1;
  let t = 0;
  let riseT = 0;
  const startPos = new THREE.Vector3();
  const grabFrom = new THREE.Vector3();
  let nearLink = null, nearEnd = 0;

  function reset() {
    active = false;
    phase = 0;
    nearLink = null;
    HS.ui.ziplineHint(false);
  }

  function update(dt) {
    if (!HS.player.alive) return;
    if (active) {
      HS.ui.ziplineHint(false);
      return;
    }
    const pp = HS.player.pos;
    const z = Z();
    let best = null, bestEnd = 0, bestD = z.nearRange;
    HS.world.ziplineLinks.forEach((link) => {
      [link.aTop, link.bTop].forEach((top, end) => {
        const dx = top.x - pp.x, dz = top.z - pp.z;
        const horiz = Math.hypot(dx, dz);
        const dy = Math.abs((pp.y + 1.0) - top.y);
        if (horiz < bestD && dy < z.nearDy) {
          best = link; bestEnd = end; bestD = horiz;
        }
      });
    });
    nearLink = best;
    nearEnd = bestEnd;
    HS.ui.ziplineHint(!!best);
    if (best && HS.input.justHit('KeyE')) start(best, bestEnd);
  }

  function start(link, end) {
    const z = Z();
    const fromTop = end === 0 ? link.aTop : link.bTop;
    const toTop = end === 0 ? link.bTop : link.aTop;
    const dist = fromTop.distanceTo(toTop);
    const mid = fromTop.clone().add(toTop).multiplyScalar(0.5);
    mid.y -= dist * z.sag;
    curve = new THREE.CatmullRomCurve3([fromTop.clone(), mid, toTop.clone()]);
    length = Math.max(0.5, curve.getLength());
    startPos.copy(HS.player.pos);
    grabFrom.set(fromTop.x, fromTop.y - z.grabDrop, fromTop.z);
    t = 0;
    riseT = 0;
    phase = 0;
    active = true;
    HS.audio.uiClick();
  }

  function applyTo(pos, vel, dt) {
    const z = Z();
    if (phase === 0) {
      riseT += dt / z.riseTime;
      const k = Math.min(1, riseT);
      const e = k * k * (3 - 2 * k);
      pos.copy(startPos).lerp(grabFrom, e);
      vel.set(0, 0, 0);
      if (k >= 1) { phase = 1; t = 0; }
      return;
    }
    const speed = HS.CFG.player.walkSpeed * z.speedFactor;
    t += (speed / length) * dt;
    if (t >= 1) {
      const end = curve.getPointAt(1);
      pos.set(end.x, end.y - z.grabDrop, end.z);
      const tan = curve.getTangentAt(0.999);
      vel.set(tan.x * speed * 0.4, 0, tan.z * speed * 0.4);
      active = false;
      phase = 0;
      HS.audio.step();
      return;
    }
    const p = curve.getPointAt(t);
    pos.set(p.x, p.y - z.grabDrop, p.z);
    const tan = curve.getTangentAt(t);
    vel.set(tan.x * speed, tan.y * speed, tan.z * speed);
  }

  return {
    update, applyTo, reset,
    get active() { return active; }
  };
})();
