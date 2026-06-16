<template>
  <v-dialog v-model="visible" max-width="980">
    <v-card class="dialog-card log-dialog">
      <v-toolbar class="dialog-toolbar" color="surface" height="64">
        <v-toolbar-title>
          <div class="dialog-title">
            <strong>{{ task?.name ?? '日志' }}</strong>
            <span>{{ runs.length }} 条执行记录</span>
          </div>
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-content-copy" variant="text" @click="copyLog" />
        <v-btn icon="mdi-download" variant="text" @click="downloadLog" />
        <v-btn icon="mdi-close" variant="text" @click="visible = false" />
      </v-toolbar>

      <v-card-text>
        <div class="log-tools">
          <v-select
            v-model="selectedRunId"
            :items="runItems"
            item-title="title"
            item-value="value"
            label="执行记录"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-text-field
            v-model="keyword"
            label="搜索"
            prepend-inner-icon="mdi-magnify"
            density="compact"
            variant="outlined"
            hide-details
            clearable
          />
        </div>

        <pre ref="logBodyRef" class="log-body"><template v-for="(line, index) in filteredLines" :key="index"><span :class="lineClass(line)">{{ line }}</span>
</template></pre>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { scriptBoxApi } from '../api/script-box'
import type { LogEvent, RunRecord, Task } from '../types'
import { formatDate, statusText } from '../utils/format'

const props = defineProps<{
  modelValue: boolean
  task: Task | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const runs = ref<RunRecord[]>([])
const selectedRunId = ref('')
const logText = ref('')
const keyword = ref('')
const logBodyRef = ref<HTMLElement | null>(null)
let unsubscribe: (() => void) | null = null

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const runItems = computed(() =>
  runs.value.map((run) => ({
    title: `${formatDate(run.startTime)} ${statusText(run.status)} ${run.duration ? `(${run.duration} ms)` : ''}`,
    value: run.id
  }))
)

const filteredLines = computed(() => {
  const lines = logText.value.split(/\r?\n/).filter(Boolean)
  if (!keyword.value) return lines
  return lines.filter((line) => line.toLowerCase().includes(keyword.value.toLowerCase()))
})

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.task) {
      teardownSubscription()
      return
    }
    await loadRuns()
    teardownSubscription()
    unsubscribe = scriptBoxApi.onLog(handleLogEvent)
  }
)

watch(selectedRunId, async (runId) => {
  logText.value = runId ? await scriptBoxApi.getLog(runId) : ''
  await scrollToBottom()
})

async function loadRuns(): Promise<void> {
  if (!props.task) return
  runs.value = await scriptBoxApi.listRuns(props.task.id)
  selectedRunId.value = runs.value[0]?.id ?? ''
  if (!selectedRunId.value) logText.value = ''
}

function handleLogEvent(event: LogEvent): void {
  if (!props.task || event.taskId !== props.task.id) return
  if (event.runId === selectedRunId.value) {
    logText.value += `${event.line}\n`
    void scrollToBottom()
  } else {
    void loadRuns()
  }
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const el = logBodyRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function copyLog(): Promise<void> {
  await navigator.clipboard.writeText(logText.value)
}

function downloadLog(): void {
  const blob = new Blob([logText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${props.task?.name ?? 'run'}.log`
  anchor.click()
  URL.revokeObjectURL(url)
}

function teardownSubscription(): void {
  unsubscribe?.()
  unsubscribe = null
}

function lineClass(line: string): string {
  if (line.includes(' ERROR ')) return 'log-line error-line'
  if (line.includes(' WARN ')) return 'log-line warn-line'
  return 'log-line'
}
</script>
