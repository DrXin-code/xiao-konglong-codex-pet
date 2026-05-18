# 小恐龙 Codex Pet

这是一个 Codex 自定义宠物包：白脸小团子穿浅绿色恐龙连体衣，带黄色背刺和粗深棕线条。

## 文件

- `pet.json`: Codex 宠物清单
- `spritesheet.webp`: 8x9 宠物动画图集，尺寸 `1536x1872`
- `qa/contact-sheet.png`: 所有动画帧预览
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

- `idle`: 待机
- `running-right`: 向右移动
- `running-left`: 向左移动
- `waving`: 挥手
- `jumping`: 跳跃
- `failed`: 失败状态
- `waiting`: 等待确认
- `running`: 工作中
- `review`: 审阅中
