import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { JobManager } from '../job/job-manager'
import type { LogManager } from '../log/log-manager'
import type { TaskManager } from '../task/task-manager'
import type { RunRecord, RunStatus } from '../types'

export class RunnerManager {
  private readonly running = new Map<string, AbortController>()

  constructor(
    private readonly db: Database.Database,
    private readonly jobManager: JobManager,
    private readonly taskManager: TaskManager,
    private readonly logManager: LogManager
  ) {}

  listRuns(taskId: string): RunRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM run_record WHERE task_id = ? ORDER BY start_time DESC')
      .all(taskId) as Array<Record<string, unknown>>
    return rows.map(rowToRunRecord)
  }

  getRun(runId: string): RunRecord | null {
    const row = this.db.prepare('SELECT * FROM run_record WHERE id = ?').get(runId) as Record<string, unknown> | undefined
    return row ? rowToRunRecord(row) : null
  }

  async run(taskId: string): Promise<RunRecord> {
    if (this.running.has(taskId)) throw new Error('任务正在运行')

    const task = this.taskManager.get(taskId)
    if (!task) throw new Error('任务不存在')

    const job = await this.jobManager.get(task.jobId)
    if (!job) throw new Error('Job 不存在')

    const runId = randomUUID()
    const startTime = Date.now()
    const logFile = this.logManager.createLogFile(task.id, runId)
    const record: RunRecord = {
      id: runId,
      taskId: task.id,
      status: 'running',
      startTime,
      endTime: null,
      duration: null,
      logFile
    }

    this.db
      .prepare(
        `INSERT INTO run_record (id, task_id, status, start_time, end_time, duration, log_file)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(record.id, record.taskId, record.status, record.startTime, record.endTime, record.duration, record.logFile)

    this.taskManager.markRunStarted(task.id)
    this.logManager.emitTaskChanged(this.taskManager.get(task.id))

    const controller = new AbortController()
    this.running.set(task.id, controller)
    const logger = this.logManager.createLogger(task.id, runId, logFile)
    const timeoutMs = job.manifest.timeout ?? 300000
    const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)

    void (async () => {
      let status: RunStatus = 'success'
      try {
        logger.info(`开始执行任务：${task.name}`)
        await job.run(task.config, { logger, signal: controller.signal })
        status = controller.signal.aborted ? 'stopped' : 'success'
        logger.info(status === 'success' ? '执行完成' : '任务已停止')
      } catch (error) {
        status = controller.signal.aborted ? 'stopped' : 'failed'
        logger.error(error instanceof Error ? error.message : String(error))
      } finally {
        clearTimeout(timer)
        this.running.delete(task.id)
        const endTime = Date.now()
        this.db
          .prepare('UPDATE run_record SET status = ?, end_time = ?, duration = ? WHERE id = ?')
          .run(status, endTime, endTime - startTime, runId)
        this.taskManager.markRunFinished(task.id, status)
        this.logManager.emitTaskChanged(this.taskManager.get(task.id))
      }
    })()

    return record
  }

  stop(taskId: string): void {
    const controller = this.running.get(taskId)
    if (!controller) return
    controller.abort('manual')
  }
}

function rowToRunRecord(row: Record<string, unknown>): RunRecord {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    status: row.status as RunStatus,
    startTime: Number(row.start_time),
    endTime: row.end_time === null ? null : Number(row.end_time),
    duration: row.duration === null ? null : Number(row.duration),
    logFile: String(row.log_file)
  }
}
