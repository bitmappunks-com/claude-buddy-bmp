# Actions

每个 action 是一个独立目录，包含一个 `action.json`。描述一段可以叠加在任意 BASE 上的动画。

## JSON Schema

```jsonc
{
  "name": "...",               // action 唯一名（= 目录名）
  "description": "...",        // 人话描述

  "anchors": {
    // 解析状态 ops 里表达式的具名常量
    // 数值 → 直接取用
    // 对象 → 按 base 性别选 ("female" / "male")
    "eye_y":   { "female": 13, "male": 12 },
    "eye_l_x": 9,
    "eye_r_x": 14
  },

  "frames": [0, 1, 0],         // 要播放的 state 索引序列

  "states": {
    "0": { "name": "...", "description": "...", "ops": [ ... ] },
    "1": { "name": "...", "description": "...", "ops": [ ... ] }
  }
}
```

## ops 支持的操作类型

### `set` — 覆盖单个像素

```jsonc
{
  "op": "set",
  "x": "<expr>",              // 例：9, "eye_l_x", "eye_l_x + 1"
  "y": "<expr>",
  "color": "rgb(0, 0, 0)"     // 或 "rgba(...)"
}
```

### `swap` — 交换两个像素的颜色

```jsonc
{
  "op": "swap",
  "a": { "x": "<expr>", "y": "<expr>" },
  "b": { "x": "<expr>", "y": "<expr>" }
}
```

## 应用器约定

读 action.json，再给它：
1. base 的 24×24 像素 canvas
2. base 的性别（决定 anchors 中带 `female/male` 分支的值）

应用器对 `frames` 里每个状态索引，克隆一份 base canvas 并顺序执行对应 state 的 ops，输出一帧。`[0,1,0]` 就输出 3 帧。

### `ops` 为空数组 = identity

state 0 在两个 action 里都是空 ops —— 即"保留 base 原像素"。

## 约定：状态命名

- **state 0**：默认 / 基准 / 未修改（和 base 一致）
- **state 1+**：每一个独立的变化状态

`frames` 数组就用这些索引组合，想要多长就多长（不一定对称/循环）。

## 现有 actions

| 名称 | frames | 说明 |
|---|---|---|
| [blink](./blink/) | `[0, 1, 0]` | 睁 → 闭 → 睁，眼珠位置变 2px 黑条 |
| [move](./move/)   | `[0, 1, 0]` | 看左 → 看右 → 看左，眼珠与右邻像素对调 |
