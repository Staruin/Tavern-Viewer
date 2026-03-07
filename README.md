# 📚 Tavern Viewer / 酒馆聊天记录查看器

A high-performance chat log viewer & manager for [SillyTavern](https://github.com/SillyTavern/SillyTavern).

一个高性能的 SillyTavern 聊天记录查看器，支持 Docker 部署到 NAS 自动读取聊天目录，也支持手动导入 JSONL 文件。

## ✨ Features / 功能特性

- � **Docker Deploy** — Deploy to NAS, auto-read SillyTavern chat directory
- 📂 **Character Browser** — Browse all characters & chats from mapped data directory
- 🔄 **Real-time Sync** — SSE-powered live file change detection
- �📁 **JSONL Import** — Streaming parser for large chat logs (100MB+)
- 🔍 **Search & Replace** — Full-text search with regex support
- ⚙️ **Custom Regex Rules** — Import SillyTavern presets or configure custom extraction rules
- 📖 **Chapter Navigation** — Quick navigation by AI/User messages
- 📊 **Statistics** — Message counts, character stats, and per-floor details
- ✏️ **Message Editing** — Edit message content in-place
- 💾 **Export** — Export as Markdown or JSON
- 🌐 **i18n** — Chinese, English, Japanese
- 🖥️ **Electron Support** — Optional desktop app packaging

## � Docker Deploy (Recommended) / Docker 部署（推荐）

### Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/Tavern-Viewer.git
cd Tavern-Viewer
```

Edit `docker-compose.yml`, change the volume path to your SillyTavern data directory:

修改 `docker-compose.yml`，将卷映射路径改为你的 SillyTavern 数据目录：

```yaml
volumes:
  - /path/to/SillyTavern/data:/data:ro  # ← Change this
```

Then build and run:

```bash
docker compose up -d --build
```

Open `http://your-nas-ip:3000` in your browser. Done! 🎉

访问 `http://你的NAS-IP:3000` 即可使用。

### Environment Variables

| Variable   | Default        | Description                          |
| ---------- | -------------- | ------------------------------------ |
| `PORT`     | `3000`         | Server port                          |
| `DATA_DIR` | `/data`        | SillyTavern data mount point         |
| `USER_DIR` | `default-user` | SillyTavern user directory name      |

### SillyTavern Directory Structure

The app expects this structure inside the mounted data directory:

```
/data/
└── default-user/
    └── chats/
        ├── CharacterA/
        │   ├── chat1.jsonl
        │   └── chat2.jsonl
        └── CharacterB/
            └── chat1.jsonl
```

## 🚀 Local Development / 本地开发

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18

### Install & Run

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Start backend server (with test data)
# Linux/Mac:
DATA_DIR=./test-data node server/server.js
# Windows PowerShell:
$env:DATA_DIR='./test-data'; node server/server.js

# In another terminal, start frontend dev server
npm run dev
```

> The Vite dev server proxies `/api` requests to `localhost:3000` automatically.

### Standalone Mode (No Server)

If no backend is detected, the app falls back to manual JSONL file upload mode.

```bash
npm install
npm run dev
# or build: npm run build && npx serve dist
```

### Build Troubleshooting

If `npm run build` seems stuck or does not complete, do not panic.

In this project, stale files in `dist/` can occasionally block a clean build.
Please clear `dist/` first, then build again:

```bash
npm run build:clean
```

Equivalent manual flow:

```bash
# delete dist/ first, then
npm run build
```

### Electron (Optional)

```bash
npm install -D electron electron-builder
npm run electron:dev
npm run electron:build
```

## 📂 Project Structure / 项目结构

```text
tavern-viewer/
├── index.html              # Entry HTML
├── vite.config.js          # Vite config (dev proxy)
├── package.json
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose config
├── server/
│   ├── server.js           # Express backend (API + SSE + static)
│   └── package.json
├── src/
│   ├── main.js             # App entry
│   ├── App.vue             # Root component (server/standalone mode)
│   ├── components/
│   │   ├── CharacterList.vue # Character & chat browser (server mode)
│   │   ├── MessageList.vue   # Chat message list
│   │   ├── InfoPanel.vue     # Left sidebar - stats & floor details
│   │   ├── ChapterPanel.vue  # Right sidebar - chapter navigation
│   │   ├── ConfigModal.vue   # Regex config & preset import
│   │   ├── EditModal.vue     # Message editor
│   │   ├── SearchPanel.vue   # Search & replace panel
│   │   └── StatsPanel.vue    # Statistics overlay
│   ├── styles/
│   │   └── main.css          # Global styles & CSS variables
│   └── utils/
│       ├── api.js            # Backend API client & SSE
│       ├── parser.js         # JSONL parser & regex engine
│       └── i18n.js           # Internationalization (zh/en/ja)
├── electron/                 # Electron main & preload (optional)
│   ├── main.js
│   └── preload.js
└── public/
```

## 🛠️ Tech Stack / 技术栈

- **Vue 3** — Composition API with `<script setup>`
- **Vite 6** — Fast build tooling
- **Express** — Lightweight backend for API & static serving
- **Vanilla CSS** — Custom properties, dark theme, GPU-accelerated animations
- **Docker** — Multi-stage build for NAS deployment
- **Electron** — Optional desktop packaging

## 📄 License

MIT
