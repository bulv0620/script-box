<template>
  <v-dialog v-model="visible" max-width="720" persistent>
    <v-card class="dialog-card task-config-dialog">
      <v-toolbar class="dialog-toolbar" color="surface" height="64">
        <v-toolbar-title>
          <div class="dialog-title">
            <strong>{{ editingTask ? '编辑任务' : '新增任务' }}</strong>
            <span>{{ selectedJob?.jobName ?? '选择 Job 后配置任务参数' }}</span>
          </div>
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-toolbar>

      <v-card-text class="task-config-body">
        <v-form ref="formRef" @submit.prevent="submit">
          <section class="form-section">
            <h3 class="form-section__title">基础信息</h3>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.jobId"
                  :items="jobItems"
                  item-title="title"
                  item-value="value"
                  label="Job"
                  density="comfortable"
                  variant="outlined"
                  :rules="[requiredRule]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.name"
                  label="任务名称"
                  density="comfortable"
                  variant="outlined"
                  :rules="[requiredRule]"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.description"
                  label="描述"
                  rows="2"
                  density="comfortable"
                  variant="outlined"
                  auto-grow
                />
              </v-col>
            </v-row>
          </section>

          <section class="form-section">
            <h3 class="form-section__title">运行参数</h3>
            <v-row dense>
              <v-col v-for="field in selectedJob?.config ?? []" :key="field.param" cols="12" :md="field.type === 'textarea' ? 12 : 6">
                <v-switch
                  v-if="field.type === 'boolean'"
                  v-model="form.config[field.param]"
                  :label="field.name"
                  color="primary"
                  inset
                  hide-details
                />
                <v-select
                  v-else-if="field.type === 'select'"
                  v-model="form.config[field.param]"
                  :items="field.options ?? []"
                  item-title="label"
                  item-value="value"
                  :label="field.name"
                  density="comfortable"
                  variant="outlined"
                  :rules="field.required ? [requiredRule] : []"
                />
                <v-textarea
                  v-else-if="field.type === 'textarea'"
                  v-model="form.config[field.param]"
                  :label="field.name"
                  rows="4"
                  density="comfortable"
                  variant="outlined"
                  auto-grow
                  :rules="field.required ? [requiredRule] : []"
                />
                <v-text-field
                  v-else
                  v-model="form.config[field.param]"
                  :label="field.name"
                  :type="field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'"
                  density="comfortable"
                  variant="outlined"
                  :rules="field.required ? [requiredRule] : []"
                />
              </v-col>
            </v-row>
          </section>
        </v-form>
      </v-card-text>

      <v-card-actions class="dialog-actions task-config-actions">
        <v-spacer />
        <v-btn variant="text" @click="close">取消</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save" @click="submit">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { VForm } from 'vuetify/components'
import type { JobManifest, Task, TaskInput, TaskUpdateInput } from '../types'

const props = defineProps<{
  modelValue: boolean
  jobs: JobManifest[]
  editingTask: Task | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [value: TaskInput | TaskUpdateInput]
}>()

const formRef = ref<VForm | null>(null)
const form = reactive({
  id: '',
  jobId: '',
  name: '',
  description: '',
  config: {} as Record<string, unknown>
})

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const jobItems = computed(() => props.jobs.map((job) => ({ title: `${job.jobName} (${job.jobId})`, value: job.jobId })))
const selectedJob = computed(() => props.jobs.find((job) => job.jobId === form.jobId) ?? null)
const requiredRule = (value: unknown): true | string => (value !== undefined && value !== null && value !== '' ? true : '必填')

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    const task = props.editingTask
    form.id = task?.id ?? ''
    form.jobId = task?.jobId ?? props.jobs[0]?.jobId ?? ''
    form.name = task?.name ?? ''
    form.description = task?.description ?? ''
    form.config = { ...(task?.config ?? {}) }
    hydrateDefaults()
  }
)

watch(
  () => form.jobId,
  () => hydrateDefaults()
)

function hydrateDefaults(): void {
  const job = selectedJob.value
  if (!job) return
  for (const field of job.config) {
    if (form.config[field.param] === undefined) {
      form.config[field.param] = field.defaultValue ?? (field.type === 'boolean' ? false : '')
    }
  }
}

async function submit(): Promise<void> {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  const payload = {
    jobId: form.jobId,
    name: form.name.trim(),
    description: form.description.trim(),
    config: normalizeConfig()
  }

  emit('save', form.id ? { ...payload, id: form.id } : payload)
}

function normalizeConfig(): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const field of selectedJob.value?.config ?? []) {
    const value = form.config[field.param]
    next[field.param] = field.type === 'number' && value !== '' ? Number(value) : value
  }
  return next
}

function close(): void {
  visible.value = false
}
</script>
