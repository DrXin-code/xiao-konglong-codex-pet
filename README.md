# 小恐龙 Codex Pet

这是一个 Codex 自定义宠物包：白脸小团子穿浅绿色恐龙连体衣，带黄色背刺和粗深棕线条。

## 文件

- `pet.json`: Codex 宠物清单
- `spritesheet.png`: 8x9 宠物动画图集，尺寸 `1536x1872`
- `runtime/`: 可本地运行的增强状态机，会触发核心状态和扩展状态
- `docs/state-triggers.md`: 全部状态的触发规则
- `qa/contact-sheet.png`: 所有动画帧预览
- `qa/runtime-screenshot.png`: 增强状态机页面截图
- `qa/previews/*.gif`: 各状态的动图预览
- `qa/validation.json`: 图集校验结果

## 安装

把这个仓库克隆或复制到 Codex 的宠物目录中：

```bash
mkdir -p ~/.codex/pets
git clone git@github.com:DrXin-code/xiao-konglong-codex-pet.git ~/.codex/pets/xiao-konglong
```

然后在 Codex 的宠物设置里刷新并选择“小恐龙”。

## 动画状态

Codex 当前稳定识别的是下面 9 个核心状态；它们都在主 `spritesheet.png` 中：

- `idle`: 待机
- `running-right`: 向右移动
- `running-left`: 向左移动
- `waving`: 挥手
- `jumping`: 跳跃
- `failed`: 失败状态
- `waiting`: 等待确认
- `running`: 工作中
- `review`: 审阅中

## 扩展状态

`extras/extended-states.json` 增加了一组扩展状态设计，适合以后接入自定义触发逻辑或等待 Codex 支持更多状态。当前 Codex 不会自动触发这些额外状态，但资产已经放在仓库中：

- `long-idle-sleep`: 长时间不用时休眠
- `sleepy`: 空闲一段时间后犯困
- `wake-up`: 用户重新操作时被叫醒
- `play-bounce`: 娱乐弹跳
- `dance`: 左右摇摆
- `celebrate`: 任务完成庆祝
- `bored`: 等待太久时无聊
- `curious`: 好奇观察
- `deep-focus`: 长任务专注工作
- `peek`: 探头看看

扩展状态文件：

- `extras/extended-states.json`: 状态语义、建议触发条件、核心状态 fallback
- `extras/strips/*.png`: 透明 PNG 动画条，适合后续接入
- `extras/previews/*.gif`: GitHub 预览用白底 GIF
- `extras/extended-contact-sheet.png`: 扩展状态总览

## 增强状态机

如果要让全部状态都能在本地触发，打开：

```bash
open runtime/index.html
```

增强状态机会监听悬停、点击、拖动、空闲、等待、任务运行、任务成功和任务失败等事件，并播放所有核心状态和扩展状态。详细规则见 `docs/state-triggers.md`。
