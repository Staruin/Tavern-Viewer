// Electron Preload Script
const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 打开文件对话框
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // 保存文件对话框
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  
  // 监听文件加载事件
  onFileLoaded: (callback) => {
    ipcRenderer.on('file-loaded', (event, data) => callback(data))
  },
  
  // 监听导出事件
  onExportMD: (callback) => {
    ipcRenderer.on('export-md', () => callback())
  },
  
  onExportJSON: (callback) => {
    ipcRenderer.on('export-json', () => callback())
  },
  
  // 监听搜索切换
  onToggleSearch: (callback) => {
    ipcRenderer.on('toggle-search', () => callback())
  },
  
  // 监听配置切换
  onToggleConfig: (callback) => {
    ipcRenderer.on('toggle-config', () => callback())
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// 通知渲染进程 Electron 已就绪
window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('electron-app')
})
