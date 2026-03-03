# 📚 Tavern Viewer / 酒馆聊天记录查看器

A high-performance chat log viewer for [SillyTavern](https://github.com/SillyTavern/SillyTavern) exported JSONL files.

一个高性能的 SillyTavern 聊天记录查看器，支持 JSONL 格式文件的导入、浏览、搜索和管理。

## ✨ Features / 功能特性

- 📁 **JSONL Import** — Streaming parser for large chat logs (100MB+)
- 🔍 **Search & Replace** — Full-text search with regex support
- ⚙️ **Custom Regex Rules** — Import SillyTavern presets or configure custom extraction rules
- 📖 **Chapter Navigation** — Quick navigation by AI/User messages
- 📊 **Statistics** — Message counts, character stats, and per-floor details
- ✏️ **Message Editing** — Edit message content in-place
- 💾 **Export** — Export as Markdown or JSON
- 🌐 **i18n** — Chinese, English, Japanese
- 🖥️ **Electron Support** — Optional desktop app packaging

## 🚀 Quick Start / 快速开始

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Electron (Optional)

```bash
# Install Electron dependencies
npm install -D electron electron-builder

# Run as desktop app
npm run electron:dev

# Package as installer
npm run electron:build
```

## 📂 Project Structure / 项目结构

```text
tavern-viewer/
├── index.html              # Entry HTML
├── vite.config.js          # Vite config
├── package.json
├── src/
│   ├── main.js             # App entry
│   ├── App.vue             # Root component
│   ├── components/
│   │   ├── MessageList.vue # Chat message list with virtual scrolling
│   │   ├── InfoPanel.vue   # Left sidebar - stats & floor details
│   │   ├── ChapterPanel.vue# Right sidebar - chapter navigation
│   │   ├── ConfigModal.vue # Regex config & preset import
│   │   ├── EditModal.vue   # Message editor
│   │   ├── SearchPanel.vue # Search & replace panel
│   │   └── StatsPanel.vue  # Statistics overlay
│   ├── styles/
│   │   └── main.css        # Global styles & CSS variables
│   └── utils/
│       ├── parser.js       # JSONL parser & regex engine
│       └── i18n.js         # Internationalization (zh/en/ja)
├── electron/               # Electron main & preload (optional)
│   ├── main.js
│   └── preload.js
└── public/
    └── 启动服务器.py        # Python local server script
```

## 🛠️ Tech Stack / 技术栈

- **Vue 3** — Composition API with `<script setup>`
- **Vite 6** — Fast build tooling
- **Vanilla CSS** — Custom properties, dark theme, GPU-accelerated animations
- **Electron** — Optional desktop packaging

## 📄 License

MIT
