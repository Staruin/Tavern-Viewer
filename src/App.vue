<!--
  App.vue - 根组件
  管理全局状态、文件导入、搜索、导出等核心功能
  支持服务器模式（Docker 部署，自动读取 NAS 聊天目录）与独立模式（手动上传）
-->
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import MessageList from './components/MessageList.vue'
import InfoPanel from './components/InfoPanel.vue'
import ChapterPanel from './components/ChapterPanel.vue'
import SearchPanel from './components/SearchPanel.vue'
import EditModal from './components/EditModal.vue'
import ConfigModal from './components/ConfigModal.vue'
import CharacterList from './components/CharacterList.vue'
import { parseJsonl, extractContent, loadConfig, saveConfig, parseTimeBar, parseSummary, parseChoices, parseThinking } from './utils/parser.js'
import { t, toggleLang } from './utils/i18n.js'
import { checkServerMode, fetchChat } from './utils/api.js'

// 状态
const messages = ref([])
const filteredMessages = ref([])
const isLoading = ref(false)
const loadingProgress = ref(0)
const loadingStatus = ref('')
const searchQuery = ref('')
const showSearch = ref(false)
const showConfig = ref(false)
const showMobileMenu = ref(false)
const showViewMenu = ref(false)
const editMessage = ref(null)
const fileInfo = ref(null)
const selectedMessage = ref(null)

// 服务器模式状态
const serverMode = ref(false)
const serverStatus = ref(null)
let sseConnection = null

// 布局状态（侧边栏与移动端抽屉）
const isMobile = ref(false)
const characterPanelVisible = ref(true)
const infoPanelVisible = ref(true)
const chapterPanelVisible = ref(true)
const activeDrawer = ref(null)

const LAYOUT_STORAGE_KEY = 'tv.layout.v1'

const drawerTitle = computed(() => {
  if (activeDrawer.value === 'character') return t('characterList') || '角色列表'
  if (activeDrawer.value === 'info') return '信息面板'
  if (activeDrawer.value === 'chapter') return '章节导航'
  return ''
})

const panelStatus = computed(() => {
  const opened = t('statusOpened') || '已展开'
  const collapsed = t('statusCollapsed') || '已收起'
  const openable = t('statusOpenable') || '可打开'

  if (isMobile.value) {
    return {
      character: activeDrawer.value === 'character' ? opened : openable,
      info: activeDrawer.value === 'info' ? opened : openable,
      chapter: activeDrawer.value === 'chapter' ? opened : openable
    }
  }

  return {
    character: characterPanelVisible.value ? opened : collapsed,
    info: infoPanelVisible.value ? opened : collapsed,
    chapter: chapterPanelVisible.value ? opened : collapsed
  }
})

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
    if (result.length > 0) {
      selectedMessage.value = { ...result[0], floor: 1 }
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
  closeMobileMenu()
  if (isMobile.value) {
    closeDrawer()
  }
}

function updateViewport() {
  const nextIsMobile = window.innerWidth <= 1024
  if (nextIsMobile !== isMobile.value) {
    isMobile.value = nextIsMobile
    if (!nextIsMobile) {
      activeDrawer.value = null
      showMobileMenu.value = false
    }
  }
}

function closeDrawer() {
  activeDrawer.value = null
  closeMobileMenu()
}

function toggleMobileMenu() {
  showViewMenu.value = false
  showMobileMenu.value = !showMobileMenu.value
}

function closeMobileMenu() {
  showMobileMenu.value = false
  showViewMenu.value = false
}

function toggleViewMenu() {
  showViewMenu.value = !showViewMenu.value
}

function resetLayout() {
  characterPanelVisible.value = true
  infoPanelVisible.value = true
  chapterPanelVisible.value = true
  activeDrawer.value = null
  closeMobileMenu()
}

function loadLayoutState() {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (typeof parsed.characterPanelVisible === 'boolean') {
      characterPanelVisible.value = parsed.characterPanelVisible
    }
    if (typeof parsed.infoPanelVisible === 'boolean') {
      infoPanelVisible.value = parsed.infoPanelVisible
    }
    if (typeof parsed.chapterPanelVisible === 'boolean') {
      chapterPanelVisible.value = parsed.chapterPanelVisible
    }
  } catch {
    // ignore invalid persisted layout data
  }
}

function persistLayoutState() {
  try {
    const data = {
      characterPanelVisible: characterPanelVisible.value,
      infoPanelVisible: infoPanelVisible.value,
      chapterPanelVisible: chapterPanelVisible.value
    }
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore storage errors
  }
}

function handleCharacterPanelAction() {
  closeMobileMenu()
  if (!serverMode.value) return
  if (isMobile.value) {
    activeDrawer.value = 'character'
    return
  }
  characterPanelVisible.value = !characterPanelVisible.value
}

function handleInfoPanelAction() {
  closeMobileMenu()
  if (!messages.value.length) return
  if (isMobile.value) {
    activeDrawer.value = 'info'
    return
  }
  infoPanelVisible.value = !infoPanelVisible.value
}

function handleChapterPanelAction() {
  closeMobileMenu()
  if (!messages.value.length) return
  if (isMobile.value) {
    activeDrawer.value = 'chapter'
    return
  }
  chapterPanelVisible.value = !chapterPanelVisible.value
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
  
  messages.value.forEach((msg, idx) => {
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

    if (result.length > 0) {
      selectedMessage.value = { ...result[0], floor: 1 }
    }

    loadingProgress.value = 100
    loadingStatus.value = '加载完成！'
    await new Promise(resolve => setTimeout(resolve, 200))

    if (isMobile.value) {
      closeDrawer()
    }

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
    closeDrawer()
    closeMobileMenu()
  }
}

onMounted(() => {
  loadLayoutState()
  updateViewport()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', updateViewport)
  detectServerMode()
})

watch([characterPanelVisible, infoPanelVisible, chapterPanelVisible], () => {
  persistLayoutState()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', updateViewport)
  if (sseConnection) {
    sseConnection.close()
  }
})
</script>

<template>
  <div class="app-container" @click="closeMobileMenu">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <div class="toolbar-left">
        <h1 class="logo">{{ t('appTitle') }}</h1>
        <span v-if="fileInfo" class="file-info">{{ fileInfo.name }} <template v-if="fileInfo.size">({{ fileInfo.size }})</template></span>
        <span v-if="serverMode" class="server-badge" :title="'Connected to ' + (serverStatus?.dataDir || 'server')">🟢 {{ t('serverMode') || '服务器模式' }}</span>
      </div>
      
      <div class="toolbar-right" @click.stop>
        <button
          v-if="serverMode && !isMobile"
          class="btn btn-panel"
          @click="handleCharacterPanelAction"
          :title="isMobile ? '打开角色列表' : (characterPanelVisible ? '收起角色列表' : '展开角色列表')"
        >
          {{ isMobile ? '👥' : (characterPanelVisible ? '👥◀' : '👥▶') }}
        </button>

        <button
          v-if="messages.length && !isMobile"
          class="btn btn-panel"
          @click="handleInfoPanelAction"
          :title="isMobile ? '打开信息面板' : (infoPanelVisible ? '收起信息面板' : '展开信息面板')"
        >
          {{ isMobile ? 'ℹ️' : (infoPanelVisible ? 'ℹ️◀' : 'ℹ️▶') }}
        </button>

        <button
          v-if="messages.length && !isMobile"
          class="btn btn-panel"
          @click="handleChapterPanelAction"
          :title="isMobile ? '打开章节导航' : (chapterPanelVisible ? '收起章节导航' : '展开章节导航')"
        >
          {{ isMobile ? '📑' : (chapterPanelVisible ? '📑◀' : '📑▶') }}
        </button>

        <button class="btn btn-lang" @click="toggleLang" title="Switch Language / 言語切替">
          {{ isMobile ? '🌐' : t('langBtn') }}
        </button>
        
        <label class="btn btn-primary" :title="t('importBtn')">
          {{ isMobile ? '📁' : t('importBtn') }}
          <input type="file" accept=".jsonl,.json" @change="handleFileUpload" hidden>
        </label>
        
        <button v-if="messages.length && !isMobile" class="btn" @click="showSearch = !showSearch">
          {{ t('searchBtn') }}
        </button>
        
        <button v-if="!isMobile" class="btn" @click="showConfig = true">
          {{ t('configBtn') }}
        </button>
        
        <button v-if="messages.length && !isMobile" class="btn" @click="exportMarkdown">
          {{ t('exportMD') }}
        </button>
        
        <button v-if="messages.length && !isMobile" class="btn" @click="exportJson">
          {{ t('exportJSON') }}
        </button>

        <div v-if="isMobile" class="mobile-menu-wrap">
          <button class="btn btn-panel" @click="toggleMobileMenu" :title="t('more') || '更多'">⋯</button>
          <div v-if="showMobileMenu" class="mobile-menu">
            <button class="menu-item" @click="toggleViewMenu">
              {{ t('viewSettings') || '视图设置' }}
            </button>
            <div v-if="showViewMenu" class="menu-subgroup">
              <button
                v-if="serverMode"
                class="menu-sub-item"
                @click="handleCharacterPanelAction"
              >
                <span>{{ t('panelCharacter') || '角色列表' }}</span>
                <span class="menu-state">{{ panelStatus.character }}</span>
              </button>
              <button
                v-if="messages.length"
                class="menu-sub-item"
                @click="handleInfoPanelAction"
              >
                <span>{{ t('panelInfo') || '信息面板' }}</span>
                <span class="menu-state">{{ panelStatus.info }}</span>
              </button>
              <button
                v-if="messages.length"
                class="menu-sub-item"
                @click="handleChapterPanelAction"
              >
                <span>{{ t('panelChapter') || '章节导航' }}</span>
                <span class="menu-state">{{ panelStatus.chapter }}</span>
              </button>
              <button class="menu-sub-item menu-sub-item-reset" @click="resetLayout">
                <span>{{ t('resetLayout') || '重置布局' }}</span>
              </button>
            </div>
            <button v-if="messages.length" class="menu-item" @click="showSearch = !showSearch; closeMobileMenu()">{{ t('searchBtn') }}</button>
            <button class="menu-item" @click="showConfig = true; closeMobileMenu()">{{ t('configBtn') }}</button>
            <button v-if="messages.length" class="menu-item" @click="exportMarkdown(); closeMobileMenu()">{{ t('exportMD') }}</button>
            <button v-if="messages.length" class="menu-item" @click="exportJson(); closeMobileMenu()">{{ t('exportJSON') }}</button>
          </div>
        </div>
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
      @close="showSearch = false; closeMobileMenu()"
    />
    
    <!-- 主内容区 -->
    <main class="main-content" :class="{ mobile: isMobile }">
      <!-- 左侧：角色列表（桌面） -->
      <div
        v-if="!isMobile && serverMode"
        class="sidebar-slot character-slot"
        :class="{ collapsed: !characterPanelVisible }"
      >
        <CharacterList @load-chat="loadFromServer" />
      </div>

      <!-- 左侧：信息面板（桌面） -->
      <div
        v-if="!isMobile && messages.length"
        class="sidebar-slot info-slot"
        :class="{ collapsed: !infoPanelVisible }"
      >
        <InfoPanel :message="selectedMessage" :stats="stats" />
      </div>
      
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
      
      <!-- 右侧章节导航（桌面） -->
      <div
        v-if="!isMobile && messages.length"
        class="sidebar-slot chapter-slot"
        :class="{ collapsed: !chapterPanelVisible }"
      >
        <ChapterPanel :messages="messages" @jump-to="jumpToFloor" />
      </div>
    </main>

    <!-- 移动端抽屉 -->
    <div v-if="isMobile && activeDrawer" class="drawer-overlay" @click="closeDrawer">
      <aside class="mobile-drawer" :class="{ right: activeDrawer === 'chapter' }" @click.stop>
        <div class="drawer-header">
          <h3>{{ drawerTitle }}</h3>
          <button class="btn drawer-close" @click="closeDrawer">✕</button>
        </div>

        <div class="drawer-body">
          <CharacterList
            v-if="activeDrawer === 'character' && serverMode"
            @load-chat="loadFromServer"
          />
          <InfoPanel
            v-else-if="activeDrawer === 'info' && messages.length"
            :message="selectedMessage"
            :stats="stats"
          />
          <ChapterPanel
            v-else-if="activeDrawer === 'chapter' && messages.length"
            :messages="messages"
            @jump-to="jumpToFloor"
          />
        </div>
      </aside>
    </div>
    
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
  width: 100%;
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
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
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

.btn-panel {
  min-width: 52px;
  padding: 8px 10px;
}

.mobile-menu-wrap {
  position: relative;
}

.mobile-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 150px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  z-index: 250;
}

.menu-item {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--text-primary);
  padding: 10px 12px;
  font-size: 0.85rem;
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-subgroup {
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.menu-sub-item {
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  padding: 9px 16px;
  font-size: 0.82rem;
}

.menu-sub-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.menu-sub-item-reset {
  color: var(--text-primary);
  border-top: 1px dashed var(--border-color);
}

.menu-state {
  font-size: 0.75rem;
  opacity: 0.8;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

.sidebar-slot {
  transition: width 0.2s ease, min-width 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
  opacity: 1;
}

.character-slot {
  width: 300px;
  min-width: 300px;
}

.info-slot {
  width: 320px;
  min-width: 320px;
}

.chapter-slot {
  width: 280px;
  min-width: 280px;
}

.sidebar-slot.collapsed {
  width: 0;
  min-width: 0;
  opacity: 0;
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

.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1100;
}

.mobile-drawer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: min(92vw, 380px);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  animation: drawerIn 0.2s ease;
}

.mobile-drawer.right {
  left: auto;
  right: 0;
  border-right: none;
  border-left: 1px solid var(--border-color);
  animation: drawerInRight 0.2s ease;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
}

.drawer-header h3 {
  margin: 0;
  font-size: 0.95rem;
}

.drawer-close {
  padding: 6px 10px;
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

@keyframes drawerIn {
  from {
    transform: translateX(-12px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes drawerInRight {
  from {
    transform: translateX(12px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 1024px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px 12px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
  }

  .toolbar-left {
    gap: 10px;
    flex-wrap: wrap;
  }

  .toolbar-right {
    justify-content: flex-start;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }

  .toolbar-right::-webkit-scrollbar {
    height: 4px;
  }

  .btn {
    padding: 8px 12px;
    font-size: 0.85rem;
  }

  .btn-panel {
    min-width: 42px;
    padding: 8px;
  }

  .logo {
    font-size: 1rem;
  }

  .file-info {
    font-size: 0.78rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .main-content.mobile {
    display: block;
  }

  .message-area {
    width: 100%;
  }

  .mobile-drawer :deep(.character-list),
  .mobile-drawer :deep(.info-panel),
  .mobile-drawer :deep(.chapter-panel) {
    width: 100%;
    min-width: 0;
    height: 100%;
    border: none;
  }
}

@media (max-width: 480px) {
  .toolbar {
    padding: 8px 10px;
  }

  .toolbar-left {
    gap: 8px;
  }

  .server-badge {
    display: none;
  }

  .file-info {
    max-width: 65vw;
  }

  .btn {
    padding: 7px 10px;
    font-size: 0.8rem;
  }

  .btn-panel {
    min-width: 38px;
    padding: 7px;
  }

  .mobile-menu {
    min-width: 132px;
  }

  .loading-content {
    min-width: 0;
    width: calc(100vw - 24px);
    padding: 24px 16px;
  }

  .empty-state {
    min-height: 0;
    padding: 24px 14px;
  }

  .empty-icon {
    font-size: 3rem;
  }
}
</style>
