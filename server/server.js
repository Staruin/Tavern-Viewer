/**
 * Tavern Viewer - Backend Server
 * 
 * Express 后端服务：
 * - 静态托管 Vite 构建产物
 * - API: 扫描 SillyTavern 数据目录，返回角色/聊天列表
 * - API: 读取 JSONL 聊天记录文件
 * - SSE: 文件变动实时推送
 */

import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ============ Configuration ============

const PORT = parseInt(process.env.PORT || '3000', 10)
const DATA_DIR = process.env.DATA_DIR || '/data'
const USER_DIR = process.env.USER_DIR || 'default-user'

// Derived paths
const chatsDir = path.join(DATA_DIR, USER_DIR, 'chats')
const distDir = path.join(__dirname, '..', 'dist')

// ============ Express App ============

const app = express()
app.use(cors())
app.use(express.json())

// Serve static frontend files
if (fs.existsSync(distDir)) {
    app.use(express.static(distDir))
}

// ============ API Routes ============

/**
 * GET /api/status
 * Health check + data directory status
 */
app.get('/api/status', (req, res) => {
    const chatsDirExists = fs.existsSync(chatsDir)
    let characterCount = 0

    if (chatsDirExists) {
        try {
            characterCount = fs.readdirSync(chatsDir)
                .filter(name => {
                    const fullPath = path.join(chatsDir, name)
                    return fs.statSync(fullPath).isDirectory()
                }).length
        } catch (e) {
            // ignore
        }
    }

    res.json({
        ok: true,
        dataDir: DATA_DIR,
        userDir: USER_DIR,
        chatsDirExists,
        characterCount,
        timestamp: new Date().toISOString()
    })
})

/**
 * GET /api/characters
 * List all character directories and their chat file counts
 */
app.get('/api/characters', (req, res) => {
    if (!fs.existsSync(chatsDir)) {
        return res.json({ characters: [], error: 'Chats directory not found' })
    }

    try {
        const entries = fs.readdirSync(chatsDir, { withFileTypes: true })
        const characters = []

        for (const entry of entries) {
            if (!entry.isDirectory()) continue

            const charDir = path.join(chatsDir, entry.name)
            try {
                const files = fs.readdirSync(charDir)
                    .filter(f => f.endsWith('.jsonl'))

                // Get latest modification time across all chat files
                let latestMtime = 0
                for (const f of files) {
                    try {
                        const stat = fs.statSync(path.join(charDir, f))
                        if (stat.mtimeMs > latestMtime) {
                            latestMtime = stat.mtimeMs
                        }
                    } catch (e) {
                        // skip
                    }
                }

                characters.push({
                    name: entry.name,
                    chatCount: files.length,
                    lastModified: latestMtime > 0 ? new Date(latestMtime).toISOString() : null
                })
            } catch (e) {
                // skip unreadable directories
            }
        }

        // Sort by last modified (newest first)
        characters.sort((a, b) => {
            if (!a.lastModified) return 1
            if (!b.lastModified) return -1
            return new Date(b.lastModified) - new Date(a.lastModified)
        })

        res.json({ characters })
    } catch (error) {
        res.status(500).json({ error: 'Failed to scan characters directory', detail: error.message })
    }
})

/**
 * GET /api/characters/:name/chats
 * List all JSONL chat files for a character
 */
app.get('/api/characters/:name/chats', (req, res) => {
    const charName = decodeURIComponent(req.params.name)
    const charDir = path.join(chatsDir, charName)

    // Security: prevent directory traversal
    if (!charDir.startsWith(chatsDir)) {
        return res.status(400).json({ error: 'Invalid character name' })
    }

    if (!fs.existsSync(charDir)) {
        return res.status(404).json({ error: 'Character not found' })
    }

    try {
        const files = fs.readdirSync(charDir)
            .filter(f => f.endsWith('.jsonl'))
            .map(f => {
                const filePath = path.join(charDir, f)
                const stat = fs.statSync(filePath)

                // Read first line to extract metadata (chat_metadata)
                let chatName = f.replace('.jsonl', '')
                let messageCount = 0
                try {
                    const content = fs.readFileSync(filePath, 'utf-8')
                    const lines = content.split('\n').filter(l => l.trim())
                    messageCount = lines.length

                    // First line is usually metadata
                    if (lines.length > 0) {
                        const firstLine = JSON.parse(lines[0])
                        if (firstLine.chat_metadata) {
                            messageCount = lines.length - 1 // exclude metadata line
                        }
                    }
                } catch (e) {
                    // ignore parsing failures
                }

                return {
                    filename: f,
                    displayName: chatName,
                    size: stat.size,
                    sizeFormatted: formatFileSize(stat.size),
                    lastModified: stat.mtime.toISOString(),
                    messageCount
                }
            })

        // Sort by last modified (newest first)
        files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))

        res.json({ character: charName, chats: files })
    } catch (error) {
        res.status(500).json({ error: 'Failed to list chat files', detail: error.message })
    }
})

/**
 * GET /api/chats/:character/:filename
 * Read and parse a JSONL chat file, return messages array
 */
app.get('/api/chats/:character/:filename', (req, res) => {
    const charName = decodeURIComponent(req.params.character)
    const fileName = decodeURIComponent(req.params.filename)
    const filePath = path.join(chatsDir, charName, fileName)

    // Security: prevent directory traversal
    if (!filePath.startsWith(chatsDir)) {
        return res.status(400).json({ error: 'Invalid path' })
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Chat file not found' })
    }

    try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n').filter(l => l.trim())

        let metadata = null
        const messages = []

        for (const line of lines) {
            try {
                const data = JSON.parse(line)

                // First line is metadata
                if (data.chat_metadata) {
                    metadata = data
                    continue
                }

                messages.push({
                    name: data.name || 'Unknown',
                    is_user: data.is_user || false,
                    is_system: data.is_system || false,
                    send_date: data.send_date || new Date().toISOString(),
                    mes: data.mes || '',
                    swipes: data.swipes || [],
                    extra: data.extra || {}
                })
            } catch (e) {
                // skip unparseable lines
            }
        }

        const stat = fs.statSync(filePath)

        res.json({
            character: charName,
            filename: fileName,
            fileSize: stat.size,
            lastModified: stat.mtime.toISOString(),
            metadata,
            messages
        })
    } catch (error) {
        res.status(500).json({ error: 'Failed to read chat file', detail: error.message })
    }
})

// ============ SSE: Real-time file watching ============

/** @type {Set<import('express').Response>} */
const sseClients = new Set()

/**
 * GET /api/events
 * Server-Sent Events endpoint for real-time file change notifications
 */
app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
    })

    // Send initial connected event
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)

    sseClients.add(res)

    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`)
    }, 30000)

    req.on('close', () => {
        clearInterval(heartbeat)
        sseClients.delete(res)
    })
})

/**
 * Broadcast an event to all SSE clients
 */
function broadcastSSE(event) {
    const data = JSON.stringify(event)
    for (const client of sseClients) {
        try {
            client.write(`data: ${data}\n\n`)
        } catch (e) {
            sseClients.delete(client)
        }
    }
}

/**
 * Set up recursive file watching on the chats directory
 */
function setupFileWatcher() {
    if (!fs.existsSync(chatsDir)) {
        console.warn(`[Watcher] Chats directory not found: ${chatsDir}`)
        return
    }

    // Debounce map to avoid duplicate events
    const debounceMap = new Map()

    try {
        fs.watch(chatsDir, { recursive: true }, (eventType, filename) => {
            if (!filename) return
            // Only care about .jsonl files
            if (!filename.endsWith('.jsonl')) return

            // Debounce: ignore repeated events within 500ms
            const key = `${eventType}:${filename}`
            if (debounceMap.has(key)) return
            debounceMap.set(key, true)
            setTimeout(() => debounceMap.delete(key), 500)

            // Parse character name and filename from the path
            const parts = filename.split(path.sep)
            const character = parts.length > 1 ? parts[0] : null
            const chatFile = parts.length > 1 ? parts.slice(1).join(path.sep) : filename

            console.log(`[Watcher] ${eventType}: ${filename}`)

            broadcastSSE({
                type: 'file-change',
                eventType,
                character,
                filename: chatFile,
                timestamp: Date.now()
            })
        })

        console.log(`[Watcher] Watching: ${chatsDir}`)
    } catch (error) {
        console.error(`[Watcher] Failed to watch directory:`, error.message)
    }
}

// ============ SPA Fallback ============

// For client-side routing, serve index.html for all non-API routes
app.get('*', (req, res) => {
    const indexPath = path.join(distDir, 'index.html')
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath)
    } else {
        res.status(404).json({ error: 'Frontend not built. Run: npm run build' })
    }
})

// ============ Helpers ============

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// ============ Start Server ============

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔══════════════════════════════════════════╗`)
    console.log(`║   🍺 Tavern Viewer Server                ║`)
    console.log(`╠══════════════════════════════════════════╣`)
    console.log(`║   Port:     ${String(PORT).padEnd(28)}║`)
    console.log(`║   Data:     ${DATA_DIR.padEnd(28)}║`)
    console.log(`║   User:     ${USER_DIR.padEnd(28)}║`)
    console.log(`║   Chats:    ${chatsDir.substring(0, 28).padEnd(28)}║`)
    console.log(`╚══════════════════════════════════════════╝\n`)

    // Start file watcher
    setupFileWatcher()
})
