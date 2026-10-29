# Renoise Motion Skills

把 [Renoise Motion Studio](https://renoise.ai/motion-studio?utm_source=renoise-motion-skills-tomato-202610&utm_medium=github&utm_content=readme) 里的动效风格，一个一个拆成能直接交给 Claude Code / Codex 的 Skill。每个 Skill 都是"用代码一帧帧画动效"，不靠 AI 生视频：画面逐帧可复现，字一个像素都不会错，改一个参数重新渲染就行。

*Motion styles from Renoise Motion Studio, one coding-agent skill each. Every frame is drawn by code.*

| # | Skill | 风格 | 依赖 | Showcase |
|---|---|---|---|---|
| 01 | [`pixel-blocks`](pixel-blocks/SKILL.md) | 像素方块：深蓝像素网格、四色街机配色、方块一块块搭出来（中文也行）、12fps 步进动作、芯片音效 | Node 18+、ffmpeg | [发布开场](pixel-blocks/showcases/01-launch-intro.mp4) · [数据播报](pixel-blocks/showcases/02-data-story.mp4) · [竖版解锁](pixel-blocks/showcases/03-level-up.mp4) |

![Pixel Blocks · 发布开场](pixel-blocks/showcases/gif/01-launch-intro.gif)

## 安装

```bash
git clone https://github.com/chessunyan/renoise-motion-skills.git
cp -r renoise-motion-skills/pixel-blocks ~/.claude/skills/        # Claude Code
# Codex：cp -r renoise-motion-skills/pixel-blocks ~/.codex/skills/
```

然后直接跟 Agent 说，比如：

> 用像素方块风格，给我的 App 做一支 9:16、8 秒的上线倒计时，最后停在「正式上线」。

Agent 会先给你按拍子排好的分镜表，确认后写场景代码、抽帧检查、渲染出片。

## 自己跑一遍 showcase

```bash
cd pixel-blocks
node scripts/render.mjs examples/launch-intro.mjs --stills 0.6,1.9,2.9,4.6,6.05,7.6 --out qa/launch-intro   # 接触表
node scripts/render.mjs examples/launch-intro.mjs --out showcases/01-launch-intro.mp4 --watermark ../brand/watermark-tomato.png   # 约 1 秒
```

## 目录

```
pixel-blocks/
├── SKILL.md              # 风格契约 + 五步工作流 + 引擎速查 + 踩坑记录
├── scripts/
│   ├── pixel.mjs         # 引擎：帧缓冲、5×7 点阵字、精灵、步进时间工具
│   ├── render.mjs        # 场景 → 接触表 / MP4 / GIF（只需 ffmpeg）
│   ├── chip.mjs          # 芯片音效合成（方波 / 三角波 / 噪声）
│   └── bake-glyphs.py    # 中日韩文字烘焙成 1-bit 点阵
├── examples/             # 三个 showcase 的场景源码 + 合集
├── assets/               # 配乐：120 BPM chiptune（Renoise 上用 Lyria 3 Pro 生成）
└── showcases/            # 渲染好的 MP4 和 GIF（带 @一颗西红柿番茄 水印）
brand/
├── watermark-tomato.png  # 水印：番茄 + @一颗西红柿番茄
└── apply-watermark.py    # 给静态图打同样位置、同样大小的水印
```

showcase 的主角是「一颗西红柿番茄」的像素番茄；想换成自己的角色，改 `pixel.mjs` 里的 `SPRITES.tomato`、`TOMATO_INKS` 和 `HERO`。渲染时加 `--watermark 你的logo.png` 就能打自己的水印。

## License

代码 MIT。`assets/` 里的配乐和 `showcases/` 里的成片仅供演示。
