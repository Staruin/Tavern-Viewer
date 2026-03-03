<!--
  StatsPanel.vue - 统计信息浮层
  显示消息总数、用户/AI 消息数、字符统计
-->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

function formatNumber(num) {
  return num.toLocaleString('zh-CN')
}
</script>

<template>
  <div class="stats-panel">
    <div class="stats-header">
      <h3>📊 统计信息</h3>
      <button class="close-btn" @click="emit('close')">✕</button>
    </div>
    
    <div class="stats-body">
      <div class="stat-item">
        <span class="stat-label">总消息数</span>
        <span class="stat-value">{{ formatNumber(stats.total) }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">用户消息</span>
        <span class="stat-value user">{{ formatNumber(stats.userCount) }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">AI消息</span>
        <span class="stat-value ai">{{ formatNumber(stats.aiCount) }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">总字符数</span>
        <span class="stat-value">{{ formatNumber(stats.totalChars) }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">平均每条</span>
        <span class="stat-value">{{ formatNumber(stats.avgChars) }} 字</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-panel {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 300px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 200;
  animation: fadeIn 0.2s ease;
  will-change: transform, opacity;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.stats-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: var(--text-primary);
}

.stats-body {
  padding: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.stat-value {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.stat-value.user {
  color: #6366f1;
}

.stat-value.ai {
  color: #10b981;
}
</style>
