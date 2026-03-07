<!--
  ChapterPanel.vue - 右侧章节导航面板
  按 AI/用户消息分类展示，支持搜索过滤和快捷跳转（顶部/中间/底部）
-->
<script setup>
import { ref, computed } from 'vue'
import { t } from '../utils/i18n.js'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['jump-to'])

// 标签页状态：AI楼层 / 用户楼层
const activeTab = ref('ai')

// 搜索
const searchQuery = ref('')

// 当前选中的楼层
const selectedFloor = ref(0)

// AI 消息列表
const aiMessages = computed(() => {
  const list = []
  props.messages.forEach((msg, idx) => {
    if (msg.is_user) return

    const floorNumber = idx + 1 // 人类可读楼层号，从1开始
    const preview = (msg.content || msg.mes || '').substring(0, 60).replace(/\n/g, ' ')
    
    list.push({
      floor: floorNumber,
      arrayIndex: idx,
      name: msg.name || 'AI',
      preview: preview || '(空消息)',
      timeBar: msg.timeBar || null,
      hasSummary: !!msg.summary,
      hasThinking: !!msg.thinking
    })
  })
  return list
})

// 用户消息列表
const userMessages = computed(() => {
  const list = []
  props.messages.forEach((msg, idx) => {
    if (!msg.is_user) return

    const floorNumber = idx + 1 // 人类可读楼层号
    const preview = (msg.content || msg.mes || '').substring(0, 60).replace(/\n/g, ' ')

    list.push({
      floor: floorNumber,
      arrayIndex: idx,
      name: msg.name || '用户',
      preview: preview || '(空消息)'
    })
  })
  return list
})

// 搜索过滤
const filteredAiMessages = computed(() => {
  if (!searchQuery.value.trim()) return aiMessages.value
  const q = searchQuery.value.toLowerCase()
  return aiMessages.value.filter(m =>
    m.preview.toLowerCase().includes(q) ||
    m.name.toLowerCase().includes(q) ||
    (m.timeBar && m.timeBar.toLowerCase().includes(q))
  )
})

const filteredUserMessages = computed(() => {
  if (!searchQuery.value.trim()) return userMessages.value
  const q = searchQuery.value.toLowerCase()
  return userMessages.value.filter(m =>
    m.preview.toLowerCase().includes(q) ||
    m.name.toLowerCase().includes(q)
  )
})

// 点击跳转 - 传递的是楼层号（与 MessageList 的 #楼层 对应）
function jumpTo(floor) {
  selectedFloor.value = floor
  emit('jump-to', floor)
}

// 快捷跳转
function scrollToTop() {
  emit('jump-to', 1)
}
</script>

<template>
  <aside class="chapter-panel">
    <!-- 搜索 -->
    <div class="panel-search">
      <input 
        v-model="searchQuery"
        type="text"
        :placeholder="t('searchPlace')"
        class="search-input"
      >
    </div>
    
    <!-- 快捷操作 -->
    <div class="quick-actions">
      <button class="action-btn" @click="scrollToTop" title="回到顶部">
        ⬆️ Top
      </button>
      <button class="action-btn" @click="jumpTo(Math.max(1, Math.ceil(messages.length / 2)))" title="跳到中间">
        ⏺️ Mid
      </button>
      <button class="action-btn" @click="jumpTo(messages.length)" title="跳到底部">
        ⬇️ Bot
      </button>
    </div>
    
    <!-- 标签页 -->
    <div class="panel-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'ai' }"
        @click="activeTab = 'ai'"
      >
        🤖 {{ t('ai') }} ({{ aiMessages.length }})
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'user' }"
        @click="activeTab = 'user'"
      >
        👤 {{ t('user') }} ({{ userMessages.length }})
      </button>
    </div>
    
    <!-- AI 消息列表 -->
    <div v-show="activeTab === 'ai'" class="message-list">
      <div v-if="filteredAiMessages.length === 0" class="empty-state">
        <p v-if="searchQuery">未找到匹配的 AI 消息</p>
        <p v-else>暂无 AI 消息</p>
      </div>
      
      <div 
        v-for="msg in filteredAiMessages"
        :key="'ai-' + msg.floor"
        class="list-item ai-item"
        :class="{ active: selectedFloor === msg.floor }"
        @click="jumpTo(msg.floor)"
      >
        <div class="item-header">
          <span class="item-floor">#{{ msg.floor }}</span>
          <span class="item-name">{{ msg.name }}</span>
          <span class="item-badges">
            <span v-if="msg.timeBar" class="badge badge-time" :title="msg.timeBar">📍</span>
            <span v-if="msg.hasSummary" class="badge badge-summary">📜</span>
            <span v-if="msg.hasThinking" class="badge badge-thinking">🧠</span>
          </span>
        </div>
        <div v-if="msg.timeBar" class="item-timebar">{{ msg.timeBar }}</div>
        <div class="item-preview">{{ msg.preview }}</div>
      </div>
    </div>
    
    <!-- 用户消息列表 -->
    <div v-show="activeTab === 'user'" class="message-list">
      <div v-if="filteredUserMessages.length === 0" class="empty-state">
        <p v-if="searchQuery">未找到匹配的用户消息</p>
        <p v-else>暂无用户消息</p>
      </div>
      
      <div 
        v-for="msg in filteredUserMessages"
        :key="'user-' + msg.floor"
        class="list-item user-item"
        :class="{ active: selectedFloor === msg.floor }"
        @click="jumpTo(msg.floor)"
      >
        <div class="item-header">
          <span class="item-floor">#{{ msg.floor }}</span>
          <span class="item-name">{{ msg.name }}</span>
        </div>
        <div class="item-preview">{{ msg.preview }}</div>
      </div>
    </div>
    
    <!-- 底部统计 -->
    <div class="panel-footer">
      <span>🤖 {{ aiMessages.length }}</span>
      <span>👤 {{ userMessages.length }}</span>
      <span>共 {{ messages.length }} 层</span>
    </div>
  </aside>
</template>

<style scoped>
.chapter-panel {
  width: 280px;
  min-width: 280px;
  height: 100%;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  touch-action: pan-y;
}

.panel-search {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.quick-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}

.action-btn {
  flex: 1;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 36px;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
  border-bottom: 2px solid transparent;
  min-height: 40px;
}

.tab-btn:hover {
  background: var(--bg-tertiary);
}

.tab-btn.active {
  color: var(--accent-color);
  border-bottom-color: var(--accent-color);
}

.message-list {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.list-item {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 54px;
}

.list-item:hover {
  background: var(--bg-tertiary);
}

.list-item.active {
  background: rgba(139, 92, 246, 0.1);
  border-left: 3px solid var(--accent-color);
}

.list-item:active {
  background: var(--bg-hover);
}

.ai-item {
  border-left: 2px solid transparent;
}

.ai-item:not(.active) {
  border-left-color: #10b981;
}

.user-item {
  border-left: 2px solid transparent;
}

.user-item:not(.active) {
  border-left-color: #6366f1;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.item-floor {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent-color);
  min-width: 36px;
}

.item-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-badges {
  display: flex;
  gap: 2px;
  font-size: 0.75rem;
}

.badge {
  opacity: 0.7;
}

.item-timebar {
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding: 2px 8px;
  margin-bottom: 4px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-preview {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  border-top: 1px solid var(--border-color);
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* 滚动条 */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

.message-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

@media (max-width: 768px) {
  .panel-search,
  .quick-actions,
  .panel-footer {
    padding-left: 10px;
    padding-right: 10px;
  }

  .list-item {
    padding-left: 10px;
    padding-right: 10px;
  }
}
</style>
