import type { BrowserWindow } from 'electron'
import { app } from 'electron'
import { appendFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { Logger, LogEvent, RunRecord, Task } from '../types'

export class LogManager {
  private window: BrowserWindow | null = null
  private readonly root: string

  constructor(root?: string) {
    this.root = root ?? join(app.getPath('userData'), 'logs')
    mkdirSync(this.root, { recursive: true })
  }

  bindWindow(window: BrowserWindow): void {
    this.window = window
  }

  createLogFile(taskId: string, runId: string): string {
    const file = join(this.root, taskId, `${runId}.log`)
    mkdirSync(dirname(file), { recursive: true })
    return file
  }

  createLogger(taskId: string, runId: string, logFile: string): Logger {
    const write = (level: string, message: string): void => {
      const line = `[${formatTime(new Date())}] ${level} ${message}`
      appendFileSync(logFile, `${line}\n`, 'utf8')
      this.emit({ taskId, runId, line })
    }

    return {
      info: (message) => write('INFO', message),
      warn: (message) => write('WARN', message),
      error: (message) => write('ERROR', message)
    }
  }

  read(record: RunRecord | null): string {
    if (!record) return ''
    try {
      return readFileSync(record.logFile, 'utf8')
    } catch {
      return ''
    }
  }

  deleteLogFile(logFile: string): void {
    const resolvedRoot = resolve(this.root)
    const resolvedFile = resolve(logFile)
    if (!resolvedFile.startsWith(resolvedRoot)) return

    try {
      rmSync(resolvedFile, { force: true })
    } catch {
      // Best-effort cleanup. Database pruning should not fail because a log file is locked or missing.
    }
  }

  emitTaskChanged(task: Task | null): void {
    if (!task) return
    this.window?.webContents.send('task:changed', task)
  }

  private emit(event: LogEvent): void {
    this.window?.webContents.send('log:event', event)
  }
}

function formatTime(date: Date): string {
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`
}
