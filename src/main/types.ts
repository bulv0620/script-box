export type TaskStatus = 'idle' | 'running' | 'success' | 'failed' | 'stopped'
export type RunStatus = 'running' | 'success' | 'failed' | 'stopped'
export type ConfigFieldType = 'string' | 'password' | 'number' | 'textarea' | 'boolean' | 'select'

export interface ConfigOption {
  label: string
  value: string | number | boolean
}

export interface ConfigField {
  name: string
  param: string
  type: ConfigFieldType
  required?: boolean
  defaultValue?: unknown
  options?: ConfigOption[]
}

export interface JobManifest {
  jobId: string
  jobName: string
  description?: string
  version: string
  timeout?: number
  config: ConfigField[]
}

export interface LoadedJob {
  manifest: JobManifest
  run: (config: Record<string, unknown>, context: JobContext) => Promise<void> | void
}

export interface JobContext {
  logger: Logger
  signal: AbortSignal
}

export interface Logger {
  info: (message: string) => void
  error: (message: string) => void
  warn: (message: string) => void
}

export interface Task {
  id: string
  jobId: string
  name: string
  description: string
  config: Record<string, unknown>
  status: TaskStatus
  createdAt: number
  updatedAt: number
  lastRunAt?: number | null
  lastSuccessAt?: number | null
  lastFailedAt?: number | null
  runCount: number
}

export interface RunRecord {
  id: string
  taskId: string
  status: RunStatus
  startTime: number
  endTime?: number | null
  duration?: number | null
  logFile: string
}

export interface TaskInput {
  jobId: string
  name: string
  description?: string
  config: Record<string, unknown>
}

export interface TaskUpdateInput {
  id: string
  jobId: string
  name: string
  description?: string
  config: Record<string, unknown>
}

export interface LogEvent {
  taskId: string
  runId: string
  line: string
}
