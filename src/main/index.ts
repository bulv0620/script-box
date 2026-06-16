import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { getDatabase } from './db/database'
import { registerIpc } from './ipc/register-ipc'
import { JobManager } from './job/job-manager'
import { LogManager } from './log/log-manager'
import { RunnerManager } from './runner/runner-manager'
import { TaskManager } from './task/task-manager'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 920,
    height: 620,
    minWidth: 920,
    minHeight: 620,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Script Box',
    icon: resolveAppIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized', false)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function resolveAppIcon(): string {
  if (!app.isPackaged) return join(process.cwd(), 'build', 'icons', 'icon-256.png')
  return join(app.getAppPath(), 'build', 'icons', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
}

app.whenReady().then(() => {
  const db = getDatabase()
  const jobManager = new JobManager()
  const taskManager = new TaskManager(db)
  const logManager = new LogManager()
  const runnerManager = new RunnerManager(db, jobManager, taskManager, logManager)

  registerIpc({ jobManager, taskManager, runnerManager, logManager })
  createWindow()
  if (mainWindow) logManager.bindWindow(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

ipcMain.handle('window:minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize()
})

ipcMain.handle('window:toggleMaximize', () => {
  const window = BrowserWindow.getFocusedWindow()
  if (!window) return false
  if (window.isMaximized()) window.unmaximize()
  else window.maximize()
  return window.isMaximized()
})

ipcMain.handle('window:close', () => {
  BrowserWindow.getFocusedWindow()?.close()
})

ipcMain.handle('window:isMaximized', () => {
  return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
