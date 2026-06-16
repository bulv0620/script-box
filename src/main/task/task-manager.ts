import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Task, TaskInput, TaskStatus, TaskUpdateInput } from '../types'

type TaskRow = {
  id: string
  job_id: string
  name: string
  description: string
  config_json: string
  status: TaskStatus
  created_at: number
  updated_at: number
  last_run_at: number | null
  last_success_at: number | null
  last_failed_at: number | null
  run_count: number
}

export class TaskManager {
  constructor(private readonly db: Database.Database) {}

  list(): Task[] {
    const rows = this.db.prepare('SELECT * FROM task ORDER BY updated_at DESC').all() as TaskRow[]
    return rows.map(rowToTask)
  }

  get(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM task WHERE id = ?').get(id) as TaskRow | undefined
    return row ? rowToTask(row) : null
  }

  create(input: TaskInput): Task {
    const now = Date.now()
    const task: Task = {
      id: randomUUID(),
      jobId: input.jobId,
      name: input.name,
      description: input.description ?? '',
      config: input.config,
      status: 'idle',
      createdAt: now,
      updatedAt: now,
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailedAt: null,
      runCount: 0
    }

    this.db
      .prepare(
        `INSERT INTO task (
          id, job_id, name, description, config_json, status, created_at, updated_at,
          last_run_at, last_success_at, last_failed_at, run_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        task.id,
        task.jobId,
        task.name,
        task.description,
        JSON.stringify(task.config),
        task.status,
        task.createdAt,
        task.updatedAt,
        task.lastRunAt,
        task.lastSuccessAt,
        task.lastFailedAt,
        task.runCount
      )

    return task
  }

  update(input: TaskUpdateInput): Task {
    const oldTask = this.get(input.id)
    if (!oldTask) throw new Error('任务不存在')

    const task: Task = {
      ...oldTask,
      jobId: input.jobId,
      name: input.name,
      description: input.description ?? '',
      config: input.config,
      updatedAt: Date.now()
    }

    this.db
      .prepare(
        `UPDATE task SET
          job_id = ?, name = ?, description = ?, config_json = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(task.jobId, task.name, task.description, JSON.stringify(task.config), task.updatedAt, task.id)

    return task
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM run_record WHERE task_id = ?').run(id)
    this.db.prepare('DELETE FROM task WHERE id = ?').run(id)
  }

  setStatus(id: string, status: TaskStatus): void {
    this.db.prepare('UPDATE task SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), id)
  }

  markRunStarted(id: string): void {
    const now = Date.now()
    this.db
      .prepare(
        `UPDATE task SET status = 'running', last_run_at = ?, updated_at = ?, run_count = run_count + 1
        WHERE id = ?`
      )
      .run(now, now, id)
  }

  markRunFinished(id: string, status: Exclude<TaskStatus, 'idle' | 'running'>): void {
    const now = Date.now()
    const success = status === 'success' ? now : null
    const failed = status === 'failed' ? now : null
    this.db
      .prepare(
        `UPDATE task SET
          status = ?,
          updated_at = ?,
          last_success_at = COALESCE(?, last_success_at),
          last_failed_at = COALESCE(?, last_failed_at)
        WHERE id = ?`
      )
      .run(status, now, success, failed, id)
  }
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    jobId: row.job_id,
    name: row.name,
    description: row.description,
    config: JSON.parse(row.config_json),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRunAt: row.last_run_at,
    lastSuccessAt: row.last_success_at,
    lastFailedAt: row.last_failed_at,
    runCount: row.run_count
  }
}
