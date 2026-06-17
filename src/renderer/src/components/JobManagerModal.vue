<template>
  <v-dialog v-model="visible" max-width="900">
    <v-card class="dialog-card job-manager-dialog">
      <v-toolbar class="dialog-toolbar" color="surface" height="64">
        <v-toolbar-title>
          <div class="dialog-title">
            <strong>Job 管理</strong>
            <span>{{ jobs.length }} 个 Job · 用户 Job 可导入、安装依赖和删除</span>
          </div>
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-folder-open-outline" variant="text" @click="openUserJobsDir" />
        <v-btn icon="mdi-close" variant="text" @click="visible = false" />
      </v-toolbar>

      <v-card-text class="job-manager-body">
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" closable @click:close="errorMessage = ''">
          {{ errorMessage }}
        </v-alert>

        <div class="job-actions-bar">
          <v-btn color="primary" variant="flat" prepend-icon="mdi-import" :loading="busy" @click="importJob">导入 Job</v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-folder-open-outline" @click="openUserJobsDir">用户目录</v-btn>
        </div>

        <div v-if="progressLines.length" class="job-progress">
          <div class="job-progress__head">
            <strong>操作日志</strong>
            <v-btn size="small" variant="text" @click="progressLines = []">清空</v-btn>
          </div>
          <pre>{{ progressLines.join('\n') }}</pre>
        </div>

        <div class="job-list">
          <article v-for="job in jobs" :key="job.jobId" class="job-row">
            <div class="job-row__main">
              <div class="job-title-line">
                <h3>{{ job.jobName }}</h3>
                <v-chip size="x-small" :color="job.source === 'user' ? 'primary' : 'grey'" variant="tonal">
                  {{ job.source === 'user' ? '用户' : '内置' }}
                </v-chip>
              </div>
              <p>{{ job.description || '无描述' }}</p>
            </div>

            <div class="job-row__meta">
              <span>JobId</span>
              <strong>{{ job.jobId }}</strong>
            </div>

            <div class="job-row__meta">
              <span>版本</span>
              <strong>{{ job.version }}</strong>
            </div>

            <div class="job-row__actions">
              <v-tooltip v-if="job.source === 'user'" text="重新安装依赖" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-package-down" variant="text" size="small" :loading="busyJobId === job.jobId" @click="installDeps(job.jobId)" />
                </template>
              </v-tooltip>
              <v-tooltip v-if="job.source === 'user'" text="删除" location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-delete-outline"
                    color="error"
                    variant="text"
                    size="small"
                    :loading="busyJobId === job.jobId"
                    @click="deleteJob(job.jobId)"
                  />
                </template>
              </v-tooltip>
            </div>
          </article>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { scriptBoxApi } from '../api/script-box'
import type { JobManifest, JobProgressEvent } from '../types'

const props = defineProps<{
  modelValue: boolean
  jobs: JobManifest[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  changed: []
}>()

const busy = ref(false)
const busyJobId = ref('')
const errorMessage = ref('')
const progressLines = ref<string[]>([])
let unsubscribeProgress: (() => void) | null = null

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      unsubscribeProgress = scriptBoxApi.onJobProgress(appendProgress)
    } else {
      unsubscribeProgress?.()
      unsubscribeProgress = null
      busy.value = false
      busyJobId.value = ''
    }
  }
)

async function importJob(): Promise<void> {
  busy.value = true
  errorMessage.value = ''
  progressLines.value = []
  try {
    const result = await scriptBoxApi.importJob()
    if (result) emit('changed')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
    appendProgress({ step: 'failed', message: errorMessage.value })
  } finally {
    busy.value = false
  }
}

async function deleteJob(jobId: string): Promise<void> {
  if (!confirm('删除这个用户 Job？')) return
  busyJobId.value = jobId
  errorMessage.value = ''
  try {
    await scriptBoxApi.deleteJob(jobId)
    emit('changed')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    busyJobId.value = ''
  }
}

async function installDeps(jobId: string): Promise<void> {
  busyJobId.value = jobId
  errorMessage.value = ''
  progressLines.value = []
  try {
    await scriptBoxApi.installJobDependencies(jobId)
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    busyJobId.value = ''
  }
}

async function openUserJobsDir(): Promise<void> {
  await scriptBoxApi.openUserJobsDir()
}

function appendProgress(event: JobProgressEvent): void {
  const detail = event.detail ? `：${event.detail}` : ''
  progressLines.value.push(`[${event.step}] ${event.message}${detail}`)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/^Error invoking remote method '[^']+': Error: /, '')
  return String(error)
}
</script>
