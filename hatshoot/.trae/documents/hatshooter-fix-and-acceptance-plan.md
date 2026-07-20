# 《帽孩出击》敌人坠楼 Bug 修复与最终验收计划

## 一、摘要

游戏主体已全部完成（地图/玩家/武器/敌人/相机/HUD/音效/特效）。联调时发现「剩余敌人」开局即显示 8/12 而非 12/12。通过 Node 无头模拟逐帧追踪，已定位**唯一根因**：

[enemies.js](file:///d:/hatshoot/js/enemies.js#L113) 第 113 行敌人 z 轴钳位的**下界误用了 `e.roof.cx`**（应为 `e.roof.cz`）：

```javascript
// 当前（错误）：min 界用 cx，max 界用 cz
e.pos.z = Math.max(e.roof.cx - e.roof.d / 2 + m, Math.min(e.roof.cz + e.roof.d / 2 - m, e.pos.z));
```

对 cx > cz 的楼（楼 1/2/3），min 界 > 实际楼顶范围，第 1 帧 `Math.max` 就把敌人**瞬移到楼外**（如 e0 从 z=-0.5 → z=13.5），随即坠落、y<-2 触发摔死。修复为**一个标识符改动**：`e.roof.cx` → `e.roof.cz`。

## 二、现状分析（证据）

模拟数据（12/12 个敌人位置与该行代码完全吻合）：

| 敌人 | 楼顶 (cx, cz) | 生成 z | 第 1 帧 z | 结果 |
|---|---|---|---|---|
| e0/e1 | (20, 3) | -0.5 / 6.5 | **13.5**（=20-7+0.5） | 出楼坠落摔死 |
| e2/e3 | (17, -21) | -24.3 / -17.8 | **11.0**（=17-6.5+0.5） | 出楼坠落摔死 |
| e4 | (-14, -21) | -24.3 | -20.0（恰好落在本楼范围） | 幸存 |
| e5~e11 | cx < cz 的楼 | — | 不变（错误区间更宽但未瞬移） | 幸存 |

→ 恰好 4 个敌人摔死，与「8/12」现象完全一致。x 轴钳位（第 112 行）正确，无需改动。

其余模块审查结论：
- [world.js](file:///d:/hatshoot/js/world.js) 楼顶数据、AABB 碰撞（moveBody/rayHit）正确；12 个出生点经逐一对照箱子/空调箱位置，**均无重叠**，修复钳位后不会再有位移。
- [player.js](file:///d:/hatshoot/js/player.js)（滑铲/冲刺/跳跃/掉落重生）、[weapons.js](file:///d:/hatshoot/js/weapons.js)（四种武器）、[cameraRig.js](file:///d:/hatshoot/js/cameraRig.js)（双视角/防穿墙）、[main.js](file:///d:/hatshoot/js/main.js)（状态机）、[input.js](file:///d:/hatshoot/js/input.js)（指针锁定带回退）、[ui.js](file:///d:/hatshoot/js/ui.js)、[index.html](file:///d:/hatshoot/index.html) 逻辑自洽，未发现新 bug。
- 此前浏览器测试中「滑铲/切视角/射击/药瓶无效」，高度怀疑是测试时玩家已坠楼死亡（`update` 在 `!alive` 时直接返回）导致的连锁假象，修复敌人钳位后需在浏览器实测复验。

## 三、变更方案

### 1. 修复敌人钳位（唯一代码改动）
- **文件**：[enemies.js](file:///d:/hatshoot/js/enemies.js#L113)
- **改动**：第 113 行 `Math.max(e.roof.cx - e.roof.d / 2 + m, …)` 中的 `e.roof.cx` 改为 `e.roof.cz`。
- **为什么**：z 轴范围必须基于楼顶中心 z 坐标（cz）；当前 cx 导致 cx>cz 的楼上的敌人被钳到楼外摔死。
- **怎么做**：单标识符替换，一行内完成。

### 2. 无头脚本复验（不改代码，只跑脚本）
- 运行 `node _test_sim.js`，验收标准：
  - t=0 ~ t=10s 全程 `remaining=12`、`listLen=12`；
  - 无任何「下沉」警告、无 TELEPORT 日志；
  - 所有敌人 y 保持在自己楼顶高度（9~11），state 保持 idle（玩家不靠近不会触发追击）。
- 运行 `node _test_gameplay.js`（已创建，覆盖 11 项玩法断言：出生 12/12、冲刺、滑铲、V 切换、激光命中、换弹、榴弹爆炸、药瓶毒雾、雨伞近战、敌人 AI 伤血、掉楼重生、全灭回调），验收标准：全部 PASS。

### 3. 浏览器自动化冒烟测试
- 用 `start.bat` 同款方式起本地 HTTP 服务器（避免 file:// 限制），浏览器自动化打开 `http://localhost:端口/`。
- 逐项验证（通过页面内 JS 求值读取 `window.HS` 状态断言）：
  1. 控制台无报错；场景渲染；开始界面可见。
  2. 点击「开始游戏」→ `HS.enemies.remaining === 12`，HUD 显示 12/12。
  3. 模拟按键 W+Shift 冲刺 → 玩家位移且速度接近 9；冲刺中按 C → `HS.player.sliding === true`（滑铲触发）。
  4. 按 V → `HS.cameraRig.firstPerson === true`，再按 V 切回。
  5. 鼠标左键 → 激光枪弹药 30→29，有光束；按 R → 换弹回 30。
  6. 按 2 切榴弹 → 左键 → 弹药 4→3 且出现爆炸；按 G → 药瓶 3→2 且产生毒雾。
  7. 按 F → 雨伞挥击动作触发（冷却计时变化）。
  8. 求值 `HS.enemies.list.forEach(e => HS.enemies.damage(e, 9999, null))` → 触发胜利结算画面；点「再来一局」→ 重开且 remaining 回到 12。
  9. （选做）让玩家坠楼 → 扣 20 血并回出生点。
- 测试结束后解锁浏览器（当前浏览器处于锁定状态）。

### 4. 收尾清理
- 删除临时调试脚本 [_test_sim.js](file:///d:/hatshoot/_test_sim.js) 与 [_test_gameplay.js](file:///d:/hatshoot/_test_gameplay.js)（文件头均注明「临时调试用」，验收通过后移除，保持交付目录干净）。
- 最终交付说明：告诉用户双击 `index.html` 或 `start.bat` 即可离线游玩。

## 四、假设与决策

- **只改一个标识符**：模拟数据 12/12 全中，根因唯一，不做额外防御性改动（遵守最小改动原则）。
- **敌人出生点不变**：现有 ±25% 楼心偏移经核对不与任何箱子/空调箱重叠，无需调整。
- **cx < cz 的楼（4/5/6 号楼）当前“恰好没摔”**：但错误钳位区间过宽，追击时敌人可能被挤出南缘坠落；修复后该区隐患一并消除，不需单独处理。
- **指针锁定报错**：属自动化/非用户手势环境限制；`startGame` 已设计为锁定失败也进入游戏（main.js 第 69-70 行），真实用户点击开始按钮是合法手势，无需改动。
- **_test_sim.js 验收后删除**：它是本次调试的临时产物，不属于游戏交付内容。

## 五、验收步骤汇总

1. `node _test_sim.js` → 全程 remaining=12，无下沉/瞬移日志；`node _test_gameplay.js` → 全部 PASS。
2. 浏览器自动化 9 项冒烟测试全过，控制台零报错。
3. 全灭敌人出现胜利结算，重开正常。
4. 删除 `_test_sim.js` 与 `_test_gameplay.js`，目录恢复为纯游戏文件。
5. 向用户说明游玩方式（双击 index.html / start.bat）与键位表。

## 六、当前进度（2026-07-20）

- [x] 敌人钳位 bug 已修复（enemies.js L114，`cx`→`cz`，已读码确认）
- [x] `_test_gameplay.js` 无头玩法测试脚本已创建并调试完毕
- [ ] 步骤 1：跑两个无头脚本复验
- [ ] 步骤 2/3：浏览器自动化冒烟测试（9 项）
- [ ] 步骤 4/5：清理临时脚本 + 交付说明
