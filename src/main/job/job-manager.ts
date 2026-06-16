import { app } from 'electron'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { JobManifest, LoadedJob } from '../types'

export class JobManager {
  private readonly root: string

  constructor(root?: string) {
    this.root = root ?? resolveJobRoot()
  }

  async list(): Promise<JobManifest[]> {
    const jobs = await this.loadAll()
    return jobs.map((job) => job.manifest)
  }

  async get(jobId: string): Promise<LoadedJob | null> {
    const jobs = await this.loadAll()
    return jobs.find((job) => job.manifest.jobId === jobId) ?? null
  }

  private async loadAll(): Promise<LoadedJob[]> {
    if (!existsSync(this.root)) return []

    const entries = readdirSync(this.root, { withFileTypes: true })
    const jobs: LoadedJob[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const jobDir = join(this.root, entry.name)
      const manifestPath = join(jobDir, 'manifest.js')
      const indexPath = join(jobDir, 'index.js')
      if (!existsSync(manifestPath) || !existsSync(indexPath)) continue

      const manifestModule = await importByPath(manifestPath)
      const jobModule = await importByPath(indexPath)
      const manifest = manifestModule.default as JobManifest
      const loaded = jobModule.default as LoadedJob
      jobs.push({
        manifest: loaded.manifest ?? manifest,
        run: loaded.run
      })
    }

    return jobs.sort((a, b) => a.manifest.jobName.localeCompare(b.manifest.jobName, 'zh-CN'))
  }
}

async function importByPath(filePath: string): Promise<Record<string, unknown>> {
  const url = pathToFileURL(filePath).href
  return import(`${url}?t=${Date.now()}`) as Promise<Record<string, unknown>>
}

function resolveJobRoot(): string {
  if (!app.isPackaged) return join(process.cwd(), 'src', 'jobs')
  return join(app.getAppPath(), 'src', 'jobs')
}
