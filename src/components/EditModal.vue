<!--
  EditModal.vue - 消息编辑弹窗
  支持编辑解析后的显示内容和原始消息内容
-->
<script setup>
import { ref, watch } from 'vue'
import { t } from '../utils/i18n.js'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['save', 'close'])

const editedContent = ref('')
const editedMes = ref('')

// 初始化
watch(() => props.message, (msg) => {
  if (msg) {
    editedContent.value = msg.content || ''
    editedMes.value = msg.mes || ''
  }
}, { immediate: true })

function save() {
  emit('save', {
    ...props.message,
    content: editedContent.value,
    mes: editedMes.value
  })
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    emit('close')
  }
}
let isMouseDownOnModal = false

function handleMousedown(e) {
  if (e.target !== e.currentTarget) {
    isMouseDownOnModal = true
  }
}

function handleMouseup() {
  setTimeout(() => {
    isMouseDownOnModal = false
  }, 0)
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget && !isMouseDownOnModal) {
    emit('close')
  }
}
</script>

<template>
  <div class="modal-overlay" @mousedown="handleMousedown" @mouseup="handleMouseup" @click="handleOverlayClick" @keydown="handleKeydown">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ t('editMsg') }}</h3>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="info-bar">
          <span class="info-item">{{ t('floor') }}: #{{ message.floor || '?' }}</span>
          <span class="info-item">{{ t('role') }}: {{ message.name }}</span>
          <span class="info-item">{{ message.is_user ? t('user') : t('ai') }}</span>
        </div>
        
        <div class="edit-section">
          <label>显示内容 (解析后)</label>
          <textarea 
            v-model="editedContent"
            class="edit-textarea"
            rows="10"
            placeholder="显示内容..."
          ></textarea>
        </div>
        
        <div class="edit-section">
          <label>原始内容 (完整)</label>
          <textarea 
            v-model="editedMes"
            class="edit-textarea raw"
            rows="15"
            placeholder="原始内容..."
          ></textarea>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-cancel" @click="emit('close')">{{ t('cancel') }}</button>
        <button class="btn btn-save" @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
  will-change: opacity;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.info-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.info-item {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.edit-section {
  margin-bottom: 16px;
}

.edit-section label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.edit-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.edit-textarea:focus {
  outline: none;
  border-color: var(--accent-color);
}

.edit-textarea.raw {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.85rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background: var(--bg-hover);
}

.btn-save {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}

.btn-save:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .modal-overlay {
    align-items: flex-end;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  .modal-content {
    width: 100%;
    max-width: none;
    max-height: 92vh;
    border-radius: 16px 16px 0 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 14px;
    padding-right: 14px;
  }

  .info-bar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 10px;
  }

  .edit-textarea {
    font-size: 0.9rem;
  }

  .modal-footer {
    justify-content: stretch;
  }

  .btn {
    flex: 1;
    min-width: 0;
  }
}
</style>
