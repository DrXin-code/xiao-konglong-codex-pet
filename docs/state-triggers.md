# 小恐龙状态触发说明

这个仓库现在包含两套东西：

- `pet.json` 和 `spritesheet.png`：给 Codex 官方宠物系统使用的兼容包。
- `runtime/`：本仓库自己的增强状态机，用来触发全部核心状态和扩展状态。

如果只在 Codex 设置里选择这个宠物，Codex 仍然只会按自己的内部逻辑播放核心状态。要让全部状态都能触发，请打开：

```text
runtime/index.html
```

## 自动触发

增强状态机会根据本地页面事件自动切换状态。

| 状态 | 触发条件 |
| --- | --- |
| `idle` | 没有任务、没有等待、没有悬停、没有拖动时 |
| `sleepy` | 空闲超过 3 分钟；演示计时下为 8 秒 |
| `long-idle-sleep` | 空闲超过 10 分钟；演示计时下为 18 秒 |
| `wake-up` | `sleepy` 或 `long-idle-sleep` 时发生键盘、鼠标、点击等用户操作 |
| `curious` | 鼠标悬停在小恐龙身上 |
| `running-right` | 按住小恐龙向右拖动 |
| `running-left` | 按住小恐龙向左拖动 |
| `play-bounce` | 单击小恐龙，娱乐状态会在 `play-bounce`、`dance`、`peek` 之间轮换 |
| `dance` | 单击小恐龙轮换到该娱乐状态 |
| `peek` | 单击小恐龙轮换到该娱乐状态 |
| `celebrate` | 双击小恐龙，或点击“任务成功” |
| `running` | 点击“开始任务”后的初始工作状态 |
| `deep-focus` | 任务运行超过 90 秒；演示计时下为 12 秒 |
| `waiting` | 点击“等待用户”后的初始等待状态 |
| `bored` | 等待用户超过 2 分钟；演示计时下为 10 秒 |
| `failed` | 点击“任务失败” |
| `waving` | 点击手动状态按钮 |
| `jumping` | 点击手动状态按钮 |
| `review` | 点击手动状态按钮 |

## 手动触发

页面右侧有两组按钮：

- 核心状态：逐个播放 `idle`、`running-right`、`running-left`、`waving`、`jumping`、`failed`、`waiting`、`running`、`review`。
- 扩展状态：逐个播放 `sleepy`、`long-idle-sleep`、`wake-up`、`play-bounce`、`dance`、`celebrate`、`bored`、`curious`、`deep-focus`、`peek`。

手动按钮会锁定当前动画几秒，方便确认资源是否能正常播放。

## 场景按钮

| 按钮 | 作用 |
| --- | --- |
| 开始任务 | 进入 `running`，持续一段时间后自动进入 `deep-focus` |
| 任务成功 | 进入 `celebrate` |
| 任务失败 | 进入 `failed` |
| 等待用户 | 进入 `waiting`，持续一段时间后自动进入 `bored` |
| 结束等待 | 清除等待上下文并回到 `idle` |
| 模拟犯困 | 直接把空闲时间推进到 `sleepy` 阈值 |
| 模拟休眠 | 直接把空闲时间推进到 `long-idle-sleep` 阈值 |
| 回到待机 | 清除任务和等待上下文并回到 `idle` |

## 计时模式

默认开启“演示计时”，方便快速看到状态切换：

- 犯困：8 秒
- 休眠：18 秒
- 无聊等待：10 秒
- 专注工作：12 秒

关闭“演示计时”后使用更接近真实场景的时间：

- 犯困：3 分钟
- 休眠：10 分钟
- 无聊等待：2 分钟
- 专注工作：90 秒
