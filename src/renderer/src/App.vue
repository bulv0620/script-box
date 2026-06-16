<template>
  <v-app>
    <v-main>
      <div class="workspace">
        <header class="titlebar">
          <div class="brand titlebar-drag">
            <div class="brand-mark">
              <img :src="appIcon" alt="" />
            </div>
            <div>
              <h1>Script Box</h1>
            </div>
          </div>
          <div class="window-controls">
            <button class="window-button" type="button" aria-label="最小化" @click="minimizeWindow">
              <v-icon icon="mdi-window-minimize" size="18" />
            </button>
            <button class="window-button" type="button" :aria-label="isMaximized ? '还原' : '最大化'" @click="toggleMaximizeWindow">
              <v-icon :icon="isMaximized ? 'mdi-window-restore' : 'mdi-window-maximize'" size="16" />
            </button>
            <button class="window-button close" type="button" aria-label="关闭" @click="closeWindow">
              <v-icon icon="mdi-close" size="18" />
            </button>
          </div>
        </header>

        <section class="main-panel">
          <header class="page-header">
            <div>
              <p class="eyebrow">Automation Workspace</p>
              <h2>任务管理</h2>
            </div>
            <div class="page-actions">
              <v-btn icon="mdi-refresh" variant="text" :loading="loading" @click="refresh" />
              <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreate">新增任务</v-btn>
            </div>
          </header>

          <section class="stats-row">
            <div class="metric-card">
              <span>全部任务</span>
              <strong>{{ tasks.length }}</strong>
            </div>
            <div class="metric-card">
              <span>运行中</span>
              <strong>{{ runningCount }}</strong>
            </div>
            <div class="metric-card">
              <span>成功</span>
              <strong>{{ successCount }}</strong>
            </div>
            <div class="metric-card">
              <span>失败</span>
              <strong>{{ failedCount }}</strong>
            </div>
          </section>

          <section class="task-section">
            <div class="section-header">
              <div>
                <h3>任务列表</h3>
                <p>点击任务行查看执行日志</p>
              </div>
            </div>

            <div v-if="tasks.length" class="task-list">
              <article
                v-for="task in tasks"
                :key="task.id"
                class="task-row"
                :class="{ running: task.status === 'running' }"
                @click="openLogs(task)"
              >
                <div class="task-row__status">
                  <span :class="['status-dot', task.status]" />
                </div>

                <div class="task-row__main">
                  <div class="task-title-line">
                    <h4>{{ task.name }}</h4>
                    <v-chip :color="statusColor(task.status)" size="x-small" variant="tonal">{{ statusText(task.status) }}</v-chip>
                  </div>
                  <p>{{ task.description || '无描述' }}</p>
                </div>

                <div class="task-row__job">
                  <span>Job</span>
                  <strong>{{ jobMap.get(task.jobId)?.jobName ?? task.jobId }}</strong>
                </div>

                <div class="task-row__time">
                  <span>最后执行</span>
                  <strong>{{ formatDate(task.lastRunAt) }}</strong>
                </div>

                <div class="task-row__count">
                  <span>次数</span>
                  <strong>{{ task.runCount }}</strong>
                </div>

                <div class="task-row__actions" @click.stop>
                  <v-tooltip text="运行" location="top">
                    <template #activator="{ props }">
                      <v-btn
                        v-if="task.status !== 'running'"
                        v-bind="props"
                        icon="mdi-play"
                        color="success"
                        variant="tonal"
                        size="small"
                        @click="runTask(task.id)"
                      />
                    </template>
                  </v-tooltip>
                  <v-tooltip text="停止" location="top">
                    <template #activator="{ props }">
                      <v-btn
                        v-if="task.status === 'running'"
                        v-bind="props"
                        icon="mdi-stop"
                        color="warning"
                        variant="tonal"
                        size="small"
                        @click="stopTask(task.id)"
                      />
                    </template>
                  </v-tooltip>
                  <v-tooltip text="配置" location="top">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon="mdi-tune" variant="text" size="small" @click="openEdit(task)" />
                    </template>
                  </v-tooltip>
                  <v-tooltip text="日志" location="top">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon="mdi-text-box-search-outline" variant="text" size="small" @click="openLogs(task)" />
                    </template>
                  </v-tooltip>
                  <v-tooltip text="删除" location="top">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon="mdi-delete-outline" color="error" variant="text" size="small" @click="deleteTask(task.id)" />
                    </template>
                  </v-tooltip>
                </div>
              </article>
            </div>

            <div v-else class="empty-state">
              <div class="empty-icon">
                <v-icon icon="mdi-script-text-outline" size="38" />
              </div>
              <h3>暂无任务</h3>
              <p>从一个 Job 模板创建任务后，就可以运行、停止并查看日志。</p>
              <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreate">新增任务</v-btn>
            </div>
          </section>
        </section>
      </div>
    </v-main>

    <TaskConfigModal v-model="configOpen" :jobs="jobs" :editing-task="editingTask" @save="saveTask" />
    <LogModal v-model="logOpen" :task="selectedTask" />
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import LogModal from './components/LogModal.vue'
import TaskConfigModal from './components/TaskConfigModal.vue'
import { scriptBoxApi } from './api/script-box'
import appIcon from './assets/app-icon.png'
import { useTaskStore } from './stores/tasks'
import type { Task, TaskInput, TaskUpdateInput } from './types'
import { formatDate, statusColor, statusText } from './utils/format'

const store = useTaskStore()
const { jobs, tasks, loading, jobMap } = storeToRefs(store)
const configOpen = ref(false)
const logOpen = ref(false)
const editingTask = ref<Task | null>(null)
const selectedTask = ref<Task | null>(null)
const isMaximized = ref(false)
let unsubscribeWindowMaximized: (() => void) | null = null
let unsubscribeTaskChanged: (() => void) | null = null
const runningCount = computed(() => tasks.value.filter((task) => task.status === 'running').length)
const successCount = computed(() => tasks.value.filter((task) => task.status === 'success').length)
const failedCount = computed(() => tasks.value.filter((task) => task.status === 'failed').length)

onMounted(() => {
  void refresh()
  void window.scriptBox?.isWindowMaximized?.().then((value) => {
    isMaximized.value = value
  })
  unsubscribeWindowMaximized = window.scriptBox?.onWindowMaximized?.((value) => {
    isMaximized.value = value
  }) ?? null
  unsubscribeTaskChanged = scriptBoxApi.onTaskChanged((task) => {
    store.upsertTask(task)
    if (selectedTask.value?.id === task.id) selectedTask.value = task
  })
})

onUnmounted(() => {
  unsubscribeWindowMaximized?.()
  unsubscribeTaskChanged?.()
})

async function refresh(): Promise<void> {
  await store.refresh()
}

function openCreate(): void {
  editingTask.value = null
  configOpen.value = true
}

function openEdit(task: Task): void {
  editingTask.value = task
  configOpen.value = true
}

function openLogs(task: Task): void {
  selectedTask.value = task
  logOpen.value = true
}

async function saveTask(input: TaskInput | TaskUpdateInput): Promise<void> {
  if ('id' in input) await store.updateTask(input)
  else await store.createTask(input)
  configOpen.value = false
}

async function runTask(taskId: string): Promise<void> {
  await store.runTask(taskId)
}

async function stopTask(taskId: string): Promise<void> {
  await store.stopTask(taskId)
}

async function deleteTask(taskId: string): Promise<void> {
  if (!confirm('删除这个任务及其执行记录？')) return
  await store.deleteTask(taskId)
}

function minimizeWindow(): void {
  void window.scriptBox?.minimizeWindow?.()
}

async function toggleMaximizeWindow(): Promise<void> {
  const next = await window.scriptBox?.toggleMaximizeWindow?.()
  if (typeof next === 'boolean') isMaximized.value = next
}

function closeWindow(): void {
  void window.scriptBox?.closeWindow?.()
}
</script>
