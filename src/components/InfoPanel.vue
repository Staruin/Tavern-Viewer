<!--
  InfoPanel.vue - 左侧信息面板
  显示全局统计概览、当前楼层详细信息（角色、时间、字数）、思维链、小总结、剧情选项
-->
<script setup>
import { computed } from 'vue'
import { t } from '../utils/i18n.js'

const props = defineProps({
  message: {
    type: Object,
    default: null
  },
  stats: {
    type: Object,
    default: null
  }
})

// 格式化时间
function formatTime(dateStr) {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return '未知时间'
  }
}

// 格式化数字
function formatNumber(num) {
  if (!num) return '0'
  return num.toLocaleString('zh-CN')
}

// 计算字数统计
const messageStats = computed(() => {
  if (!props.message) return null
  
  const content = props.message.content || ''
  const thinking = props.message.thinking || ''
  const summary = props.message.summary || ''
  
  return {
    contentChars: content.length,
    contentWords: content.split(/\s+/).filter(w => w).length,
    thinkingChars: thinking.length,
    summaryChars: summary.length,
    totalChars: content.length + thinking.length + summary.length
  }
})

// 渲染内容
function renderContent(content) {
  if (!content) return ''
  
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\n/g, '<br>')
  
  return html
}
</script>

<template>
  <aside class="info-panel">
    <!-- 滚动内容区 -->
    <div class="panel-scroll">
      <!-- 统计概览 -->
      <section class="panel-section" v-if="stats">
        <h3 class="section-title">
          <span class="section-icon">📊</span>
          {{ t('appTitle').replace('📚 ', '') }} 概览
        </h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ formatNumber(stats.total) }}</span>
            <span class="stat-label">{{ t('statsTotal') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value user">{{ formatNumber(stats.userCount) }}</span>
            <span class="stat-label">{{ t('statsUser') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value ai">{{ formatNumber(stats.aiCount) }}</span>
            <span class="stat-label">{{ t('statsAI') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ formatNumber(stats.totalChars) }}</span>
            <span class="stat-label">{{ t('statsChars') }}</span>
          </div>
          <div class="stat-item" v-if="stats.contentChars > 0">
            <span class="stat-value ai">{{ formatNumber(stats.contentChars) }}</span>
            <span class="stat-label">{{ t('contentAI') }}</span>
          </div>
          <div class="stat-item" v-if="stats.userContentChars > 0">
            <span class="stat-value user">{{ formatNumber(stats.userContentChars) }}</span>
            <span class="stat-label">{{ t('contentUser') }}</span>
          </div>
          <div class="stat-item" v-if="stats.thinkingChars > 0">
            <span class="stat-value thinking">{{ formatNumber(stats.thinkingChars) }}</span>
            <span class="stat-label">{{ t('thinking') }}</span>
          </div>
          <div class="stat-item" v-if="stats.summaryChars > 0">
            <span class="stat-value summary">{{ formatNumber(stats.summaryChars) }}</span>
            <span class="stat-label">{{ t('summary') }}</span>
          </div>
        </div>
      </section>
      
      <!-- 当前楼层信息 -->
      <section class="panel-section" v-if="message">
        <h3 class="section-title">
          <span class="section-icon">📄</span>
          {{ t('floor') }}
        </h3>
        
        <div class="floor-info">
          <div class="info-row">
            <span class="info-label">{{ t('floor') }}</span>
            <span class="info-value floor-badge">#{{ message.floor || 1 }}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">{{ t('role') }}</span>
            <span class="info-value" :class="message.is_user ? 'user-badge' : 'ai-badge'">
              {{ message.name }}
              <span class="role-tag">{{ message.is_user ? t('user') : t('ai') }}</span>
            </span>
          </div>
          
          <div class="info-row">
            <span class="info-label">时间</span>
            <span class="info-value time-value">{{ formatTime(message.send_date) }}</span>
          </div>
          
          <div class="info-row" v-if="message.timeBar">
            <span class="info-label">位置</span>
            <span class="info-value">📍 {{ message.timeBar }}</span>
          </div>
        </div>
        
        <!-- 本层统计 -->
        <div class="message-stats" v-if="messageStats">
          <div class="mini-stat">
            <span class="mini-label">正文</span>
            <span class="mini-value">{{ formatNumber(messageStats.contentChars) }} 字</span>
          </div>
          <div class="mini-stat" v-if="messageStats.thinkingChars > 0">
            <span class="mini-label">思维链</span>
            <span class="mini-value">{{ formatNumber(messageStats.thinkingChars) }} 字</span>
          </div>
          <div class="mini-stat" v-if="messageStats.summaryChars > 0">
            <span class="mini-label">小总结</span>
            <span class="mini-value">{{ formatNumber(messageStats.summaryChars) }} 字</span>
          </div>
        </div>
      </section>
      
      <!-- 用户输入 -->
      <section class="panel-section" v-if="message && message.is_user">
        <h3 class="section-title">
          <span class="section-icon">💬</span>
          {{ t('user') }}
        </h3>
        <div class="content-block user-input">
          <div class="content-text" v-html="renderContent(message.content)"></div>
        </div>
      </section>
      
      <!-- 思维链 -->
      <section class="panel-section" v-if="message && message.thinking && !message.is_user">
        <h3 class="section-title">
          <span class="section-icon">🧠</span>
          {{ t('thinking') }}
        </h3>
        <div class="content-block thinking-block">
          <div class="content-text" v-html="renderContent(message.thinking)"></div>
        </div>
      </section>
      
      <!-- 小总结 -->
      <section class="panel-section" v-if="message && message.summary">
        <h3 class="section-title">
          <span class="section-icon">📜</span>
          {{ t('summary') }}
        </h3>
        <div class="content-block summary-block">
          <div class="content-text" v-html="renderContent(message.summary)"></div>
        </div>
      </section>
      
      <!-- 剧情选项 -->
      <section class="panel-section" v-if="message && message.choices && message.choices.length">
        <h3 class="section-title">
          <span class="section-icon">🎲</span>
          {{ t('choice') }}
        </h3>
        <div class="choices-list">
          <div 
            v-for="(choice, idx) in message.choices" 
            :key="idx"
            class="choice-card"
          >
            <div class="choice-number">{{ idx + 1 }}</div>
            <div class="choice-content">
              <div class="choice-text">{{ choice.text }}</div>
              <div class="choice-desc">{{ choice.desc }}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
    
    <!-- 空状态 -->
    <div class="empty-state" v-if="!message">
      <div class="empty-icon">👈</div>
      <p>点击右侧消息查看详情</p>
      <p class="empty-hint">可选择任意楼层查看完整信息</p>
    </div>
  </aside>
</template>

<style scoped>
.info-panel {
  width: 320px;
  min-width: 320px;
  height: 100%;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.panel-section {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.section-icon {
  font-size: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value.user {
  color: #6366f1;
}

.stat-value.ai {
  color: #10b981;
}

.stat-value.thinking {
  color: #f59e0b;
}

.stat-value.summary {
  color: #06b6d4;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.floor-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.info-value {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 500;
}

.floor-badge {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
}

.user-badge {
  color: #6366f1;
}

.ai-badge {
  color: #10b981;
}

.role-tag {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.time-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
}

.message-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 0.8rem;
}

.mini-label {
  color: var(--text-secondary);
}

.mini-value {
  color: var(--text-primary);
  font-weight: 500;
}

.content-block {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.content-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-word;
}

.content-text :deep(code) {
  background: var(--bg-secondary);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.85em;
}

.user-input {
  border-left: 3px solid #6366f1;
}

.thinking-block {
  border-left: 3px solid #f59e0b;
  max-height: 300px;
}

.summary-block {
  border-left: 3px solid #10b981;
}

.choices-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice-card {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  cursor: pointer;
}

.choice-card:hover {
  border-color: var(--accent-color);
  background: var(--bg-hover);
}

.choice-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 50%;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
}

.choice-content {
  flex: 1;
  min-width: 0;
}

.choice-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 500;
}

.choice-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 4px 0;
}

.empty-hint {
  font-size: 0.85rem;
  opacity: 0.7;
}

.panel-scroll::-webkit-scrollbar {
  width: 6px;
}

.panel-scroll::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

.panel-scroll::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}
</style>
