const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: '酒馆聊天记录查看器',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true,
    backgroundColor: '#0f0f0f'
  })

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 创建菜单
  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        {
          label: '导入 JSONL',
          accelerator: 'CmdOrCtrl+O',
          click: () => openFileDialog()
        },
        { type: 'separator' },
        {
          label: '导出 Markdown',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow.webContents.send('export-md')
        },
        {
          label: '导出 JSON',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('export-json')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: '搜索',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('toggle-search')
        },
        {
          label: '配置',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('toggle-config')
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于酒馆查看器',
              message: '酒馆聊天记录查看器 v1.0.0',
              detail: '高性能聊天记录查看与管理工具\n支持 SillyTavern JSONL 格式\n支持自定义正则解析规则'
            })
          }
        }
      ]
    }
  ])
  
  Menu.setApplicationMenu(menu)
}

// 打开文件对话框
async function openFileDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择聊天记录文件',
    filters: [
      { name: 'JSONL 文件', extensions: ['jsonl'] },
      { name: 'JSON 文件', extensions: ['json'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      mainWindow.webContents.send('file-loaded', {
        path: filePath,
        name: path.basename(filePath),
        content: content
      })
    } catch (err) {
      dialog.showErrorBox('读取文件失败', err.message)
    }
  }
}

// 应用就绪
app.whenReady().then(() => {
  createWindow()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 关闭所有窗口时退出 (macOS 除外)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理
ipcMain.handle('open-file-dialog', openFileDialog)
ipcMain.handle('save-file-dialog', async (event, { defaultName, content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存文件',
    defaultPath: defaultName,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'JSON', extensions: ['json'] }
    ]
  })
  
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, content, 'utf-8')
      return { success: true, path: result.filePath }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
  return { canceled: true }
})
