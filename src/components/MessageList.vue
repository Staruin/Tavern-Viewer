<!--
  MessageList.vue - 消息列表组件
  渲染聊天消息卡片，支持楼层跳转、消息选中、Markdown 渲染
  使用浏览器原生 content-visibility 实现大列表性能优化
-->
<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { t } from '../utils/i18n.js'

const props = defineProps({
  messages: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['edit', 'select-message'])

// 容器引用
const containerRef = ref(null)

// 当前选中的消息
const selectedMessage = ref(null)

// 跳转输入
const jumpInput = ref('')

// 格式化时间
function formatTime(dateStr) {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

// 渲染消息内容
function renderContent(content) {
  if (!content) return ''
  
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // Markdown 基础格式
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\n/g, '<br>')
  
  return html
}

// 跳转到指定楼层
function jumpToFloor(floor) {
  const index = floor - 1
  if (index < 0 || index >= props.messages.length) return
  
  const el = containerRef.value?.querySelector(`[data-index="${index}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'instant', block: 'start' })
    // 选中该消息
    const msg = props.messages[index]
    selectedMessage.value = msg
    emit('select-message', { ...msg, floor })
  }
}

function handleJumpInput() {
  const floor = parseInt(jumpInput.value)
  if (floor >= 1 && floor <= props.messages.length) {
    jumpToFloor(floor)
  }
}

// 点击消息
function handleClick(msg, index) {
  selectedMessage.value = msg
  emit('select-message', { ...msg, floor: index + 1 })
}

// 监听外部跳转事件
function onJumpEvent(e) {
  jumpToFloor(e.detail)
}

onMounted(() => {
  window.addEventListener('jump-to-floor', onJumpEvent)
})

onUnmounted(() => {
  window.removeEventListener('jump-to-floor', onJumpEvent)
})

// 消息列表变化时重置选中
watch(() => props.messages, () => {
  selectedMessage.value = null
  // 滚动回顶部
  nextTick(() => {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
    }
  })
})

defineExpose({ jumpToFloor })
</script>

<template>
  <div class="message-list-container">
    <!-- 快捷跳转 -->
    <div class="jump-bar">
      <span class="floor-count">{{ t('floor') }} {{ messages.length }}</span>
      <div class="jump-input">
        <input 
          v-model="jumpInput"
          type="number"
          :placeholder="t('floor')"
          min="1"
          :max="messages.length"
          @keyup.enter="handleJumpInput"
        >
        <button @click="handleJumpInput">跳转</button>
      </div>
    </div>
    
    <!-- 滚动容器 -->
    <div ref="containerRef" class="scroll-container">
      <div class="messages-list">
        <div 
          v-for="(msg, idx) in messages" 
          :key="msg.send_date + '-' + idx"
          :data-index="idx"
          class="message-card"
          :class="{ 
            'user-message': msg.is_user, 
            'ai-message': !msg.is_user,
            'selected': selectedMessage?.originalIndex === msg.originalIndex
          }"
          @click="handleClick(msg, idx)"
        >
          <!-- 消息头部 -->
          <div class="message-header">
            <div class="message-meta">
              <span class="floor-number">#{{ idx + 1 }}</span>
              <span class="message-name">{{ msg.name }}</span>
              <span class="message-time">{{ formatTime(msg.send_date) }}</span>
            </div>
            <button class="edit-btn" @click.stop="emit('edit', msg)" title="编辑">
              ✏️
            </button>
          </div>
          
          <!-- 时间栏 -->
          <div v-if="msg.timeBar" class="time-bar">
            📍 {{ msg.timeBar }}
          </div>
          
          <!-- 消息内容 -->
          <div class="message-body" v-html="renderContent(msg.content)"></div>
          
          <!-- 思维链 -->
          <details v-if="msg.thinking" class="thinking-block">
            <summary>{{ t('thinking') }}</summary>
            <div class="thinking-content" v-html="renderContent(msg.thinking)"></div>
          </details>
          
          <!-- 小总结 -->
          <details v-if="msg.summary" class="summary-block">
            <summary>{{ t('summary') }}</summary>
            <div class="summary-content" v-html="renderContent(msg.summary)"></div>
          </details>
          
          <!-- 剧情选项 -->
          <div v-if="msg.choices && msg.choices.length" class="choices-block">
            <div class="choices-label">{{ t('choice') }}</div>
            <div class="choices-list">
              <div 
                v-for="(choice, cidx) in msg.choices" 
                :key="cidx"
                class="choice-item"
              >
                <span class="choice-text">{{ choice.text }}</span>
                <span class="choice-desc">{{ choice.desc }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.jump-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.floor-count {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.jump-input {
  display: flex;
  gap: 8px;
}

.jump-input input {
  width: 100px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.jump-input button {
  padding: 6px 12px;
  background: var(--accent-color);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.jump-input button:hover {
  opacity: 0.9;
}

.scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.messages-list {
  padding: 8px 0;
}

/* 关键：浏览器原生懒渲染，屏幕外的消息不布局不绘制 */
.message-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 200px;
  margin: 16px auto;
  max-width: 900px;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.message-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.message-card.selected {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

.user-message {
  border-left: 4px solid #6366f1;
}

.ai-message {
  border-left: 4px solid #10b981;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.floor-number {
  font-size: 0.85rem;
  color: var(--accent-color);
  font-weight: 600;
}

.message-name {
  font-weight: 600;
  color: var(--text-primary);
}

.message-time {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s ease;
  font-size: 1rem;
  padding: 4px 8px;
}

.edit-btn:hover {
  opacity: 1;
}

.time-bar {
  padding: 8px 12px;
  margin-bottom: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.message-body {
  line-height: 1.8;
  color: var(--text-primary);
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
}

.message-body :deep(code) {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.9em;
}

.message-body :deep(pre) {
  background: var(--bg-tertiary);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.message-body :deep(pre code) {
  background: none;
  padding: 0;
}

.thinking-block,
.summary-block {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.thinking-block summary,
.summary-block summary {
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinking-block summary::before,
.summary-block summary::before {
  content: '▶';
  font-size: 0.7rem;
  transition: transform 0.2s ease;
}

.thinking-block[open] summary::before,
.summary-block[open] summary::before {
  transform: rotate(90deg);
}

.thinking-content,
.summary-content {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
}

.choices-block {
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.choices-label {
  font-weight: 500;
  color: var(--accent-color);
  margin-bottom: 8px;
}

.choices-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice-item {
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.choice-item:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
}

.choice-text {
  font-weight: 500;
  color: var(--text-primary);
}

.choice-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-left: 8px;
}

/* 滚动条 */
.scroll-container::-webkit-scrollbar {
  width: 8px;
}

.scroll-container::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

.scroll-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
