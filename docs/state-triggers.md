# 小恐龙 Codex 状态触发说明

小恐龙现在按 hatch-pet / Codex 宠物包方式运行，不再依赖单独网页。

Codex 实际读取的是：

```text
~/.codex/pets/xiao-xiongdi-long/pet.json
~/.codex/pets/xiao-xiongdi-long/spritesheet.webp
```

## 真实触发范围

hatch-pet 生成的是 Codex 兼容宠物图集。Codex 当前只会调度固定 9 个状态行：

| Codex 状态 | Codex 触发含义 | 小恐龙当前视觉内容 |
| --- | --- | --- |
| `idle` | 待机、没有任务时 | 待机、犯困、趴睡 |
| `running-right` | 宠物向右移动 | 向右移动 |
| `running-left` | 宠物向左移动 | 向左移动 |
| `waving` | 打招呼或注意力动作 | 挥手、摇摆、娱乐弹跳 |
| `jumping` | 跳跃或强调动作 | 跳跃、被叫醒、庆祝 |
| `failed` | 失败、错误、任务未完成 | 失败、委屈、趴下 |
| `waiting` | 等用户输入、确认或继续 | 等待、无聊等待 |
| `running` | Codex 正在执行任务 | 工作中、专注工作 |
| `review` | Codex 正在审阅、分析、检查 | 审阅、好奇观察、探头看看 |

## 重要限制

`sleepy`、`long-idle-sleep`、`wake-up`、`play-bounce`、`dance`、`celebrate`、`bored`、`curious`、`deep-focus`、`peek` 这些不是 Codex 当前会单独调度的状态名。

为了让它们作为 Codex 宠物的一部分在本地出现，主 `spritesheet.webp` 已经把这些动作折叠进最接近的 9 个 Codex 状态行。这样 Codex 正常触发 `idle`、`waiting`、`running`、`review` 等状态时，会播放包含扩展动作的版本。

## 已安装位置

本地已安装到：

```text
~/.codex/pets/xiao-xiongdi-long/
~/.codex/avatars/xiao-xiongdi-long/
```

如果 Codex 当前窗口没有立刻刷新，请在宠物设置里重新选择“小恐龙”，或者正常退出并重新打开 Codex。
