<!--
  App.vue - 根组件
  管理全局状态、文件导入、搜索、导出等核心功能
  支持服务器模式（Docker 部署，自动读取 NAS 聊天目录）与独立模式（手动上传）
-->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MessageList from './components/MessageList.vue'
import InfoPanel from './components/InfoPanel.vue'
import ChapterPanel from './components/ChapterPanel.vue'
import SearchPanel from './components/SearchPanel.vue'
import EditModal from './components/EditModal.vue'
import ConfigModal from './components/ConfigModal.vue'
import CharacterList from './components/CharacterList.vue'
import { parseJsonl, extractContent, loadConfig, saveConfig, parseTimeBar, parseSummary, parseChoices, parseThinking } from './utils/parser.js'
import { t, toggleLang } from './utils/i18n.js'
import { checkServerMode, fetchChat, connectSSE } from './utils/api.js'

// 状态
const messages = ref([])
const filteredMessages = ref([])
const isLoading = ref(false)
const loadingProgress = ref(0)
const loadingStatus = ref('')
const searchQuery = ref('')
const showSearch = ref(false)
const showConfig = ref(false)
const editMessage = ref(null)
const fileInfo = ref(null)
const selectedMessage = ref(null)

// 服务器模式状态
const serverMode = ref(false)
const serverStatus = ref(null)
let sseConnection = null

// 正则配置
const regexConfig = ref(loadConfig())

// 统计信息
const stats = computed(() => {
  if (!messages.value.length) return null
  const userMsgs = messages.value.filter(m => m.is_user)
  const aiMsgs = messages.value.filter(m => !m.is_user)
  const totalChars = messages.value.reduce((sum, m) => sum + (m.mes?.length || 0), 0)
  const contentChars = aiMsgs.reduce((sum, m) => sum + (m.content?.length || 0), 0)
  const userContentChars = userMsgs.reduce((sum, m) => sum + (m.content?.length || 0), 0)
  const thinkingChars = aiMsgs.reduce((sum, m) => sum + (m.thinking?.length || 0), 0)
  const summaryChars = aiMsgs.reduce((sum, m) => sum + (m.summary?.length || 0), 0)
  
  return {
    total: messages.value.length,
    userCount: userMsgs.length,
    aiCount: aiMsgs.length,
    totalChars,
    avgChars: Math.round(totalChars / messages.value.length),
    contentChars,
    userContentChars,
    thinkingChars,
    summaryChars
  }
})

// 处理文件上传
async function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  isLoading.value = true
  loadingProgress.value = 0
  loadingStatus.value = '准备解析文件...'
  messages.value = []
  selectedMessage.value = null
  
  fileInfo.value = {
    name: file.name,
    size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
  }
  
  try {
    loadingStatus.value = '正在解析 JSONL 文件...'
    
    const result = await parseJsonl(file, (progress) => {
      loadingProgress.value = Math.floor(progress * 0.8) // 0-80%
      if (progress < 30) {
        loadingStatus.value = '正在解析 JSONL 文件...'
      } else if (progress < 60) {
        loadingStatus.value = '正在处理消息内容...'
      } else {
        loadingStatus.value = '正在提取文本...'
      }
    }, regexConfig.value)
    
    loadingProgress.value = 85
    loadingStatus.value = '正在建立索引...'
    
    messages.value = result
    filteredMessages.value = result
    
    // 等待 Vue 渲染
    await new Promise(resolve => setTimeout(resolve, 100))
    
    loadingProgress.value = 95
    loadingStatus.value = '正在初始化界面...'
    
    // 自动选中第一条消息
    if (result.length > 1) {
      selectedMessage.value = { ...result[1], floor: 1 }
    }
    
    loadingProgress.value = 100
    loadingStatus.value = '加载完成！'
    
    await new Promise(resolve => setTimeout(resolve, 200))
    
  } catch (error) {
    console.error('解析错误:', error)
    alert('文件解析失败: ' + error.message)
  } finally {
    isLoading.value = false
    loadingStatus.value = ''
  }
}

// 搜索处理
function handleSearch(query) {
  searchQuery.value = query
  
  if (!query.trim()) {
    filteredMessages.value = messages.value
    return
  }
  
  const lowerQuery = query.toLowerCase()
  filteredMessages.value = messages.value.filter(msg => {
    const content = msg.mes?.toLowerCase() || ''
    const name = msg.name?.toLowerCase() || ''
    return content.includes(lowerQuery) || name.includes(lowerQuery)
  })
}

// 选中消息
function handleSelectMessage(msg) {
  selectedMessage.value = msg
}

// 跳转到楼层
function jumpToFloor(floor) {
  const event = new CustomEvent('jump-to-floor', { detail: floor })
  window.dispatchEvent(event)
}

// 编辑消息
function openEdit(msg) {
  editMessage.value = { ...msg }
}

function saveEdit(updatedMsg) {
  const index = messages.value.findIndex(m => m.send_date === updatedMsg.send_date)
  if (index !== -1) {
    messages.value[index] = { ...updatedMsg }
    messages.value[index].content = extractContent(updatedMsg.mes, regexConfig.value)
    handleSearch(searchQuery.value)
  }
  editMessage.value = null
}

// 替换功能
function handleReplace(findText, replaceText, useRegex = false) {
  let findPattern = findText
  let flags = 'g'
  
  if (useRegex) {
    try {
      findPattern = new RegExp(findText, flags)
    } catch (e) {
      alert('正则表达式错误: ' + e.message)
      return
    }
  } else {
    findPattern = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
  }
  
  let count = 0
  messages.value = messages.value.map(msg => {
    if (msg.mes && findPattern.test(msg.mes)) {
      count++
      const newMes = msg.mes.replace(findPattern, replaceText)
      return {
        ...msg,
        mes: newMes,
        content: extractContent(newMes, regexConfig.value)
      }
    }
    return msg
  })
  
  handleSearch(searchQuery.value)
  alert(`已替换 ${count} 条消息`)
}

// 保存配置
function handleSaveConfig(config) {
  regexConfig.value = config
  saveConfig(config)
  showConfig.value = false
  
  // 重新解析所有消息
  if (messages.value.length > 0) {
    messages.value = messages.value.map(msg => ({
      ...msg,
      content: extractContent(msg.mes, config),
      timeBar: parseTimeBar(msg.mes, config),
      summary: parseSummary(msg.mes, config),
      choices: parseChoices(msg.mes, config),
      thinking: parseThinking(msg.mes, config)
    }))
    // 同步更新 filteredMessages
    handleSearch(searchQuery.value)
  }
}

// 导入配置
function handleImportConfig(config) {
  regexConfig.value = { ...regexConfig.value, ...config }
  saveConfig(regexConfig.value)
}

// 导出Markdown
function exportMarkdown() {
  let md = '# 聊天记录导出\n\n'
  
  messages.value.slice(1).forEach((msg, idx) => {
    const time = new Date(msg.send_date).toLocaleString()
    const prefix = msg.is_user ? `**👤 ${t('user')}**` : `**🤖 ${msg.name}**`
    const content = extractContent(msg.mes, regexConfig.value)
    
    md += `## 第 ${idx + 1} 楼\n`
    md += `> ${prefix} | ${time}\n\n`
    md += content + '\n\n---\n\n'
  })
  
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'chat_export.md'
  a.click()
  URL.revokeObjectURL(url)
}

// 导出JSON
function exportJson() {
  const blob = new Blob([JSON.stringify(messages.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'chat_export.json'
  a.click()
  URL.revokeObjectURL(url)
}

// 从服务器加载聊天记录
async function loadFromServer({ character, filename, displayName }) {
  isLoading.value = true
  loadingProgress.value = 0
  loadingStatus.value = '正在从服务器加载...'
  messages.value = []
  selectedMessage.value = null

  fileInfo.value = {
    name: `${character} / ${displayName}`,
    size: ''
  }

  try {
    loadingProgress.value = 30
    loadingStatus.value = '正在读取聊天记录...'

    const data = await fetchChat(character, filename)

    loadingProgress.value = 60
    loadingStatus.value = '正在解析消息内容...'

    // Apply regex parsing to messages (same as parseJsonl does locally)
    const config = regexConfig.value
    const result = data.messages.map(msg => ({
      ...msg,
      content: extractContent(msg.mes, config),
      timeBar: parseTimeBar(msg.mes, config),
      summary: parseSummary(msg.mes, config),
      choices: parseChoices(msg.mes, config),
      thinking: parseThinking(msg.mes, config)
    }))

    loadingProgress.value = 85
    loadingStatus.value = '正在初始化界面...'

    messages.value = result
    filteredMessages.value = result

    if (data.fileSize) {
      fileInfo.value.size = (data.fileSize / 1024 / 1024).toFixed(2) + ' MB'
    }

    await new Promise(resolve => setTimeout(resolve, 100))

    if (result.length > 1) {
      selectedMessage.value = { ...result[1], floor: 1 }
    }

    loadingProgress.value = 100
    loadingStatus.value = '加载完成！'
    await new Promise(resolve => setTimeout(resolve, 200))

  } catch (error) {
    console.error('服务器加载错误:', error)
    alert('加载失败: ' + error.message)
  } finally {
    isLoading.value = false
    loadingStatus.value = ''
  }
}

// 检测服务器模式
async function detectServerMode() {
  const status = await checkServerMode()
  serverMode.value = status.serverMode
  serverStatus.value = status
  if (status.serverMode) {
    console.log('[Tavern Viewer] Server mode detected:', status)
  }
}

// 键盘快捷键
function handleKeydown(e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'f') {
      e.preventDefault()
      showSearch.value = !showSearch.value
    } else if (e.key === 's') {
      e.preventDefault()
      exportJson()
    }
  }
  if (e.key === 'Escape') {
    showSearch.value = false
    editMessage.value = null
    showConfig.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  detectServerMode()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (sseConnection) {
    sseConnection.close()
  }
})
</script>

<template>
  <div class="app-container">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <div class="toolbar-left">
        <h1 class="logo">{{ t('appTitle') }}</h1>
        <span v-if="fileInfo" class="file-info">{{ fileInfo.name }} <template v-if="fileInfo.size">({{ fileInfo.size }})</template></span>
        <span v-if="serverMode" class="server-badge" :title="'Connected to ' + (serverStatus?.dataDir || 'server')">🟢 {{ t('serverMode') || '服务器模式' }}</span>
      </div>
      
      <div class="toolbar-right">
        <button class="btn btn-lang" @click="toggleLang" title="Switch Language / 言語切替">
          {{ t('langBtn') }}
        </button>
        
        <label class="btn btn-primary">
          {{ t('importBtn') }}
          <input type="file" accept=".jsonl,.json" @change="handleFileUpload" hidden>
        </label>
        
        <button v-if="messages.length" class="btn" @click="showSearch = !showSearch">
          {{ t('searchBtn') }}
        </button>
        
        <button class="btn" @click="showConfig = true">
          {{ t('configBtn') }}
        </button>
        
        <button v-if="messages.length" class="btn" @click="exportMarkdown">
          {{ t('exportMD') }}
        </button>
        
        <button v-if="messages.length" class="btn" @click="exportJson">
          {{ t('exportJSON') }}
        </button>
      </div>
    </header>
    
    <!-- 加载进度 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p class="loading-status">{{ loadingStatus }}</p>
        <p class="loading-percent">{{ loadingProgress }}%</p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <p v-if="fileInfo" class="loading-file">{{ fileInfo.name }}</p>
      </div>
    </div>
    
    <!-- 搜索面板 -->
    <SearchPanel 
      v-if="showSearch && messages.length"
      @search="handleSearch"
      @replace="handleReplace"
      @close="showSearch = false"
    />
    
    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 左侧：服务器模式显示角色列表，有消息时显示信息面板 -->
      <CharacterList
        v-if="serverMode"
        @load-chat="loadFromServer"
      />
      <InfoPanel 
        v-if="messages.length"
        :message="selectedMessage"
        :stats="stats"
      />
      
      <!-- 中间消息列表 -->
      <div class="message-area">
        <!-- 独立模式（无服务器）的空状态 -->
        <div v-if="!messages.length && !isLoading && !serverMode" class="empty-state">
          <div class="empty-icon">📂</div>
          <h2>酒馆聊天记录查看器</h2>
          <p>点击「📁 导入」选择 JSONL 文件</p>
          <p class="hint">支持 SillyTavern 导出的聊天记录</p>
          <div class="features">
            <div class="feature">⚡ 高性能虚拟滚动</div>
            <div class="feature">🔍 正则搜索与替换</div>
            <div class="feature">⚙️ 自定义解析规则</div>
            <div class="feature">📖 章节快速导航</div>
          </div>
        </div>
        
        <!-- 服务器模式的空状态 -->
        <div v-else-if="!messages.length && !isLoading && serverMode" class="empty-state">
          <div class="empty-icon">👈</div>
          <h2>{{ t('selectChat') || '选择一个聊天记录' }}</h2>
          <p>{{ t('selectChatHint') || '从左侧角色列表中选择要查看的聊天记录' }}</p>
        </div>
        
        <MessageList 
          v-else-if="filteredMessages.length"
          :messages="filteredMessages"
          @edit="openEdit"
          @select-message="handleSelectMessage"
        />
        
        <div v-else-if="messages.length && !filteredMessages.length" class="empty-state">
          <p>没有找到匹配的消息</p>
        </div>
      </div>
      
      <!-- 右侧章节导航 -->
      <ChapterPanel 
        v-if="messages.length"
        :messages="messages"
        @jump-to="jumpToFloor"
      />
    </main>
    
    <!-- 编辑弹窗 -->
    <EditModal 
      v-if="editMessage"
      :message="editMessage"
      @save="saveEdit"
      @close="editMessage = null"
    />
    
    <!-- 配置弹窗 -->
    <ConfigModal 
      v-if="showConfig"
      :config="regexConfig"
      @save="handleSaveConfig"
      @import="handleImportConfig"
      @close="showConfig = false"
    />
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  z-index: 100;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.server-badge {
  font-size: 0.8rem;
  padding: 3px 10px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border-radius: 12px;
  font-weight: 500;
}

.file-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: 12px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn:hover {
  background: var(--bg-hover);
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #5558e3 0%, #7c4fe8 100%);
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.message-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  color: var(--text-secondary);
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h2 {
  color: var(--text-primary);
  margin-bottom: 8px;
}

.hint {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 8px;
}

.features {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature {
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.loading-content {
  text-align: center;
  color: white;
  padding: 40px;
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  min-width: 300px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: #8b5cf6;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-status {
  font-size: 1.1rem;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.loading-percent {
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-color);
  margin-bottom: 16px;
}

.loading-file {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 12px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 3px;
  transition: width 0.2s ease;
}
</style>
