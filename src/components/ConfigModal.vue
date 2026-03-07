<!--
  ConfigModal.vue - 正则配置弹窗
  管理消息解析规则：标签模式/正则模式切换、SillyTavern 预设导入、显示替换规则
-->
<script setup>
import { ref, computed } from 'vue'
import { t } from '../utils/i18n.js'
import { defaultConfig, parseSillyTavernRegex, convertRegexToConfig, applyRegexToConfig } from '../utils/parser.js'

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['save', 'close', 'import', 'export'])

// 本地编辑状态
const localConfig = ref(JSON.parse(JSON.stringify(props.config)))

// 导入预览状态
const importPreview = ref(null)
const importStep = ref('idle')

// 当前活动 tab
const activeTab = ref('import')

// 预设模板（通用示例，不包含任何第三方版权内容）
const presets = [
  {
    name: 'XML标签模式',
    config: {
      userInputPattern: '',
      recallPattern: '',
      thinkingPattern: '<thinking>([\\s\\S]*?)</thinking>',
      contentPattern: '<content>([\\s\\S]*?)</content>',
      summaryPattern: '<summary>([\\s\\S]*?)</summary>',
      choicePattern: '<choice>([\\s\\S]*?)</choice>',
      timeBarPattern: '',
      displayRules: []
    }
  },
  {
    name: '通用 JSONL',
    config: {
      userInputPattern: '',
      recallPattern: '',
      thinkingPattern: '',
      contentPattern: '',
      summaryPattern: '',
      choicePattern: '',
      timeBarPattern: '',
      displayRules: []
    }
  }
]

const selectedPreset = ref(null)

// 正则规则输入模式: 'regex' | 'tag'
const ruleMode = ref('tag')

// 懒人标签输入状态
const tagInputs = ref({
  userInputPattern: { open: '', close: '' },
  recallPattern: { open: '', close: '' },
  thinkingPattern: { open: '', close: '' },
  contentPattern: { open: '', close: '' },
  summaryPattern: { open: '', close: '' },
  choicePattern: { open: '', close: '' },
  timeBarPattern: { open: '', close: '' }
})

// 初始化：从当前 pattern 反推 tag
initTagInputs()

function initTagInputs() {
  const fields = Object.keys(tagInputs.value)
  for (const field of fields) {
    const pattern = localConfig.value[field] || ''
    const parsed = parseTagsFromPattern(pattern)
    if (parsed) {
      tagInputs.value[field] = parsed
    }
  }
}

function parseTagsFromPattern(pattern) {
  if (!pattern) return { open: '', close: '' }
  const m = pattern.match(/^(.+?)\(\[\\s\\S\]\*\?\)(.+)$/s)
  if (m) {
    let open = m[1].replace(/\\(.)/g, '$1')
    let close = m[2].replace(/\\(.)/g, '$1')
    return { open, close }
  }
  return null
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function handleOpenTagInput(field) {
  const tag = tagInputs.value[field]
  
  // 自动补全闭合标签逻辑
  if (tag.open && !tag.close) {
    // 匹配类似 <div ...> 或 <tagName> 的纯XML/HTML起始标签
    const match = tag.open.match(/^<([a-zA-Z0-9_\\-]+)[^>]*>$/)
    if (match) {
      tag.close = `</${match[1]}>`
    }
  }
  
  generateFromTags(field)
}

function generateFromTags(field) {
  const tag = tagInputs.value[field]
  if (!tag.open && !tag.close) {
    localConfig.value[field] = ''
    return
  }
  const open = escapeRegex(tag.open)
  const close = escapeRegex(tag.close)
  localConfig.value[field] = `${open}([\\s\\S]*?)${close}`
}

const fieldLabels = computed(() => ({
  thinkingPattern: t('thinkingPattern'),
  summaryPattern: t('summaryPattern'),
  userInputPattern: t('userInputPattern'),
  timeBarPattern: t('timeBarPattern'),
  recallPattern: t('recallPattern'),
  contentPattern: t('contentPattern'),
  choicePattern: t('choicePattern')
}))

const ruleFields = computed(() => [
  { field: 'userInputPattern', name: t('userInputPattern'), desc: t('userInputDesc'), placeholder: '<本轮用户输入>', placeholderClose: '</本轮用户输入>' },
  { field: 'recallPattern', name: t('recallPattern'), desc: t('recallDesc'), placeholder: '<recall>', placeholderClose: '</recall>' },
  { field: 'thinkingPattern', name: t('thinkingPattern'), desc: t('thinkingDesc'), placeholder: '<thinking>', placeholderClose: '</thinking>' },
  { field: 'contentPattern', name: t('contentPattern'), desc: t('contentDesc'), placeholder: '<content>', placeholderClose: '</content>' },
  { field: 'summaryPattern', name: t('summaryPattern'), desc: t('summaryDesc'), placeholder: '<summary>', placeholderClose: '</summary>' },
  { field: 'choicePattern', name: t('choicePattern'), desc: t('choiceDesc'), placeholder: '<choice>', placeholderClose: '</choice>' },
  { field: 'timeBarPattern', name: t('timeBarPattern'), desc: t('timeBarDesc'), placeholder: '```', placeholderClose: '```' }
])

function applyPreset(preset) {
  if (confirm(`确定要应用 "${preset.name}" 吗？当前配置将被覆盖。`)) {
    localConfig.value = JSON.parse(JSON.stringify(preset.config))
    selectedPreset.value = preset.name
  }
}

function saveConfig() {
  emit('save', localConfig.value)
}

function handlePresetImport(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const jsonData = JSON.parse(e.target.result)
      const rules = parseSillyTavernRegex(jsonData)
      if (rules.length === 0) {
        alert('未在此文件中找到正则规则。\n\n支持的格式：\n• SillyTavern 预设文件 (.json)\n• 独立正则导出文件 (.json)')
        return
      }
      const conversion = convertRegexToConfig(rules)
      importPreview.value = {
        ...conversion,
        fileName: file.name,
        totalExtracted: rules.length,
        totalDisplay: Object.keys(conversion.matchedRules).length + conversion.unmatchedRules.length
      }
      importStep.value = 'preview'
    } catch (err) {
      alert('文件解析失败：' + err.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

function applyImport() {
  if (!importPreview.value) return
  localConfig.value = applyRegexToConfig(importPreview.value, localConfig.value)
  importStep.value = 'done'
  setTimeout(() => {
    importStep.value = 'idle'
    importPreview.value = null
    activeTab.value = 'rules'
  }, 1500)
}

function cancelImport() {
  importStep.value = 'idle'
  importPreview.value = null
}

function importConfig(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target.result)
      localConfig.value = { ...localConfig.value, ...config }
      alert('配置导入成功！')
    } catch (err) {
      alert('配置文件格式错误：' + err.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

function exportConfig() {
  const configStr = JSON.stringify(localConfig.value, null, 2)
  const blob = new Blob([configStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tavern-viewer-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

function resetConfig() {
  if (confirm('确定要重置为默认配置吗？')) {
    localConfig.value = JSON.parse(JSON.stringify(defaultConfig))
  }
}

function toggleDisplayRule(index) {
  localConfig.value.displayRules[index].disabled = !localConfig.value.displayRules[index].disabled
}

function removeDisplayRule(index) {
  localConfig.value.displayRules.splice(index, 1)
}

function truncateRegex(regex, maxLen = 60) {
  if (!regex) return ''
  if (regex.length <= maxLen) return regex
  return regex.substring(0, maxLen) + '...'
}

</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content config-modal">
      <div class="modal-header">
        <h3>{{ t('configBtn') }}</h3>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>
      
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'import' }" @click="activeTab = 'import'">📥 {{ t('tabImport') }}</button>
        <button class="tab-btn" :class="{ active: activeTab === 'rules' }" @click="activeTab = 'rules'">🔧 {{ t('tabRules') }}</button>
        <button class="tab-btn" :class="{ active: activeTab === 'display' }" @click="activeTab = 'display'">
          🎨 {{ t('tabDisplay') }}
          <span v-if="localConfig.displayRules && localConfig.displayRules.length" class="badge">{{ localConfig.displayRules.length }}</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Tab 1: 导入预设 -->
        <div v-show="activeTab === 'import'">
          <section class="config-section">
            <h4>📦 导入酒馆预设/正则</h4>
            <p class="section-hint">从 SillyTavern 预设文件或独立正则文件中自动提取正则规则，更新当前配置。</p>
            
            <div class="import-area" v-if="importStep === 'idle'">
              <label class="import-drop-zone">
                <span class="drop-icon">📂</span>
                <span class="drop-text">点击选择预设或正则文件</span>
                <span class="drop-hint">支持 SillyTavern 预设(.json) / 正则导出(.json)</span>
                <input type="file" accept=".json" @change="handlePresetImport" hidden>
              </label>
            </div>
            
            <div class="import-preview" v-if="importStep === 'preview' && importPreview">
              <div class="preview-header">
                <span class="preview-file">📄 {{ importPreview.fileName }}</span>
                <span class="preview-stats">提取 {{ importPreview.totalExtracted }} 条规则，{{ importPreview.totalDisplay }} 条与显示相关</span>
              </div>
              <div class="preview-section" v-if="Object.keys(importPreview.matchedRules).length">
                <h5>✅ 自动匹配到配置字段 ({{ Object.keys(importPreview.matchedRules).length }})</h5>
                <div class="preview-rule" v-for="(data, field) in importPreview.matchedRules" :key="field">
                  <span class="preview-rule-field">{{ fieldLabels[field] || field }}</span>
                  <span class="preview-rule-arrow">←</span>
                  <span class="preview-rule-name">{{ data.rule.scriptName }}</span>
                  <code class="preview-rule-pattern">{{ truncateRegex(data.pattern) }}</code>
                </div>
              </div>
              <div class="preview-section" v-if="importPreview.unmatchedRules.length">
                <h5>📋 加入显示替换规则 ({{ importPreview.unmatchedRules.length }})</h5>
                <div class="preview-rule" v-for="(rule, i) in importPreview.unmatchedRules" :key="i">
                  <span class="preview-rule-name">{{ rule.scriptName }}</span>
                  <code class="preview-rule-pattern">{{ truncateRegex(rule.findRegex) }}</code>
                  <span class="preview-rule-replace" v-if="rule.replaceString">→ {{ truncateRegex(rule.replaceString, 30) }}</span>
                </div>
              </div>
              <div class="preview-actions">
                <button class="btn btn-cancel" @click="cancelImport">取消</button>
                <button class="btn btn-primary" @click="applyImport">✅ 应用这些规则</button>
              </div>
            </div>
            
            <div class="import-success" v-if="importStep === 'done'">
              <span class="success-icon">🎉</span>
              <span>导入成功！正则规则已更新。</span>
            </div>
          </section>
          
          <section class="config-section">
            <h4>📋 内置预设模板</h4>
            <div class="preset-list">
              <button v-for="preset in presets" :key="preset.name" class="preset-btn" :class="{ active: selectedPreset === preset.name }" @click="applyPreset(preset)">{{ preset.name }}</button>
            </div>
          </section>
          
          <section class="config-section">
            <h4>🛠️ 工具</h4>
            <div class="import-export">
              <label class="btn btn-secondary">📥 导入配置文件<input type="file" accept=".json" @change="importConfig" hidden></label>
              <button class="btn btn-secondary" @click="exportConfig">📤 导出配置</button>
              <button class="btn btn-danger" @click="resetConfig">🔄 重置默认</button>
            </div>
          </section>
        </div>

        <!-- Tab 2: 正则规则 -->
        <div v-show="activeTab === 'rules'">
          <section class="config-section">
            <div class="mode-toggle">
              <button class="mode-btn" :class="{ active: ruleMode === 'tag' }" @click="ruleMode = 'tag'">{{ t('modeTag') }}</button>
              <button class="mode-btn" :class="{ active: ruleMode === 'regex' }" @click="ruleMode = 'regex'">{{ t('modeRegex') }}</button>
            </div>
            
            <p class="section-hint" v-if="ruleMode === 'tag'" v-html="t('hintTag')"></p>
            <p class="section-hint" v-else v-html="t('hintRegex')"></p>
            
            <div class="rule-list">
              <div class="rule-item" v-for="rf in ruleFields" :key="rf.field">
                <label>
                  <span class="rule-name">{{ rf.name }}</span>
                  <span class="rule-desc">{{ rf.desc }}</span>
                </label>
                
                <div v-if="ruleMode === 'tag'" class="tag-input-row">
                  <input v-model="tagInputs[rf.field].open" type="text" class="rule-input tag-input" :placeholder="rf.placeholder" @input="handleOpenTagInput(rf.field)">
                  <span class="tag-separator">… 内容 …</span>
                  <input v-model="tagInputs[rf.field].close" type="text" class="rule-input tag-input" :placeholder="rf.placeholderClose" @input="generateFromTags(rf.field)">
                </div>
                
                <input v-else v-model="localConfig[rf.field]" type="text" class="rule-input" :placeholder="rf.placeholder + '([\\s\\S]*?)' + rf.placeholderClose">
                
                <div v-if="ruleMode === 'tag' && localConfig[rf.field]" class="generated-preview">
                  <code>{{ localConfig[rf.field] }}</code>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Tab 3: 显示替换规则 -->
        <div v-show="activeTab === 'display'">
          <section class="config-section">
            <p class="section-hint" v-html="t('displayRulesHint')"></p>
            
            <div v-if="!localConfig.displayRules || localConfig.displayRules.length === 0" class="empty-rules">
              <span class="empty-icon">📭</span>
              <p>{{ t('emptyRules') }}</p>
            </div>
            
            <div v-else class="display-rule-list">
              <div v-for="(rule, index) in localConfig.displayRules" :key="index" class="display-rule-item" :class="{ disabled: rule.disabled }">
                <div class="display-rule-header">
                  <span class="display-rule-name">{{ rule.scriptName }}</span>
                  <div class="display-rule-actions">
                    <button class="icon-btn" :title="rule.disabled ? t('ruleEnabled') : t('ruleDisabled')" @click="toggleDisplayRule(index)">{{ rule.disabled ? '🔇' : '🔊' }}</button>
                    <button class="icon-btn danger" :title="t('deleteRule')" @click="removeDisplayRule(index)">🗑️</button>
                  </div>
                </div>
                <div class="display-rule-body">
                  <div class="display-rule-field">
                    <label>{{ t('ruleTarget') }}:</label>
                    <input v-model="localConfig.displayRules[index].findRegex" type="text" class="rule-input mono">
                  </div>
                  <div class="display-rule-field">
                    <label>{{ t('ruleReplace') }}:</label>
                    <input v-model="localConfig.displayRules[index].replaceString" type="text" class="rule-input mono">
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-cancel" @click="emit('close')">{{ t('cancel') }}</button>
        <button class="btn btn-primary" @click="saveConfig">💾 {{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
.config-modal { width: 92%; max-width: 760px; max-height: 88vh; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
.modal-header h3 { margin: 0; font-size: 1.1rem; color: var(--text-primary); }
.close-btn { background: none; border: none; font-size: 1.3rem; cursor: pointer; color: var(--text-secondary); transition: color 0.2s ease; }
.close-btn:hover { color: var(--text-primary); }

.tab-bar { display: flex; border-bottom: 1px solid var(--border-color); padding: 0 16px; gap: 4px; }
.tab-btn { padding: 10px 16px; border: none; background: none; color: var(--text-secondary); font-size: 0.9rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; }
.tab-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
.tab-btn.active { color: var(--accent-color); border-bottom-color: var(--accent-color); }
.badge { background: var(--accent-color); color: white; font-size: 0.7rem; padding: 1px 6px; border-radius: 10px; min-width: 18px; text-align: center; }

.modal-body { flex: 1; overflow-y: auto; padding: 20px; }
.config-section { margin-bottom: 24px; }
.config-section h4 { margin: 0 0 10px 0; font-size: 1rem; color: var(--text-primary); }
.section-hint { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px; }
.section-hint code { background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-family: monospace; }

.import-drop-zone { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 20px; border: 2px dashed var(--border-color); border-radius: 12px; cursor: pointer; transition: all 0.2s ease; background: var(--bg-tertiary); }
.import-drop-zone:hover { border-color: var(--accent-color); background: rgba(99,102,241,0.05); }
.drop-icon { font-size: 2rem; }
.drop-text { font-weight: 500; color: var(--text-primary); }
.drop-hint { font-size: 0.8rem; color: var(--text-secondary); }

.import-preview { border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; background: var(--bg-tertiary); }
.preview-header { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; background: rgba(99,102,241,0.1); border-bottom: 1px solid var(--border-color); }
.preview-file { font-weight: 600; color: var(--text-primary); }
.preview-stats { font-size: 0.85rem; color: var(--text-secondary); }
.preview-section { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
.preview-section h5 { margin: 0 0 8px 0; font-size: 0.9rem; color: var(--text-primary); }
.preview-rule { display: flex; align-items: center; gap: 8px; padding: 6px 0; flex-wrap: wrap; }
.preview-rule-field { font-weight: 500; color: var(--accent-color); font-size: 0.85rem; min-width: 65px; }
.preview-rule-arrow { color: var(--text-secondary); font-size: 0.8rem; }
.preview-rule-name { font-size: 0.85rem; color: var(--text-primary); }
.preview-rule-pattern { font-size: 0.75rem; background: var(--bg-secondary); padding: 2px 8px; border-radius: 4px; color: var(--text-secondary); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-rule-replace { font-size: 0.8rem; color: #22c55e; }
.preview-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; }

.import-success { display: flex; align-items: center; gap: 12px; padding: 20px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 12px; color: #22c55e; font-weight: 500; }
.success-icon { font-size: 1.5rem; }

.preset-list { display: flex; flex-wrap: wrap; gap: 8px; }
.preset-btn { padding: 8px 16px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer; font-size: 0.9rem; transition: all 0.15s ease; }
.preset-btn:hover { background: var(--bg-hover); border-color: var(--accent-color); }
.preset-btn.active { background: var(--accent-color); border-color: var(--accent-color); color: white; }
.import-export { display: flex; gap: 12px; flex-wrap: wrap; }

.btn { padding: 10px 16px; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.15s ease; }
.btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); }
.btn-secondary:hover { background: var(--bg-hover); }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-primary { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; }
.btn-primary:hover { opacity: 0.9; }
.btn-cancel { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); }
.btn-cancel:hover { background: var(--bg-hover); }

.mode-toggle { display: flex; gap: 4px; margin-bottom: 14px; background: var(--bg-tertiary); border-radius: 10px; padding: 3px; }
.mode-btn { flex: 1; padding: 8px 12px; border: none; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; }
.mode-btn:hover { color: var(--text-primary); }
.mode-btn.active { background: var(--accent-color); color: white; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }

.tag-input-row { display: flex; align-items: center; gap: 8px; }
.tag-input { flex: 1; min-width: 0; }
.tag-separator { font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; opacity: 0.7; flex-shrink: 0; }

.generated-preview { margin-top: 4px; }
.generated-preview code { font-size: 0.75rem; color: var(--text-secondary); background: var(--bg-tertiary); padding: 3px 8px; border-radius: 4px; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.7; }

.rule-list { display: flex; flex-direction: column; gap: 16px; }
.rule-item { display: flex; flex-direction: column; gap: 8px; }
.rule-item label { display: flex; flex-direction: column; gap: 2px; }
.rule-name { font-weight: 500; color: var(--text-primary); }
.rule-desc { font-size: 0.8rem; color: var(--text-secondary); }

.rule-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-tertiary); color: var(--text-primary); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; box-sizing: border-box; }
.rule-input:focus { outline: none; border-color: var(--accent-color); }
.rule-input::placeholder { color: var(--text-secondary); opacity: 0.5; }

.empty-rules { text-align: center; padding: 40px 20px; color: var(--text-secondary); }
.empty-icon { font-size: 2.5rem; display: block; margin-bottom: 8px; }
.empty-rules p { margin: 4px 0; }
.empty-hint { font-size: 0.8rem; opacity: 0.7; }

.display-rule-list { display: flex; flex-direction: column; gap: 12px; }
.display-rule-item { border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; transition: opacity 0.2s ease; }
.display-rule-item.disabled { opacity: 0.5; }
.display-rule-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); }
.display-rule-name { font-weight: 500; font-size: 0.9rem; color: var(--text-primary); }
.display-rule-actions { display: flex; gap: 4px; }

.icon-btn { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 4px 6px; border-radius: 6px; transition: background 0.15s ease; }
.icon-btn:hover { background: var(--bg-hover); }
.icon-btn.danger:hover { background: rgba(239,68,68,0.15); }

.display-rule-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
.display-rule-field { display: flex; align-items: center; gap: 8px; }
.display-rule-field label { font-size: 0.8rem; color: var(--text-secondary); min-width: 40px; flex-shrink: 0; }
.display-rule-field .rule-input.mono { font-size: 0.8rem; padding: 6px 10px; }

.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid var(--border-color); }

@media (max-width: 768px) {
  .modal-overlay { align-items: flex-end; }
  .config-modal {
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
  .modal-footer { padding-left: 14px; padding-right: 14px; }
  .tab-bar {
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: thin;
  }
  .tab-btn {
    flex: 0 0 auto;
    padding: 10px 12px;
  }
  .import-export { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .preview-actions,
  .modal-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .btn { width: 100%; }
  .display-rule-field { flex-direction: column; align-items: stretch; gap: 4px; }
  .display-rule-field label { min-width: 0; }
}
</style>
