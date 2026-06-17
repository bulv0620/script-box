export type TaskStatus = 'idle' | 'running' | 'success' | 'failed' | 'stopped'
export type RunStatus = 'running' | 'success' | 'failed' | 'stopped'
export type ConfigFieldType = 'string' | 'password' | 'number' | 'textarea' | 'boolean' | 'select'
export type JobSource = 'builtin' | 'user'

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
  source?: JobSource
  rootDir?: string
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

export interface TaskInput {
  jobId: string
  name: string
  description?: string
  config: Record<string, unknown>
}

export interface TaskUpdateInput extends TaskInput {
  id: string
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

export interface LogEvent {
  taskId: string
  runId: string
  line: string
}

export interface JobImportResult {
  job: JobManifest
  installed: boolean
}

export interface JobProgressEvent {
  step: 'validating' | 'extracting' | 'installing' | 'completed' | 'failed'
  message: string
  detail?: string
}
