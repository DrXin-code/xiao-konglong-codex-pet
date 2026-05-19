# 小恐龙 Codex Pet

这是一个 Codex 自定义宠物包：白脸小团子穿浅绿色恐龙连体衣，带黄色背刺和粗深棕线条。

## 文件

- `pet.json`: Codex 宠物清单
- `spritesheet.webp`: Codex 实际读取的 8x9 宠物动画图集，尺寸 `1536x1872`
- `spritesheet.png`: 同内容 PNG 版，用于 QA 和预览
- `docs/state-triggers.md`: Codex 实际状态触发说明
- `qa/contact-sheet.png`: 所有动画帧预览
- `qa/codex-state-map.json`: 扩展动作折叠到 Codex 状态行的映射
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

Codex 当前稳定识别的是下面 9 个核心状态；它们都在主 `spritesheet.webp` 中：

- `idle`: 待机、犯困、趴睡
- `running-right`: 向右移动
- `running-left`: 向左移动
- `waving`: 挥手、摇摆、娱乐弹跳
- `jumping`: 跳跃、被叫醒、庆祝
- `failed`: 失败状态
- `waiting`: 等待确认、无聊等待
- `running`: 工作中、专注工作
- `review`: 审阅中、好奇观察、探头看看

## 扩展状态

`extras/extended-states.json` 保留了一组扩展状态源素材。Codex 当前不会按这些名字单独触发状态，所以主图集已经把它们折叠进最接近的 9 个 Codex 状态行：

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
- `extras/strips/*.png`: 透明 PNG 动画条，作为主图集折叠素材
- `extras/previews/*.gif`: GitHub 预览用白底 GIF
- `extras/extended-contact-sheet.png`: 扩展状态总览

## 本地安装

当前机器已安装到：

```text
~/.codex/pets/xiao-xiongdi-long/
~/.codex/avatars/xiao-xiongdi-long/
```

如果手动安装，可以复制或克隆仓库到 Codex 宠物目录，并确保 `pet.json` 指向 `spritesheet.webp`。

详细触发说明见 `docs/state-triggers.md`。
