<div align="center">

# Renoise Motion Skills · 像素方块 Pixel Blocks

**一句话 → 一支卡在拍子上的 8-bit 动效，代码一帧一帧画出来。**
不开 AE，不用 AI 生视频，连浏览器都不开：一块 320×180 的帧缓冲、一个每秒 12 个姿势的时钟、一个 ffmpeg。8 秒 1080p，渲染一次大约 1 秒。

**简体中文** · [English](README.en.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
![Agent Skill](https://img.shields.io/badge/Agent%20Skill-SKILL.md-orange)
[![Renoise Motion Studio](https://img.shields.io/badge/style-Renoise%20Motion%20Studio-ff7a1a)](https://renoise.ai/motion-studio?utm_source=renoise-motion-skills-tomato-202610&utm_medium=github&utm_content=readme-zh)
![Node 18+](https://img.shields.io/badge/runtime-Node%2018%2B-339933)
![ffmpeg](https://img.shields.io/badge/render-ffmpeg-007808)
![npm dependencies: 0](https://img.shields.io/badge/npm%20deps-0-brightgreen)

<img src="docs/images/cover.jpg" width="820" alt="像素方块：标题 PIXEL BLOCKS 下面是像素番茄、金币和进度条">

</div>

> 这几条动画里，没有一帧是 AI 视频模型生成的。每一个方块、每一个字、每一枚金币都是代码算出来的：标题一拍落一个字，吃一枚金币进度条涨一格，连金币「叮」的一声都是代码合成的方波。
>
> 唯一的输入是一句话：*「给我的独立游戏《方块大作战》做一支 16:9、8 秒的发布开场：标题用方块一块块落下拼出来，番茄一蹦一蹦地过来吃金币填满进度条，重拍上闪一下，最后停在「开始游戏」。」*
>
> Apple M4 上渲染 8 秒 1080p 用时 **1.17 秒**。视频本身花费的积分：**0**。

---

## 效果演示

点 GIF（或「观看」）播放带声音的完整视频。下面每一条都是用这个仓库做出来的。

| | | |
|:---:|:---:|:---:|
| <a href="https://github.com/chessunyan/renoise-motion-skills/releases/download/v1.0.0/01-launch-intro.mp4"><img src="docs/gifs/01-launch-intro.gif" width="300"></a> | <a href="https://github.com/chessunyan/renoise-motion-skills/releases/download/v1.0.0/02-data-story.mp4"><img src="docs/gifs/02-data-story.gif" width="300"></a> | <a href="https://github.com/chessunyan/renoise-motion-skills/releases/download/v1.0.0/03-level-up.mp4"><img src="docs/gifs/03-level-up.gif" width="152"></a> |
| **游戏发布开场** · 16:9 · 8 秒<br>中文标题由落下的方块拼成，金币按八分音符填满进度条，重拍上闪白<br>[▶ 观看](https://github.com/chessunyan/renoise-motion-skills/releases/download/v1.0.0/01-launch-intro.mp4) | **年度数据播报** · 16:9 · 8 秒<br>柱子按十六分音符叠高、每块升一个半音，奖杯、+300% 标注、彩纸<br>[▶ 观看](https://github.com/chessunyan/renoise-motion-skills/releases/download/v1.0.0/02-data-story.mp4) | **竖版解锁新技能** · 9:16 · 8 秒<br>任务卡、经验条、方块砸出「升级！」、技能卡、金币飞进计数器<br>[▶ 观看](https://github.com/chessunyan/renoise-motion-skills/releases/download/v1.0.0/03-level-up.mp4) |

<div align="center">
<b>16 秒合集</b> · 两条横版首尾相接，配乐连续 · <a href="https://github.com/chessunyan/renoise-motion-skills/releases/download/v1.0.0/00-reel.mp4">▶ 观看</a>
</div>

> 主角是作者「一颗西红柿番茄」的像素番茄形象，每条视频都带它的水印。自己发布之前，请换成你自己的角色和 logo，见[自定义](#自定义)。

---

## 能做什么

- **像素画全靠代码，不靠生成。** 场景只在 320×180（或 180×320）的帧缓冲上画整数坐标的矩形，ffmpeg 用最近邻放大 6 倍到 1080p。永远没有抗锯齿，每个方块都在网格上，任何一帧单独重渲都一模一样。
- **卡在拍子上。** 分镜按拍子写。动作跑在每秒 12 个姿势的时钟上（120 BPM 下一拍正好 6 个姿势），24fps 输出时每个姿势停 2 帧。事件时间和音效时间表从同一组函数算出来，声音不可能和画面对不上。
- **方块拼字，中文也行。** 英文标题用内置的 5×7 点阵字；中文从系统字体关掉抗锯齿烘焙成点阵，分三档：12px 写 HUD 小字，16px 写标题行和卡片，粗体 16px 再把每个像素放大成 3×3 的方块拼大标题。数字自动回退到 5×7 字体，`第 1-1 关`、`0.9万` 都是一次调用。
- **芯片音效，不用素材。** 方波、三角波、噪声加硬包络：`tick` `land` `coin` `blip` `type` `jump` `powerup` `flash` `select` `whoosh` `clear`。叠方块时让音高一块块往上升，搭建过程就成了一段琶音。音效压在音乐下面，整体响度归一到约 −14 LUFS。
- **先抽帧，再出片。** 每拍抽一帧拼成带时间标签的接触表，再对着清单查：没有东西出画、没有遮挡、事件都在拍上、第一帧不空、最后一帧没停在闪灭上。
- **快，零 npm 依赖。** 只要 Node 18+ 和 ffmpeg。8 秒的片子大约 1 秒渲完，出 MP4 或 GIF；水印在放大之后才叠，logo 清晰。
- **任何 Agent 都能用。** 标准的 `SKILL.md`：风格契约、五步工作流、引擎速查，以及做这几条演示时踩过的坑。
- **可选：用 Renoise 生成配乐。** 通过 [Renoise MCP](https://renoise.ai/mcp?utm_source=renoise-motion-skills-tomato-202610&utm_medium=github&utm_content=readme-zh) 用 Lyria 3 Pro 生成原创 chiptune（我们这次花了 4 积分）。Agent 会先报价，等你点头才生成。

## 工作原理

```
你的需求 ──► 1. 写需求：做什么 · 核心信息 · 结尾停在哪 · 画幅时长（缺什么一次只问一个）
             2. 按拍子出分镜：先定速度，大事件放重拍                 → 你确认
             3. 搭场景：复制最接近的示例；draw(frame, t) 是时间的纯函数
             4. 抽帧：每拍一帧 → 接触表 → 修 → 再看
             5. 最近邻放大 6 倍 + 芯片音效 + 配乐 → MP4 / GIF          （8 秒约 1 秒）
```

<p align="center"><img src="docs/images/workflow.png" width="820" alt="五步工作流，用这个引擎自己画的"></p>

---

## 支持哪些 Agent

这个 skill 是一个带 `SKILL.md`（开放的 Agent Skills 格式）和 Node 脚本的文件夹。Agent 需要能：

1. **加载 Agent Skills**（skills 文件夹或上传 skill），
2. **在你的电脑上跑命令**（`node` 和 `ffmpeg`，用来渲染）。

Renoise MCP 是可选的，只用来生成配乐。

| Agent | Skills 放哪 | 本地命令 | 状态 |
|---|---|---|---|
| **Claude Code** | `~/.claude/skills/` | ✅ | ✅ 已测试：演示视频就是用它做的 |
| **Codex**（CLI / 桌面版） | `~/.codex/skills/` | ✅ | ✅ 应该可用（同一套脚本） |
| **OpenClaw** · **WorkBuddy** · 其他支持 Agent Skills 的产品 | 导入文件夹或 zip | ✅ | ⚙️ 应该可用，以产品文档为准 |
| **Claude 桌面版 / claude.ai** | 在设置里上传 skill zip | ⚠️ 沙箱 | 分镜和场景代码没问题；渲染需要沙箱里有 `node` 和 `ffmpeg`，没有就拿到本地渲染 |

---

## 安装

### 1 · 拿到代码

```bash
git clone https://github.com/chessunyan/renoise-motion-skills.git
cd renoise-motion-skills
```

### 2 · 把 skill 装进你的 Agent

**Claude Code**
```bash
mkdir -p ~/.claude/skills && cp -R skills/pixel-blocks ~/.claude/skills/
```
**Codex**
```bash
mkdir -p ~/.codex/skills && cp -R skills/pixel-blocks ~/.codex/skills/
```
**WorkBuddy / OpenClaw / 其他 Agent**：把文件夹打成 zip，在产品的 *Skills* 页面导入，或者直接拷进它的 skills 目录：
```bash
cd skills && zip -r ../pixel-blocks-skill.zip pixel-blocks && cd ..
```

### 3 · 本地工具

| 工具 | macOS | Windows | Linux |
|---|---|---|---|
| Node.js 18+ | `brew install node` | `winget install OpenJS.NodeJS.LTS` | `nvm install --lts` |
| ffmpeg | `brew install ffmpeg` | `winget install Gyan.FFmpeg` | `sudo apt install ffmpeg` |
| Python 3 + Pillow（只在烘焙新的中文字时需要） | `python3 -m pip install pillow` | `winget install Python.Python.3.12`，再 `pip install pillow` | `sudo apt install python3-pip`，再 `pip install pillow` |

在 macOS（Apple M4）上测试过。脚本没用任何平台相关的东西，Linux 和 Windows 应该都能跑。渲染一条演示，确认环境没问题：

```bash
cd ~/.claude/skills/pixel-blocks
node scripts/render.mjs examples/launch-intro.mjs --stills 1.6,7.9 --out /tmp/pixel-check    # 接触表
node scripts/render.mjs examples/launch-intro.mjs --out /tmp/pixel-check/launch-intro.mp4     # 约 1 秒
```

`bake-glyphs.py` 在 macOS 上默认用冬青黑体（Hiragino Sans GB），Linux 上用 Noto Sans CJK；Windows 请自己指定字体：`--font C:\Windows\Fonts\msyh.ttc`。

### 4 ·（可选）Renoise MCP，用来生成配乐

只有想让 Agent 帮你作一段 chiptune 时才需要。先在 **[renoise.ai](https://renoise.ai/mcp?utm_source=renoise-motion-skills-tomato-202610&utm_medium=github&utm_content=readme-zh)** 注册；登录在浏览器里完成，不用粘贴任何 API Key。

| Agent | 怎么接 |
|---|---|
| Claude Code | `/plugin marketplace add renoise-ai/renoise-plugins-official`，再 `/plugin install renoise@renoise-plugins-official` |
| Codex | `codex mcp add renoise --url https://renoise.ai/api/public/mcp`，再 `codex mcp login renoise` |
| Claude 桌面版 / claude.ai | 设置 → 连接器 → **添加自定义连接器** → 名称 `Renoise`，URL `https://renoise.ai/api/public/mcp` |
| 其他 Agent | 添加远程 MCP 服务器，URL `https://renoise.ai/api/public/mcp` |

不接也行：用你自己的音乐（场景里写 `music: { file, from }`），或者不配乐直接渲染。

---

## 快速开始

直接用大白话跟 Agent 说：

```text
用像素方块风格，给我的 App 做一支 9:16、8 秒的上线倒计时，最后停在「正式上线」。
给我的独立游戏做一支 16:9、8 秒的像素方块开场：标题用方块一块块落下拼出来，最后停在「开始游戏」。
做一支 8 秒的年度数据动画：月活按季度从 0.9 万涨到 3.6 万，柱子用方块一块块叠上去，最后撒彩纸。
用我附上的这首音乐，每一块方块都落在拍子上。
给成片右下角加上我的 logo 水印。
```

接下来会发生：
1. Agent 先核对需求：做什么、核心信息、结尾停在哪、画幅时长。缺什么就问一个短问题，并给出建议值。
2. 给你一张按拍子写的分镜表，带时间点和输出设置。你确认。
3. 写场景代码，出接触表。不在拍上、有遮挡、出画的地方先修掉。
4. 渲染：MP4（需要的话再出 GIF），带芯片音效和配乐。

---

## 风格拆解：6 条规则

<p align="center"><img src="docs/images/anatomy.png" width="820" alt="调色板、步进动作、网格、方块斜面、5×7 点阵字，以及这个风格绝不做的事"></p>

| 规则 | 值 |
|---|---|
| 底色 | 深海军蓝 `#0B1030`，每 10px 一条 `#151D4F` 网格线 |
| 墨水 | 粉 `#FF3E9A` · 青 `#33E1FF` · 柠檬黄 `#FFE14D` · 青柠绿 `#8CFF5A` · 白 `#F4F6FF`，不加第五种 |
| 方块 | 带 1px 硬斜面的方块：左上亮、右下暗 |
| 动作 | 每秒 12 个姿势，24fps 下每个停 2 帧；进度条一次满一整格 |
| 字 | 英文和数字用 5×7 点阵；中文用烘焙出的点阵 |
| 禁止 | 抗锯齿、渐变、柔和阴影、发光、写实光 |

Agent 遵守的风格契约，来自 Renoise Motion Studio：

> Deep navy ground under a coarse pixel grid. Everything is built from square blocks in an arcade palette of hot pink, cyan, lemon and lime, with chunky pixel type. Shapes and words build up block by block, sprites walk in stepped frames, progress bars fill whole cells at a time and coins blink. Motion is stepped and never smooth, at a low frame rate. Avoid anti-aliased curves, gradients, soft shadows and realistic light.

<p align="center"><img src="docs/images/style-board.jpg" width="720" alt="用 GPT Image 2.5 生成的风格参考图"></p>

这张风格参考图是用 GPT Image 2.5 生成的，适合拿去跟团队对齐审美。静帧交给生图，动起来交给代码。

## 中文点阵字，方块拼出来

<p align="center"><img src="docs/images/cjk-blocks.png" width="820" alt="标题「方块大作战」正在落块和拼完的样子"></p>

先把场景要用的字烘焙出来，然后像普通文字一样画：

```bash
python3 scripts/bake-glyphs.py "方块大作战" --size 16 --index 2 --out examples/cjk-title.json   # 粗体，拼方块大标题用
python3 scripts/bake-glyphs.py "得分第关加载中" --size 12 --out examples/cjk-12.json           # HUD 小字
```

```js
const { cells } = glyphCells('方块大作战', TITLE_FONT, 3);            // 每个像素变成一块 3×3 方块
frame.glyphText('第 1-1 关', W - 8, 4, SMALL, { align: 'right' });   // 数字自动回退到 5×7 点阵字
```

## 一个场景，就是一个时间的函数

```js
import { C, beats, drawHero, fall, step } from '../scripts/pixel.mjs';

const b = beats(120);                          // b(k) = 第 k 拍的时间
export default {
  width: 320, height: 180, duration: b(16),
  draw(frame, t) {                             // 帧与帧之间没有状态：任何一帧都能单独渲染
    const s = step(t);                         // 动画只认每秒 12 个姿势，不认原始时间
    const pose = Math.floor(s * 12);
    frame.grid(10, C.grid);
    for (const block of titleBlocks) {
      const h = fall(s, block.land, block.y + 12, 0.35);   // 重力下落；生成之前返回 null
      if (h !== null) frame.block(block.x, block.y - h, 3, 3, block.color);
    }
    drawHero(frame, heroX(s), 166, pose % 2 ? 3 : 0);      // 番茄没有腿，一蹦一蹦地走
  },
  cues: () => titleLands.map((t) => ({ t, sound: 'land' })),     // 和画面同一组时间
  music: { file: '../assets/chiptune-120bpm.mp3', from: 18.012 }, // 配乐里的一个重拍
};
```

## 先抽帧，再出片

<p align="center"><img src="docs/images/probe-sheet.png" width="820" alt="8 张带时间标签的抽帧接触表"></p>

下面[踩过的坑](#踩过的坑skill-里都处理了)里的每一条，都是在这样的接触表上发现的，没等到整片渲染完。

## 芯片音效

| 音效 | 声音 | 常见用法 |
|---|---|---|
| `tick` | 短方波，`pitch` 以半音计 | 方块落地；音高逐块上升，叠高就是一段琶音 |
| `land` | 噪声 + 低音方波 | 字或重方块落地 |
| `coin` | B5 → E6 | 吃到金币 |
| `blip` / `type` | 细方波 | 进度条加一格 / 打一个字 |
| `jump` · `powerup` · `flash` | 滑音 · 琶音 · 噪声 + 三角波 | 跳跃、升级、重拍闪白 |
| `select` · `whoosh` · `clear` | 两个音 · 噪声扫频 · 过关小旋律 | 菜单、滑入、结尾 |

## 在 Renoise Motion Studio 里直接用（什么都不用装）

<p align="center"><img src="docs/images/motion-studio.jpg" width="720" alt="Motion Studio 输入框，已选像素方块风格"></p>

打开 **[renoise.ai/motion-studio](https://renoise.ai/motion-studio?utm_source=renoise-motion-skills-tomato-202610&utm_medium=github&utm_content=readme-zh)**，点输入框上的「风格」，选「像素方块」，写一句需求发送。Renoise Agent 会先给你分镜和时间点，你点头之后才开始做。

---

## 成本参考（真实数据）

| 内容 | 怎么做的 | 积分 |
|---|---|---|
| 3 条演示 + 合集 | 这个 skill 本地渲染 | **0** |
| 62 秒 chiptune 配乐 | Renoise 上的 Lyria 3 Pro | 4 |
| 封面和风格参考图（给文章用的，不属于 skill 流程） | GPT Image 2.5，1k | 每张 13 |

价格以写作时为准，实际以 Agent 的实时报价为准。

## 自定义

- **换主角**：替换 `scripts/pixel.mjs` 里的 `SPRITES.tomato`、`TOMATO_INKS` 和 `HERO`。我们的番茄是从 32×32 的头像逐像素采样来的；在 320 宽的画布上，主角 25px 左右最清楚。
- **换水印**：渲染时加 `--watermark 你的logo.png`；静态图用 `python3 brand/apply-watermark.py in.png out.png`。
- **换画幅**：`width` / `height` 设成 180×320 就是 9:16，180×180 就是 1:1；输出永远是 6 倍。
- **换配乐**：场景里写 `music: { file, from }`。先测好速度，把 `from` 设在一个重拍上。

## 仓库结构

```
skills/
  pixel-blocks/                 skill 本体
    SKILL.md                    风格契约 · 工作流 · 引擎速查 · 踩坑记录
    scripts/
      pixel.mjs                 引擎：帧缓冲、5×7 点阵字、精灵、step / beat / fall / hop
      render.mjs                场景 → 接触表 / MP4 / GIF（只需 ffmpeg），--watermark
      chip.mjs                  从音效时间表合成芯片音效
      bake-glyphs.py            中日韩文字 → 1-bit 点阵表
    examples/                   发布开场 · 数据播报 · 竖版升级 · 合集 · 烘焙好的点阵表
    assets/                     chiptune-120bpm.mp3
brand/                          作者的水印 + 给静态图打水印的 apply-watermark.py
docs/                           README 配图和 GIF 预览
```

## 踩过的坑（skill 里都处理了）

- 14px 的精灵放在 320 宽的画布上就看不见了：主角要 25px 左右，金币放大 2 倍。
- 柱子叠高 + 主角站上去 + 奖杯在头顶，很容易出画：先降方块高度；数值写进柱子里，垫一块纯色底板，不然斜面线会穿过字。
- 从上面滑进来的东西会压住 HUD：给 HUD 一条自己的底栏。
- 闪烁的结尾字可能刚好停在灭的那一帧：最后一拍保持常亮。
- 第一帧是空的，发到社媒就是一张黑封面：第 0 帧就要有内容。
- 12px 下笔画多的中文字会糊：12px 只用来写短标签。
- 提示词里写的 BPM 只是参考：卡点之前先实测。
- `python3 -I` 会屏蔽用户安装的 Pillow：运行 `bake-glyphs.py` 时别加 `-I`。

## 合规使用

- 番茄形象和「@一颗西红柿番茄」水印属于作者。可以用来跑示例，自己发布前请都换掉。
- 只用你有权使用的音乐、logo 和角色。
- 年度数据那条演示里的数字是编的；如果你也发类似内容，示例数据请标注出来。
- 只有在你确认报价之后才会消耗积分。

## 许可与第三方

- 代码和文档：[MIT](LICENSE) © 2026 chessunyan（一颗西红柿番茄）。
- 不在 MIT 范围内的：番茄形象和水印、演示视频、chiptune 配乐、AI 生成的图片。中文点阵表是从 macOS 系统字体栅格化来的。详见 [THIRD_PARTY.md](THIRD_PARTY.md)。
- ffmpeg 作为外部程序调用，不随仓库分发。

---

<div align="center">

由 **一颗西红柿番茄** 制作 · 风格来自 [Renoise Motion Studio](https://renoise.ai/motion-studio?utm_source=renoise-motion-skills-tomato-202610&utm_medium=github&utm_content=readme-zh) · 用 Claude Code 搭建 · 觉得有用的话，点个 ⭐ 能让更多人看到。

</div>
