# 🌍 全球名胜图鉴

> 本项目由作者和 [CodeBuddy](https://www.codebuddy.ai) 共同完成。

一个交互式的全球名胜可视化项目，收录了 **120 处世界名胜**（60 自然景观 + 60 人文景观），覆盖 **5 大洲、56 个国家/地区**。支持 3D 地球仪和平面地图两种浏览方式，点击标记即可查看景点详情。

## 预览

直接在浏览器中打开 `landscape_global_show.html` 即可使用。

<img width="1722" height="1074" alt="image" src="https://github.com/user-attachments/assets/d28c4673-5099-4633-bc50-4fc2dbb3ecf3" />
<img width="1727" height="1078" alt="image" src="https://github.com/user-attachments/assets/50b5f702-4194-4516-9bea-694afcfb7554" />

## 功能特色

- **3D 地球仪视图**：基于 Three.js 的可交互地球仪，景点标记分布在对应的地理位置上，支持拖拽旋转、缩放和自动旋转
- **平面地图视图**：Canvas 绘制的等距圆柱投影世界地图，支持缩放和拖拽平移
- **多维筛选**：按大洲、推荐游览时间、景点类型（自然/人文）和国家搜索筛选
- **景点详情卡片**：展示景点介绍、最佳旅行时间、游览指南，附带代表性图片和维基百科链接
- **打卡功能**：每个景点可打卡，已打卡国家在平面地图上高亮显示，左下角实时显示打卡进度
- **本地图片支持**：自动加载 `landscapes/` 目录下以景点名命名的图片，也可手动上传照片
- **背景音乐**：左上角音乐按钮，默认加载本地 `music.mp3`，也可上传自定义音频

## 项目结构

```
landscape_global_show/
├── landscape_global_show.html   # 主页面入口
├── style.css                    # 样式文件（天蓝色主题）
├── landscapes-data.js           # 120处名胜数据
├── globe.js                     # 3D地球仪渲染模块
├── ui.js                        # UI交互模块（筛选、详情卡、地图视图、打卡等）
├── landscapes/                  # 本地景点图片（可选）
│   └── ...                      # 以景点名命名，支持 jpg/webp/png
├── music.mp3                    # 背景音乐（可选）
├── LICENSE                      # 许可证
└── README.md                    # 本文件
```

## 使用方法

### 基本浏览

1. 用浏览器打开 `landscape_global_show.html`
2. 等待加载完成后，3D 地球仪会自动旋转展示全球名胜分布
3. **点击地球上的景点图标** 查看详细信息
4. 使用右侧面板的搜索框和筛选条件缩小范围
5. 点击左上角 **🌍 地球仪 / 🗺 平面地图** 切换视图

### 景点图片

- 详情卡片中会自动加载来自 Wikimedia Commons 的代表性图片
- 若自动加载失败，会通过 Wikipedia API 动态获取备用图片
- 在 `landscapes/` 目录下放置以景点名命名的图片可覆盖在线图片
- 也可以在详情卡片中点击 **📷 上传图片** 手动上传

### 打卡功能

- 在景点详情卡底部点击 **📌 打卡** 按钮标记已访问的景点
- 已打卡景点所在国家会在平面地图上以浅金色高亮
- 左下角实时显示打卡进度（xx/120）
- 打卡数据保存在浏览器本地存储中，刷新页面不会丢失

## 技术栈

- **Three.js**：3D 地球仪渲染
- **Canvas 2D**：平面地图绘制
- **TopoJSON**：世界地图边界数据
- **Wikipedia API**：景点图片动态获取
- **原生 HTML/CSS/JS**：无需构建工具，开箱即用

## 景点数据

收录 120 处世界名胜，每处包含：

| 字段 | 说明 |
|------|------|
| 名称（中/英文） | 景点的中英文名称 |
| 所属国家/地区 | 景点所在国家 |
| 地理坐标 | 用于在地球仪上定位 |
| 推荐游览时间 | 最佳旅行月份 |
| 景点类型 | 自然景观 / 人文景观 |
| 景点介绍 | 简要描述 |
| 最佳旅行时间 | 详细的时间建议 |
| 游览指南 | 交通、行程等实用信息 |

## 图片版权声明

本项目中的景点图片来自以下来源，**项目本身不包含任何图片文件**，仅通过 URL 链接引用：

- **Wikimedia Commons**：图片采用 CC BY-SA、CC BY 或公有领域等开放许可证，版权归原作者所有。根据 Wikimedia 的使用政策，通过 URL 链接引用（热链接）是被允许的。
- **Wikipedia API**：当预设链接失效时，通过 Wikipedia 公开 API 动态获取缩略图，这是 API 的正常使用方式。

如果你 fork 或使用本项目，请注意：
- 图片版权属于各自的原作者，非本项目的许可范围
- 若需将图片下载后本地使用，请遵守各图片的原始许可证（通常需要署名）
- `landscapes/` 目录下的本地图片由用户自行提供，不包含在本项目许可范围内

## 许可证

本项目采用自定义许可证，详见 [LICENSE](./LICENSE) 文件。

### 你可以：

- **分享** — 在任何媒介或格式中复制、转载本项目
- **演绎** — 修改、转换或基于本项目进行二次创作
- **个人使用** — 用于个人学习、研究和非商业展示

### 但须遵守以下条件：

- **署名** — 你必须注明原作者并提供本项目链接
- **未经授权不可商用** — 未经作者书面授权，不得将本项目用于任何商业目的

---

**Copyright (c) 2026 seanlsxu. All rights reserved.**

**本项目仅供个人学习、研究和非商业用途使用。未经作者书面授权，严禁用于任何商业目的。**

---

<details>
<summary><b>English Version</b></summary>

# 🌍 World Landmarks Atlas

> This project was co-created by the author and [CodeBuddy](https://www.codebuddy.ai).

An interactive global landmarks visualization featuring **120 world-famous landmarks** (60 natural + 60 cultural), spanning **5 continents and 56 countries/regions**. Browse via a 3D globe or flat world map, and click markers to explore landmark details.

## Preview

Open `landscape_global_show.html` in any modern browser.

## Features

- **3D Globe View** — Interactive Three.js globe with landmark markers at real geographic coordinates; supports drag, zoom and auto-rotation
- **Flat Map View** — Canvas-rendered equirectangular world map with zoom and pan
- **Multi-filter Search** — Filter by continent, recommended travel season, landmark type (natural/cultural), or country; keyword search by name, country or description
- **Landmark Detail Cards** — View introduction, best travel time, and travel guide with representative images and Wikipedia links
- **Check-in System** — Mark visited landmarks; checked-in countries are highlighted in golden overlay on the flat map; real-time progress tracker (xx/120)
- **Local Image Support** — Auto-loads images from the `landscapes/` directory matched by landmark name; manual upload also available
- **Background Music** — Auto-plays `music.mp3` on load if present; upload custom audio via the top-left controls

## Project Structure

```
landscape_global_show/
├── landscape_global_show.html   # Main entry page
├── style.css                    # Stylesheet (sky-blue theme)
├── landscapes-data.js           # 120 landmarks data
├── globe.js                     # 3D globe renderer
├── ui.js                        # UI module (filters, detail cards, map view, check-in)
├── landscapes/                  # Local landmark images (optional)
│   └── ...                      # Named by landmark name; jpg/webp/png
├── music.mp3                    # Background music (optional)
├── LICENSE                      # License file
└── README.md                    # This file
```

## Usage

### Browsing

1. Open `landscape_global_show.html` in a browser
2. The 3D globe auto-rotates showing global landmark distribution
3. **Click a landmark marker** on the globe to view details
4. Use the right panel to search and filter
5. Switch between **🌍 Globe / 🗺 Flat Map** via top-left tabs

### Landmark Images

- Detail cards automatically load representative images from Wikimedia Commons
- If the preset image fails, a fallback fetches thumbnails via the Wikipedia API
- Place images named after landmarks in the `landscapes/` directory to override online images
- You can also upload images manually via the **📷 Upload** button in the detail card

### Check-in

- Click the **📌 Check-in** button at the bottom of a detail card to mark a visited landmark
- Checked-in countries are highlighted with a golden overlay on the flat map
- Real-time progress is shown at the bottom-left corner (xx/120)
- Check-in data is persisted in browser localStorage and survives page refreshes

## Tech Stack

- **Three.js** — 3D globe rendering
- **Canvas 2D** — Flat map rendering
- **TopoJSON** — World boundary data
- **Wikipedia API** — Dynamic landmark image fetching
- **Vanilla HTML/CSS/JS** — Zero build tools, works out of the box

## Landmark Data

120 world landmarks, each containing:

| Field | Description |
|-------|-------------|
| Name (CN / EN) | Chinese and English names |
| Country / Region | Country where the landmark is located |
| Coordinates | For positioning on the globe |
| Travel Season | Recommended visiting months |
| Type | Natural Landscape / Cultural Landmark |
| Introduction | Brief description |
| Best Travel Time | Detailed timing advice |
| Travel Guide | Transportation, itinerary and practical tips |

## Image Copyright Notice

Landmark images in this project come from the following sources. **The project itself does not contain any image files** — it only references them via URLs:

- **Wikimedia Commons**: Images are under open licenses such as CC BY-SA, CC BY, or Public Domain. Copyrights belong to their respective authors. Hotlinking is permitted per Wikimedia's usage policy.
- **Wikipedia API**: When preset links fail, thumbnails are dynamically fetched via Wikipedia's public API, which is a normal use of the API.

If you fork or use this project, please note:
- Image copyrights belong to their respective original authors and are outside the scope of this project's license
- If you download images for local use, please comply with each image's original license (usually requiring attribution)
- Images in the `landscapes/` directory are user-provided and not covered by this project's license

## License

This project uses a custom license. See [LICENSE](./LICENSE) for details.

### You may:

- **Share** — Copy and redistribute in any medium or format
- **Adapt** — Remix, transform, and build upon this project
- **Personal Use** — Use for personal learning, research and non-commercial display

### Conditions:

- **Attribution** — You must credit the original author and link to this repository
- **No Commercial Use Without Authorization** — Commercial use of any kind requires prior written permission from the author

---

**Copyright (c) 2026 seanlsxu. All rights reserved.**

**This project is for personal, educational and non-commercial use only. Commercial use without written authorization from the author is strictly prohibited.**

</details>
