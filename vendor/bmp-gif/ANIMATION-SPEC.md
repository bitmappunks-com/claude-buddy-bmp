# BMP 动画规范

两类动画，分开描述：
- **基础动作（BASE actions）**：在 base 上叠加的小修改，如 blink / move。用 **ops** 描述（set / swap），每帧 = base + 少量像素改动。详见 [`actions/README.md`](./actions/README.md)。
- **道具动画（ITEM animations）**：每个 ITEM 自带 8 帧完整像素描述，叠加在 base 上循环播放。**本文件只描述这一类**。

---

## 1. ITEM 分组（按原型 archetype）

24 个 ITEM 分到 7 个原型。每个原型共享一套"8 帧叙事" / 物理规则，单个 item 只差 `anchor / flow / params` 这些局部参数。

| 原型 | 物理/视觉特征 | ITEM IDs (name) |
|---|---|---|
| **smoke**（烟雾飘散） | 半透明像素沿 flow 向量脉冲行进，带 x 轴抖动 | `1` 420, `1719` cigar, `1720` cigarette, `1721` corn_cob_pipe, `1726` pipe, `1727-1730` vape_1/2/3/4 |
| **fire**（火焰跳动） | 根部稳定，tip 随机丢弃像素 + 偶尔沿轴延伸 1px | `1722` fire_breathing_blue, `1723` fire_breathing_green, `1724` fire_breathing_purple, `1725` fire_breathing_red |
| **drip**（滴落断裂） | 生成 → 拉伸 → 断裂 → 水滴下落 → 复位 | `1731` vomit_clear, `1732` vomit_rainbow, `1733` drool, `1734` drool_with_blood, `1735` drool_with_liquor |
| **spurt**（喷射脉冲） | 由 f0 全开始，衰退到几近消失，再扩回来 | `1718` blood_spurt |
| **inflate**（膨胀-爆破） | 由 f0 大泡开始，破裂 → 碎片 → 新泡生长 → 回到大泡 | `1744` bubble_gum_large, `1745` bubble_gum_small |
| **bob**（微浮） | 整体 ±1px 正弦上下/左右漂移；不改变形状 | `1743` bee_sting, `1749` sleep_bubble |
| **wag**（往返伸缩） | 沿固定轴 1-2px 伸出/收回循环 | `1750` tongue_out |

> 每个 ITEM 必须声明 `anchor`（发射/锚点坐标）+ `flow/axis`（动画主方向向量）。其余参数按原型默认。

---

## 2. 输出契约

### 2.1 帧结构

```
frames: 8（f0 … f7），循环：f7 之后接 f0 必须连续。
f0   = ITEM 当前静态像素（即 trait.json 里 layerPixels 渲染的结果）
f1-7 = 按 archetype 物理规则生成的全新像素
每一帧都是独立的完整 24×24 像素描述，不是对 f0 的 diff/ops。
```

### 2.2 每帧像素格式

和 `trait.json/layerPixels` 同格式，以下二者选一：

**(a) 稀疏列表**（推荐用于存档）
```jsonc
[
  { "x": 22, "y": 16, "color": "rgb(252, 228, 119)" },
  { "x": 21, "y": 15, "color": "rgba(255, 255, 255, 0.35)" },
  // 只列非透明像素
]
```

**(b) 二维数组**（推荐用于直接渲染）
```jsonc
[
  [ "rgba(0, 0, 0, 0)", ..., "rgb(...)" ],   // 24 行
  ...
]
// 透明像素写 "rgba(0, 0, 0, 0)" 或 -1
```

### 2.3 alpha 约定

- 输入（`trait.json`）可以有 semi-transparent（`rgba(r,g,b,0.35)` 这种半透明烟雾）。
- 输出每一帧**像素级别的 alpha 只能是 0 或 255**（1-bit 可见性）。半透明源像素在某一帧要么完全出现要么完全不出现——由 archetype 的物理规则决定。
- 这意味着最终渲染时不用 dithering、不用 per-pixel alpha blend；合成到 base 上就是"over"。

### 2.4 循环连续性

f7 之后接 f0 时，视觉上不应有跳帧。具体约束按 archetype 不同：
- **smoke / fire**：周期性，cycle 长度应整除 8（比如 cycle=8 或 cycle=4）。
- **drip / inflate / spurt**：叙事性，f7 的末态 = 紧邻 f0 的前一帧状态。

---

## 3. 原型物理规则

每个 archetype 给定 item 的静态像素（`trait.json` 的 `layerPixels`）→ 输出 8 帧。

### smoke — 沿 flow 向量的行进波

```
body   = α=255 像素（如烟卷本体、烟斗）
fluid  = α<255 像素（烟雾）
排序  : fluid 按 proj = (y-ay)·flowY + (x-ax)·flowX 升序（近源 → 远端）
每一帧 f:
  for i, pixel in enumerate(sorted_fluid):
    phase = (f + i) mod (lifetime + spawnEvery)
    phase < lifetime   → 显示（可选 x 轴 ±1 wobble）
    phase ≥ lifetime   → 隐藏
  body 全部显示
```

参数：`spawnEvery ∈ {2,3}`, `lifetime ∈ {5..7}`, `wobble ∈ {0,1}`。

### fire — 根部稳定、尖端跳动

```
proj     = 像素沿 axis 的投影；dist = proj / maxProj ∈ [0,1]
每一帧 f:
  dist < 0.4              → 必显
  0.4 ≤ dist < 0.7        → 15% 概率丢弃（mid flicker）
  dist ≥ 0.7              → 45% 概率丢弃；5% 概率沿 axis 延伸 1px（tongue）
```

随机用 `hash(x, y, f)`，不用 Math.random（保证帧确定性 / 可复现）。

### drip — 8 帧叙事

f0 = item 原形。以下是剩余 7 帧（形状由 item.pixels 的顶端 3 像素作为"源"，其余按剧本动态生成）：

```
f0  静态原形
f1  tip 下伸 1px，顶端高光点亮
f2  再下伸 1px，尾部出现膨出
f3  中段缩颈
f4  断裂：上半回缩至源，下半脱离并下落 1px
f5  脱离部分飞出屏外，仅剩源
f6  源下方重新鼓出 1px 小珠
f7  小珠扩成 2 像素小团（= 将接回 f0 的形状）
```

### spurt — 非周期脉冲

f0 = item 原形（峰值展开）。envelope（intensity 每帧系数）：

```
f   0    1    2    3    4    5    6    7
i   1.0  0.75 0.50 0.25 0.10 0.35 0.65 0.90
```

```
每一帧 f:
  maxReveal = envelope[f] · maxDist · 1.1
  只渲染 d(pixel, anchor) ≤ maxReveal 的像素
  |d − maxReveal| < 1.2 的边缘像素 35% 概率丢弃（破碎边）
```

### inflate — 8 帧膨胀-破-再生

f0 = item 原形（最大泡）。

```
f0  最大泡（item 原样）
f1  最大泡 + 外缘 1px 出现裂纹（丢弃 40% 边缘像素）
f2  碎片：仅保留 30% 随机像素，各偏移 (±1,±1)
f3  碎片继续扩散 + 变稀疏（10%）
f4  全空
f5  源重新出现（以 anchor 为中心 25% 大小）
f6  50% 大小
f7  75% 大小（= 将接回 f0 的最大形状）
```

放大 / 缩小用最近邻在 anchor 中心按比例缩放。

### bob — 整体微浮

```
offset_y(f) = round(sin(2π · f/8) · amplitude)      // amplitude=1
offset_x(f) = 可选，round(cos(2π · f/8) · amplitude)
每一帧：item 全部 body + fluid 像素整体平移 (offset_x, offset_y)，出界裁掉。
```

### wag — 往返伸缩

```
t = |f − 4| / 4                // 0 → 1 → 0 三角波，8 帧周期
每一帧：从 anchor 起沿 flow 方向按 t 比例渲染像素（0 = 全缩回，1 = 完全伸出）
```

---

## 4. 不变式（所有 archetype 必须满足）

- f0 的输出必须像素级等于 item.layerPixels 渲染结果（用户可依赖这一点把 trait.json 的 preview.png 当 f0 用）
- 每帧输出所有像素 alpha ∈ {0, 255}
- 所有随机决策用确定性 `hash(x, y, f + seed)`，不用 Math.random
- f7 → f0 之间过渡视觉平滑（无跳帧）
- body 像素在 static 变换（如 bob 整体平移）之外不应消失

---

## 5. 建议的存储布局

```
traits/ITEM/<id>-<name>/
  trait.json          # 原始，包含 palette + layerPixels（= f0 的源）
  preview.png         # 24×24 的 f0 渲染
  anim.json           # 存 8 帧（推荐稀疏列表格式）+ archetype/anchor/params 元信息
  preview.gif         # 可选：8 帧循环的可视化
```

`anim.json` 示例：
```jsonc
{
  "archetype": "smoke",
  "anchor":    [22, 16],
  "flow":      [1, -1],
  "params":    { "spawnEvery": 2, "lifetime": 6, "wobble": 1 },
  "frames": [
    [ { "x":..., "y":..., "color": "..." }, ... ],   // f0 = item 原像素
    [ ... ],                                          // f1
    ...
    [ ... ]                                           // f7
  ]
}
```
