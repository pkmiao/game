// cameraRig.js — 第三人称过肩 / 第一人称切换 / 相机防穿墙 / FOV 变化 / 屏幕震动
window.HS = window.HS || {};

HS.cameraRig = (function () {
  const cfg = () => HS.CFG.camera;
  let camera = null;
  let firstPerson = false;   // false = 第三人称（默认）
  let shakeMag = 0, shakeTime = 0;
  const _eye = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _camPos = new THREE.Vector3();
  const _shakeOff = new THREE.Vector3();

  function init(cam) {
    camera = cam;
    camera.rotation.order = 'YXZ';
  }

  function toggle() { firstPerson = !firstPerson; }

  function update(dt, now) {
    const p = HS.player;
    const aiming = HS.input.mouseDown.right;

    // —— FOV 平滑过渡 ——
    let targetFov = cfg().fov;
    if (aiming) targetFov = cfg().fovAim;
    else if (p.sliding) targetFov = cfg().fovSlide;
    else if (p.sprinting) targetFov = cfg().fovSprint;
    camera.fov += (targetFov - camera.fov) * Math.min(1, 10 * dt);
    camera.updateProjectionMatrix();

    // —— 相机位置与朝向 ——
    camera.rotation.y = p.yaw;
    camera.rotation.x = p.pitch;
    p.eyePos(_eye);

    if (firstPerson) {
      camera.position.copy(_eye);
      // 第一人称隐藏帽孩，避免看到自己的脸
      if (p.mesh) p.mesh.visible = p.alive ? false : false;
    } else {
      if (p.mesh && p.alive) p.mesh.visible = true;
      // 期望位置：眼点后方 + 右肩偏移
      _dir.set(0, 0, 1).applyQuaternion(camera.quaternion); // 相机后方
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      _camPos.copy(_eye)
        .addScaledVector(_dir, cfg().tpDist)
        .addScaledVector(right, cfg().tpRight)
        .add(new THREE.Vector3(0, cfg().tpUp, 0));
      // 防穿墙：从眼点向相机位置射线，命中则拉近
      const toCam = _camPos.clone().sub(_eye);
      const dist = toCam.length();
      toCam.normalize();
      const hit = HS.world.rayHit(_eye, toCam, dist);
      if (hit < dist) {
        _camPos.copy(_eye).addScaledVector(toCam, Math.max(0.25, hit - 0.25));
      }
      camera.position.copy(_camPos);
    }

    // —— 屏幕震动 ——
    if (shakeTime > 0) {
      shakeTime -= dt;
      const m = shakeMag * (shakeTime > 0 ? shakeTime : 0);
      _shakeOff.set(
        (Math.random() - 0.5) * m,
        (Math.random() - 0.5) * m,
        (Math.random() - 0.5) * m * 0.5
      );
      camera.position.add(_shakeOff);
      camera.rotation.z = (Math.random() - 0.5) * m * 0.06;
    } else {
      camera.rotation.z = 0;
    }
  }

  return {
    init, toggle, update,
    get firstPerson() { return firstPerson; },
    shake(mag, dur) { shakeMag = mag; shakeTime = dur; }
  };
})();
