/**
 * api.js - 后端 API 调用封装
 *
 * 服务器模式下，通过 HTTP API 获取角色列表、聊天记录
 * 独立模式下（无后端），保持原有手动上传流程
 */

// API base URL: 开发环境走 Vite proxy，生产环境同源
const API_BASE = '/api'

/**
 * 检测是否在服务器模式下运行
 * 尝试请求 /api/status，如果成功则为服务器模式
 */
export async function checkServerMode() {
    try {
        const res = await fetch(`${API_BASE}/status`, {
            signal: AbortSignal.timeout(3000)
        })
        if (res.ok) {
            const data = await res.json()
            return { serverMode: true, ...data }
        }
    } catch (e) {
        // API not available
    }
    return { serverMode: false }
}

/**
 * 获取所有角色列表
 * @returns {Promise<{characters: Array}>}
 */
export async function fetchCharacters() {
    const res = await fetch(`${API_BASE}/characters`)
    if (!res.ok) throw new Error(`Failed to fetch characters: ${res.status}`)
    return res.json()
}

/**
 * 获取某角色的聊天记录列表
 * @param {string} characterName
 * @returns {Promise<{character: string, chats: Array}>}
 */
export async function fetchChatList(characterName) {
    const res = await fetch(`${API_BASE}/characters/${encodeURIComponent(characterName)}/chats`)
    if (!res.ok) throw new Error(`Failed to fetch chat list: ${res.status}`)
    return res.json()
}

/**
 * 获取单个聊天记录的完整消息
 * @param {string} characterName
 * @param {string} filename
 * @returns {Promise<{messages: Array, metadata: Object}>}
 */
export async function fetchChat(characterName, filename) {
    const res = await fetch(
        `${API_BASE}/chats/${encodeURIComponent(characterName)}/${encodeURIComponent(filename)}`
    )
    if (!res.ok) throw new Error(`Failed to fetch chat: ${res.status}`)
    return res.json()
}

/**
 * 建立 SSE 连接，监听文件变动
 * @param {Function} onEvent - 事件回调 (event) => void
 * @returns {{ close: Function }} - 返回关闭连接的方法
 */
export function connectSSE(onEvent) {
    const source = new EventSource(`${API_BASE}/events`)

    source.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data)
            onEvent(data)
        } catch (err) {
            console.warn('[SSE] Parse error:', err)
        }
    }

    source.onerror = (e) => {
        console.warn('[SSE] Connection error, will retry automatically')
    }

    return {
        close: () => source.close()
    }
}
