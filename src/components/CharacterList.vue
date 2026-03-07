<!--
  CharacterList.vue - 角色与聊天记录列表组件
  服务器模式下替代手动文件上传，展示所有角色及其聊天记录
-->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { t } from '../utils/i18n.js'
import { fetchCharacters, fetchChatList, connectSSE } from '../utils/api.js'

const emit = defineEmits(['load-chat', 'status-change'])

// 数据状态
const characters = ref([])
const isLoading = ref(false)
const error = ref(null)
const searchQuery = ref('')

// 当前展开的角色
const expandedCharacter = ref(null)
const chatList = ref([])
const chatListLoading = ref(false)

// 当前选中的聊天
const selectedChat = ref(null)

// SSE 连接
let sseConnection = null
const hasNewChanges = ref(false)

// 过滤角色列表
const filteredCharacters = computed(() => {
  if (!searchQuery.value.trim()) return characters.value
  const q = searchQuery.value.toLowerCase()
  return characters.value.filter(c => c.name.toLowerCase().includes(q))
})

// 加载角色列表
async function loadCharacters() {
  isLoading.value = true
  error.value = null
  try {
    const data = await fetchCharacters()
    characters.value = data.characters || []
  } catch (e) {
    error.value = e.message
    console.error('Failed to load characters:', e)
  } finally {
    isLoading.value = false
  }
}

// 展开/收起角色
async function toggleCharacter(character) {
  if (expandedCharacter.value === character.name) {
    expandedCharacter.value = null
    chatList.value = []
    return
  }

  expandedCharacter.value = character.name
  chatListLoading.value = true

  try {
    const data = await fetchChatList(character.name)
    chatList.value = data.chats || []
  } catch (e) {
    console.error('Failed to load chat list:', e)
    chatList.value = []
  } finally {
    chatListLoading.value = false
  }
}

// 选中并加载聊天记录
function selectChat(character, chat) {
  selectedChat.value = `${character}/${chat.filename}`
  emit('load-chat', { character, filename: chat.filename, displayName: chat.displayName })
}

// 格式化时间
function formatTime(isoStr) {
  if (!isoStr) return ''
  const date = new Date(isoStr)
  const now = new Date()
  const diffMs = now - date
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 1) return '刚刚'
  if (diffHours < 24) return `${Math.floor(diffHours)} 小时前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 建立 SSE 连接
function setupSSE() {
  sseConnection = connectSSE((event) => {
    if (event.type === 'file-change') {
      hasNewChanges.value = true
      emit('status-change', event)

      // 如果变更的是当前展开的角色，自动刷新聊天列表
      if (event.character === expandedCharacter.value) {
        loadChatListForCharacter(event.character)
      }
    }
  })
}

async function loadChatListForCharacter(name) {
  try {
    const data = await fetchChatList(name)
    chatList.value = data.chats || []
  } catch (e) {
    // ignore
  }
}

// 刷新按钮
async function refresh() {
  hasNewChanges.value = false
  await loadCharacters()
  if (expandedCharacter.value) {
    await loadChatListForCharacter(expandedCharacter.value)
  }
}

onMounted(() => {
  loadCharacters()
  setupSSE()
})

onUnmounted(() => {
  if (sseConnection) {
    sseConnection.close()
  }
})
</script>

<template>
  <div class="character-list">
    <!-- 头部 -->
    <div class="list-header">
      <h2 class="list-title">
        <span class="title-icon">📂</span>
        {{ t('characterList') || '角色列表' }}
      </h2>
      <button class="refresh-btn" :class="{ 'has-changes': hasNewChanges }" @click="refresh" :title="t('refresh') || '刷新'">
        🔄
      </button>
    </div>

    <!-- 搜索 -->
    <div class="list-search">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="t('searchCharacter') || '搜索角色...'"
        class="search-input"
      >
    </div>

    <!-- 加载中 -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>{{ t('loading') || '加载中...' }}</p>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-state">
      <p class="error-icon">⚠️</p>
      <p class="error-text">{{ error }}</p>
      <button class="retry-btn" @click="loadCharacters">{{ t('retry') || '重试' }}</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="characters.length === 0" class="empty-state">
      <p class="empty-icon">📭</p>
      <p class="empty-text">{{ t('noCharacters') || '未找到聊天记录' }}</p>
      <p class="empty-hint">{{ t('noCharactersHint') || '请确认数据目录已正确映射' }}</p>
    </div>

    <!-- 角色列表 -->
    <div v-else class="characters-scroll">
      <div
        v-for="char in filteredCharacters"
        :key="char.name"
        class="character-group"
      >
        <!-- 角色卡片 -->
        <div
          class="character-card"
          :class="{ expanded: expandedCharacter === char.name }"
          @click="toggleCharacter(char)"
        >
          <div class="char-avatar">
            {{ char.name.charAt(0).toUpperCase() }}
          </div>
          <div class="char-info">
            <div class="char-name">{{ char.name }}</div>
            <div class="char-meta">
              <span class="chat-count">💬 {{ char.chatCount }}</span>
              <span class="last-time" v-if="char.lastModified">· {{ formatTime(char.lastModified) }}</span>
            </div>
          </div>
          <span class="expand-icon" :class="{ expanded: expandedCharacter === char.name }">▸</span>
        </div>

        <!-- 聊天记录列表 -->
        <div v-if="expandedCharacter === char.name" class="chat-list">
          <div v-if="chatListLoading" class="chat-list-loading">
            <div class="loading-spinner small"></div>
          </div>

          <div v-else-if="chatList.length === 0" class="chat-list-empty">
            暂无聊天记录
          </div>

          <div
            v-else
            v-for="chat in chatList"
            :key="chat.filename"
            class="chat-item"
            :class="{ selected: selectedChat === `${char.name}/${chat.filename}` }"
            @click.stop="selectChat(char.name, chat)"
          >
            <div class="chat-item-main">
              <div class="chat-name">{{ chat.displayName }}</div>
              <div class="chat-meta">
                <span>{{ chat.messageCount }} {{ t('messages') || '条消息' }}</span>
                <span>· {{ chat.sizeFormatted }}</span>
              </div>
            </div>
            <div class="chat-time">{{ formatTime(chat.lastModified) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部统计 -->
    <div class="list-footer" v-if="characters.length > 0">
      <span>{{ characters.length }} {{ t('characters') || '个角色' }}</span>
      <span class="dot">·</span>
      <span>{{ characters.reduce((sum, c) => sum + c.chatCount, 0) }} {{ t('totalChats') || '条聊天' }}</span>
    </div>
  </div>
</template>

<style scoped>
.character-list {
  width: 300px;
  min-width: 300px;
  height: 100%;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  touch-action: pan-y;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border-color);
}

.list-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 1.1rem;
}

.refresh-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  min-height: 36px;
}

.refresh-btn:hover {
  background: var(--bg-tertiary);
}

.refresh-btn.has-changes {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.list-search {
  padding: 12px 16px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

/* Loading, Error, Empty states */
.loading-state,
.error-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

.loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
  margin: 12px auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon, .empty-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.error-text, .empty-text {
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 0.8rem;
  opacity: 0.6;
}

.retry-btn {
  margin-top: 12px;
  padding: 6px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: var(--bg-hover);
}

/* Characters scroll */
.characters-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.character-group {
  margin-bottom: 2px;
}

.character-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  border-left: 3px solid transparent;
  min-height: 56px;
}

.character-card:hover {
  background: var(--bg-tertiary);
}

.character-card.expanded {
  background: var(--bg-tertiary);
  border-left-color: var(--accent-color);
}

.character-card:active {
  background: var(--bg-hover);
}

.char-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.char-info {
  flex: 1;
  min-width: 0;
}

.char-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.chat-count {
  font-variant-numeric: tabular-nums;
}

.expand-icon {
  font-size: 0.8rem;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

/* Chat list within a character */
.chat-list {
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.chat-list-loading,
.chat-list-empty {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.chat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 10px 28px;
  cursor: pointer;
  transition: all 0.15s ease;
  border-left: 2px solid transparent;
  min-height: 54px;
}

.chat-item:hover {
  background: var(--bg-secondary);
}

.chat-item.selected {
  background: var(--bg-secondary);
  border-left-color: #10b981;
}

.chat-item:active {
  background: var(--bg-hover);
}

.chat-item-main {
  flex: 1;
  min-width: 0;
}

.chat-name {
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.chat-time {
  font-size: 0.7rem;
  color: var(--text-secondary);
  white-space: nowrap;
  margin-left: 8px;
}

/* Footer */
.list-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--border-color);
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: center;
}

.dot {
  margin: 0 4px;
}

/* Scrollbar */
.characters-scroll::-webkit-scrollbar {
  width: 6px;
}

.characters-scroll::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

.characters-scroll::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

@media (max-width: 768px) {
  .list-header,
  .list-search,
  .list-footer {
    padding-left: 12px;
    padding-right: 12px;
  }

  .character-card {
    padding-left: 12px;
    padding-right: 12px;
  }

  .chat-item {
    padding-left: 24px;
    padding-right: 12px;
  }
}
</style>
