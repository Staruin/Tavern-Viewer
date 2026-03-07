<!--
  SearchPanel.vue - 搜索与替换面板
  支持全文搜索、正则表达式搜索、批量替换
-->
<script setup>
import { ref, computed } from 'vue'
import { t } from '../utils/i18n.js'

const emit = defineEmits(['search', 'replace', 'close'])

const searchQuery = ref('')
const replaceText = ref('')
const useRegex = ref(false)
const caseSensitive = ref(false)

// 执行搜索
function doSearch() {
  emit('search', searchQuery.value)
}

// 执行替换
function doReplace() {
  if (!searchQuery.value) return
  emit('replace', searchQuery.value, replaceText.value, useRegex.value)
}

// 全部替换
function doReplaceAll() {
  doReplace()
}

// 快捷键
function handleKeydown(e) {
  if (e.key === 'Enter') {
    doSearch()
  } else if (e.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <div class="search-panel" @keydown="handleKeydown">
    <div class="search-header">
      <h3>{{ t('searchTitle') }}</h3>
      <button class="close-btn" @click="emit('close')">✕</button>
    </div>
    
    <div class="search-body">
      <div class="search-row">
        <div class="input-group">
          <input 
            v-model="searchQuery"
            type="text"
            :placeholder="t('searchPlace')"
            class="search-input"
          >
          <button class="search-btn" @click="doSearch">{{ t('search') }}</button>
        </div>
      </div>
      
      <div class="search-row">
        <div class="input-group">
          <input 
            v-model="replaceText"
            type="text"
            :placeholder="t('replacePlace')"
            class="replace-input"
          >
          <button class="replace-btn" @click="doReplace">{{ t('replace') }}</button>
        </div>
      </div>
      
      <div class="search-options">
        <label class="option">
          <input type="checkbox" v-model="useRegex">
          <span>正则表达式</span>
        </label>
        <label class="option">
          <input type="checkbox" v-model="caseSensitive">
          <span>区分大小写</span>
        </label>
      </div>
      
      <div class="search-hint">
        <p>💡 快捷键: <kbd>Ctrl+F</kbd> 打开搜索, <kbd>Esc</kbd> 关闭</p>
        <p v-if="useRegex">⚠️ 正则表达式模式已启用</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-panel {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 400px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 200;
  animation: slideIn 0.2s ease;
  will-change: transform, opacity;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.search-header h3 {
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

.search-body {
  padding: 16px;
}

.search-row {
  margin-bottom: 12px;
}

.input-group {
  display: flex;
  gap: 8px;
}

.search-input,
.replace-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.search-input:focus,
.replace-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.search-btn,
.replace-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.search-btn {
  background: var(--accent-color);
  color: white;
}

.search-btn:hover {
  opacity: 0.9;
}

.replace-btn {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.replace-btn:hover {
  background: var(--bg-hover);
}

.search-options {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.option input[type="checkbox"] {
  accent-color: var(--accent-color);
}

.search-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  opacity: 0.8;
}

.search-hint p {
  margin: 4px 0;
}

.search-hint kbd {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

@media (max-width: 768px) {
  .search-panel {
    top: auto;
    right: 10px;
    left: 10px;
    bottom: 10px;
    width: auto;
    max-height: 70vh;
    overflow-y: auto;
  }

  .input-group {
    flex-direction: column;
  }

  .search-btn,
  .replace-btn {
    width: 100%;
  }

  .search-options {
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>
