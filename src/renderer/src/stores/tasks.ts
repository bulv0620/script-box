import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { scriptBoxApi } from '../api/script-box'
import type { JobManifest, Task, TaskInput, TaskUpdateInput } from '../types'

export const useTaskStore = defineStore('tasks', () => {
  const jobs = ref<JobManifest[]>([])
  const tasks = ref<Task[]>([])
  const loading = ref(false)

  const jobMap = computed(() => new Map(jobs.value.map((job) => [job.jobId, job])))

  async function refresh(): Promise<void> {
    loading.value = true
    try {
      const [jobList, taskList] = await Promise.all([scriptBoxApi.listJobs(), scriptBoxApi.listTasks()])
      jobs.value = jobList
      tasks.value = taskList
    } finally {
      loading.value = false
    }
  }

  async function createTask(input: TaskInput): Promise<void> {
    await scriptBoxApi.createTask(input)
    await refresh()
  }

  async function updateTask(input: TaskUpdateInput): Promise<void> {
    await scriptBoxApi.updateTask(input)
    await refresh()
  }

  async function deleteTask(taskId: string): Promise<void> {
    await scriptBoxApi.deleteTask(taskId)
    await refresh()
  }

  async function runTask(taskId: string): Promise<void> {
    await scriptBoxApi.runTask(taskId)
    await refresh()
  }

  async function stopTask(taskId: string): Promise<void> {
    await scriptBoxApi.stopTask(taskId)
    await refresh()
  }

  function patchTaskStatus(taskId: string, status: Task['status']): void {
    const task = tasks.value.find((item) => item.id === taskId)
    if (task) task.status = status
  }

  function upsertTask(task: Task): void {
    const index = tasks.value.findIndex((item) => item.id === task.id)
    if (index >= 0) tasks.value[index] = task
    else tasks.value.unshift(task)
  }

  return {
    jobs,
    tasks,
    loading,
    jobMap,
    refresh,
    createTask,
    updateTask,
    deleteTask,
    runTask,
    stopTask,
    patchTaskStatus,
    upsertTask
  }
})
