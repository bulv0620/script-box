import type { JobManifest, LogEvent, RunRecord, Task, TaskInput, TaskUpdateInput } from '../types'

const fallbackJobs: JobManifest[] = [
  {
    jobId: 'demo',
    jobName: '演示任务',
    description: '输出多步骤日志并演示停止信号',
    version: '1.0.0',
    timeout: 120000,
    config: []
  },
  {
    jobId: 'http-check',
    jobName: 'HTTP 检测',
    description: '检查指定 URL 的可访问状态',
    version: '1.0.0',
    timeout: 60000,
    config: []
  }
]

const fallbackTasks: Task[] = [
  {
    id: 'preview-1',
    jobId: 'demo',
    name: '每日数据同步',
    description: '同步业务数据并输出执行摘要。',
    config: {},
    status: 'running',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastRunAt: Date.now() - 180000,
    lastSuccessAt: null,
    lastFailedAt: null,
    runCount: 12
  },
  {
    id: 'preview-2',
    jobId: 'http-check',
    name: '官网健康检查',
    description: '定期检查关键页面是否可访问。',
    config: {},
    status: 'success',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastRunAt: Date.now() - 3600000,
    lastSuccessAt: Date.now() - 3600000,
    lastFailedAt: null,
    runCount: 38
  }
]

const nativeApi = window.scriptBox

export const scriptBoxApi = {
  listJobs: (): Promise<JobManifest[]> => nativeApi?.listJobs() ?? Promise.resolve(fallbackJobs),
  getJob: (jobId: string): Promise<JobManifest | null> => nativeApi?.getJob(jobId) ?? Promise.resolve(fallbackJobs.find((job) => job.jobId === jobId) ?? null),
  listTasks: (): Promise<Task[]> => nativeApi?.listTasks() ?? Promise.resolve(fallbackTasks),
  createTask: (input: TaskInput): Promise<Task> =>
    nativeApi?.createTask(input) ??
    Promise.resolve({
      id: crypto.randomUUID(),
      status: 'idle',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailedAt: null,
      runCount: 0,
      description: input.description ?? '',
      ...input
    }),
  updateTask: (input: TaskUpdateInput): Promise<Task> =>
    nativeApi?.updateTask(input) ??
    Promise.resolve({
      status: 'idle',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailedAt: null,
      runCount: 0,
      description: input.description ?? '',
      ...input
    }),
  deleteTask: (taskId: string): Promise<boolean> => nativeApi?.deleteTask(taskId) ?? Promise.resolve(Boolean(taskId)),
  runTask: (taskId: string): Promise<RunRecord> =>
    nativeApi?.runTask(taskId) ??
    Promise.resolve({ id: 'preview-run', taskId, status: 'running', startTime: Date.now(), endTime: null, duration: null, logFile: '' }),
  stopTask: (taskId: string): Promise<boolean> => nativeApi?.stopTask(taskId) ?? Promise.resolve(Boolean(taskId)),
  listRuns: (taskId: string): Promise<RunRecord[]> =>
    nativeApi?.listRuns(taskId) ??
    Promise.resolve([{ id: 'preview-run', taskId, status: 'success', startTime: Date.now() - 120000, endTime: Date.now(), duration: 120000, logFile: '' }]),
  getLog: (runId: string): Promise<string> =>
    nativeApi?.getLog(runId) ??
    Promise.resolve(`[2026-06-16 10:00:00] INFO 开始执行\n[2026-06-16 10:00:01] INFO 预览日志 ${runId}\n[2026-06-16 10:00:02] INFO 执行完成\n`),
  onTaskChanged: (callback: (task: Task) => void): (() => void) => nativeApi?.onTaskChanged(callback) ?? (() => undefined),
  onLog: (callback: (event: LogEvent) => void): (() => void) => nativeApi?.onLog(callback) ?? (() => undefined)
}
