import { contextBridge, ipcRenderer } from 'electron'
import type { JobManifest, LogEvent, RunRecord, Task, TaskInput, TaskUpdateInput } from '../main/types'

const api = {
  listJobs: (): Promise<JobManifest[]> => ipcRenderer.invoke('job:list'),
  getJob: (jobId: string): Promise<JobManifest | null> => ipcRenderer.invoke('job:get', jobId),
  listTasks: (): Promise<Task[]> => ipcRenderer.invoke('task:list'),
  createTask: (input: TaskInput): Promise<Task> => ipcRenderer.invoke('task:create', input),
  updateTask: (input: TaskUpdateInput): Promise<Task> => ipcRenderer.invoke('task:update', input),
  deleteTask: (taskId: string): Promise<boolean> => ipcRenderer.invoke('task:delete', taskId),
  runTask: (taskId: string): Promise<RunRecord> => ipcRenderer.invoke('task:run', taskId),
  stopTask: (taskId: string): Promise<boolean> => ipcRenderer.invoke('task:stop', taskId),
  listRuns: (taskId: string): Promise<RunRecord[]> => ipcRenderer.invoke('run:list', taskId),
  getLog: (runId: string): Promise<string> => ipcRenderer.invoke('log:get', runId),
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: (): Promise<boolean> => ipcRenderer.invoke('window:toggleMaximize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  isWindowMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximized: (callback: (maximized: boolean) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, payload: boolean): void => callback(payload)
    ipcRenderer.on('window:maximized', listener)
    return () => ipcRenderer.removeListener('window:maximized', listener)
  },
  onTaskChanged: (callback: (task: Task) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, payload: Task): void => callback(payload)
    ipcRenderer.on('task:changed', listener)
    return () => ipcRenderer.removeListener('task:changed', listener)
  },
  onLog: (callback: (event: LogEvent) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, payload: LogEvent): void => callback(payload)
    ipcRenderer.on('log:event', listener)
    return () => ipcRenderer.removeListener('log:event', listener)
  }
}

contextBridge.exposeInMainWorld('scriptBox', api)

export type ScriptBoxApi = typeof api
