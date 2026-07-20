// config.js — 所有可调数值集中在这里，想改难度/手感只改这个文件
window.HS = window.HS || {};

HS.CFG = {
  player: {
    hp: 100,
    radius: 0.35,
    height: 1.2,          // 站立高度（帽孩是小个子）
    crouchHeight: 0.8,
    slideHeight: 0.55,
    walkSpeed: 6,
    sprintSpeed: 9,
    crouchSpeed: 3,
    jumpVel: 9.5,
    gravity: 22,
    regenDelay: 5,        // 脱战几秒后开始回血
    regenRate: 12,        // 每秒回血量
    fallDamage: 20,       // 掉出地图扣血
    slide: {
      duration: 0.95,     // 滑铲时长（秒）
      boost: 3.5,         // 在冲刺速度上额外加成
      cooldown: 0.5
    }
  },

  camera: {
    fov: 75,
    fovSprint: 82,
    fovSlide: 88,
    fovAim: 55,
    tpDist: 3.4,          // 第三人称相机距离
    tpRight: 0.6,         // 过肩右偏移
    tpUp: 0.35,
    sens: 0.0023          // 鼠标灵敏度
  },

  weapons: {
    laser: {
      name: '激光枪',
      mag: 30,
      damage: 20,
      interval: 0.12,     // 射速（秒/发）
      reload: 1.2,
      spreadHip: 0.012    // 腰射散布（弧度），瞄准时为 0
    },
    grenade: {
      name: '榴弹发射器',
      mag: 4,
      damage: 80,
      radius: 4,
      selfFactor: 0.5,    // 自伤比例
      interval: 0.8,
      reload: 2.0,
      projSpeed: 20
    },
    potion: {
      name: '药瓶手雷',
      count: 3,           // 每局携带数量
      radius: 2.5,
      duration: 3,
      dps: 10,            // 毒雾每秒伤害
      throwSpeed: 14
    },
    umbrella: {
      name: '雨伞',
      damage: 35,
      range: 2.5,
      arc: Math.PI / 3,   // 扇形半角（±60°）
      cooldown: 0.6,
      knockback: 7
    }
  },

  enemy: {
    count: 12,
    hp: 100,
    speed: 4.2,
    aggroRange: 16,
    attackRange: 1.7,
    hitRange: 2.1,
    damage: 15,
    windup: 0.5,          // 挥拳前摇
    recover: 0.7          // 挥拳后硬直
  },

  colors: {
    sky: 0xbfe3ff,
    fog: 0xd8ecff,
    building: 0xf6f8fb,
    edge: 0xcfd6de,
    red: 0xe63229,
    hatPurple: 0x6a3d9a,
    hatYellow: 0xffd94d,
    skin: 0xffd9b3,
    hair: 0x7a4a21,
    pants: 0x3b6fd4,
    mafiaSuit: 0xf2f2f2,
    mafiaHat: 0x2b2b33,
    poison: 0x9b4dff
  }
};
