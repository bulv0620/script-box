import { ipcMain } from 'electron'
import type { JobManager } from '../job/job-manager'
import type { LogManager } from '../log/log-manager'
import type { RunnerManager } from '../runner/runner-manager'
import type { TaskManager } from '../task/task-manager'
import type { TaskInput, TaskUpdateInput } from '../types'

interface IpcDeps {
  jobManager: JobManager
  taskManager: TaskManager
  runnerManager: RunnerManager
  logManager: LogManager
}

export function registerIpc({ jobManager, taskManager, runnerManager, logManager }: IpcDeps): void {
  ipcMain.handle('job:list', () => jobManager.list())
  ipcMain.handle('job:get', (_, jobId: string) => jobManager.get(jobId).then((job) => job?.manifest ?? null))

  ipcMain.handle('task:list', () => taskManager.list())
  ipcMain.handle('task:create', (_, input: TaskInput) => taskManager.create(input))
  ipcMain.handle('task:update', (_, input: TaskUpdateInput) => taskManager.update(input))
  ipcMain.handle('task:delete', (_, taskId: string) => {
    taskManager.delete(taskId)
    return true
  })
  ipcMain.handle('task:run', (_, taskId: string) => runnerManager.run(taskId))
  ipcMain.handle('task:stop', (_, taskId: string) => {
    runnerManager.stop(taskId)
    return true
  })

  ipcMain.handle('run:list', (_, taskId: string) => runnerManager.listRuns(taskId))
  ipcMain.handle('log:get', (_, runId: string) => logManager.read(runnerManager.getRun(runId)))
}
