import { app, dialog, shell } from 'electron'
import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { JobImportResult, JobManifest, JobProgressEvent, JobSource, LoadedJob } from '../types'

type ProgressCallback = (event: JobProgressEvent) => void

interface JobRoot {
  dir: string
  source: JobSource
}

export class JobManager {
  private readonly builtinRoot: string
  private readonly userRoot: string

  constructor(builtinRoot?: string, userRoot?: string) {
    this.builtinRoot = builtinRoot ?? resolveBuiltinJobRoot()
    this.userRoot = userRoot ?? resolveUserJobRoot()
    mkdirSync(this.userRoot, { recursive: true })
  }

  async list(): Promise<JobManifest[]> {
    const jobs = await this.loadAll()
    return jobs.map((job) => job.manifest)
  }

  async get(jobId: string): Promise<LoadedJob | null> {
    const jobs = await this.loadAll()
    return jobs.find((job) => job.manifest.jobId === jobId) ?? null
  }

  async importFromZip(onProgress: ProgressCallback): Promise<JobImportResult | null> {
    await ensureNodeEnvironment(onProgress)

    const selection = await dialog.showOpenDialog({
      title: '导入 Job',
      properties: ['openFile'],
      filters: [{ name: 'Job Zip', extensions: ['zip'] }]
    })

    if (selection.canceled || selection.filePaths.length === 0) return null
    return this.importZip(selection.filePaths[0], onProgress)
  }

  async deleteUserJob(jobId: string): Promise<boolean> {
    const job = await this.get(jobId)
    if (!job) throw new Error('Job 不存在')
    if (job.source !== 'user') throw new Error('内置 Job 不允许删除')

    const resolvedRoot = resolve(this.userRoot)
    const resolvedJobDir = resolve(job.rootDir)
    if (!resolvedJobDir.startsWith(resolvedRoot)) throw new Error('Job 路径非法')

    rmSync(resolvedJobDir, { recursive: true, force: true })
    return true
  }

  async installDependencies(jobId: string, onProgress: ProgressCallback): Promise<boolean> {
    const job = await this.get(jobId)
    if (!job) throw new Error('Job 不存在')
    if (job.source !== 'user') throw new Error('内置 Job 不支持重新安装依赖')
    await installJobDependencies(job.rootDir, onProgress)
    return true
  }

  openUserJobsDir(): void {
    mkdirSync(this.userRoot, { recursive: true })
    void shell.openPath(this.userRoot)
  }

  private async importZip(zipPath: string, onProgress: ProgressCallback): Promise<JobImportResult> {
    const tempDir = createTempDir('script-box-import')
    const extractDir = join(tempDir, 'extract')

    try {
      onProgress({ step: 'extracting', message: '正在解压 Job 包' })
      mkdirSync(extractDir, { recursive: true })
      await runPowerShell(['Expand-Archive', '-LiteralPath', zipPath, '-DestinationPath', extractDir, '-Force'], process.cwd())

      onProgress({ step: 'validating', message: '正在校验 Job 结构' })
      const jobDir = findJobDirectory(extractDir)
      const manifest = await validateJobDirectory(jobDir)
      await this.assertJobIdAvailable(manifest.jobId)

      const targetDir = join(this.userRoot, manifest.jobId)
      rmSync(targetDir, { recursive: true, force: true })
      cpSync(jobDir, targetDir, { recursive: true })

      onProgress({ step: 'installing', message: '正在安装 Job 依赖' })
      const installed = await installJobDependencies(targetDir, onProgress)
      const loaded = await this.loadJob(targetDir, 'user')
      if (!loaded) throw new Error('导入后的 Job 加载失败')

      onProgress({ step: 'completed', message: `Job 导入成功：${loaded.manifest.jobName}` })
      return { job: loaded.manifest, installed }
    } catch (error) {
      onProgress({ step: 'failed', message: 'Job 导入失败', detail: error instanceof Error ? error.message : String(error) })
      throw error
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  }

  private async assertJobIdAvailable(jobId: string): Promise<void> {
    const jobs = await this.loadAll()
    if (jobs.some((job) => job.manifest.jobId === jobId)) {
      throw new Error(`JobId 已存在：${jobId}`)
    }
  }

  private async loadAll(): Promise<LoadedJob[]> {
    const byId = new Map<string, LoadedJob>()

    for (const root of this.getRoots()) {
      if (!existsSync(root.dir)) continue

      const entries = readdirSync(root.dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        try {
          const job = await this.loadJob(join(root.dir, entry.name), root.source)
          if (!job || byId.has(job.manifest.jobId)) continue
          byId.set(job.manifest.jobId, job)
        } catch (error) {
          console.warn(`Skip invalid ${root.source} job ${entry.name}:`, error)
        }
      }
    }

    return [...byId.values()].sort((a, b) => a.manifest.jobName.localeCompare(b.manifest.jobName, 'zh-CN'))
  }

  private async loadJob(jobDir: string, source: JobSource): Promise<LoadedJob | null> {
    const manifestPath = join(jobDir, 'manifest.js')
    const indexPath = join(jobDir, 'index.js')
    if (!existsSync(manifestPath) || !existsSync(indexPath)) return null

    const manifestModule = await importByPath(manifestPath)
    const manifest = normalizeManifest(manifestModule.default as JobManifest, jobDir, source)
    const jobModule = await importByPath(indexPath)
    const loaded = jobModule.default as Partial<LoadedJob>
    if (typeof loaded.run !== 'function') throw new Error(`${manifest.jobName} 缺少 run 方法`)

    return {
      manifest: normalizeManifest((loaded.manifest as JobManifest | undefined) ?? manifest, jobDir, source),
      rootDir: jobDir,
      source,
      run: loaded.run
    }
  }

  private getRoots(): JobRoot[] {
    return [
      { dir: this.builtinRoot, source: 'builtin' },
      { dir: this.userRoot, source: 'user' }
    ]
  }
}

async function validateJobDirectory(jobDir: string): Promise<JobManifest> {
  const manifestPath = join(jobDir, 'manifest.js')
  const indexPath = join(jobDir, 'index.js')
  const packagePath = join(jobDir, 'package.json')

  if (!existsSync(manifestPath)) throw new Error('缺少 manifest.js')
  if (!existsSync(indexPath)) throw new Error('缺少 index.js')
  if (!existsSync(packagePath)) throw new Error('缺少 package.json')

  const manifestModule = await importByPath(manifestPath)
  const manifest = manifestModule.default as JobManifest
  if (!manifest || typeof manifest !== 'object') throw new Error('manifest.js 默认导出必须是对象')
  if (!manifest.jobId) throw new Error('manifest.jobId 不能为空')
  if (!manifest.jobName) throw new Error('manifest.jobName 不能为空')
  if (!manifest.version) throw new Error('manifest.version 不能为空')
  if (!Array.isArray(manifest.config)) throw new Error('manifest.config 必须是数组')

  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8').replace(/^\uFEFF/, '')) as Record<string, unknown>
  if (packageJson.type !== 'module') throw new Error('package.json 必须包含 "type": "module"')

  return manifest
}

function normalizeManifest(manifest: JobManifest, rootDir: string, source: JobSource): JobManifest {
  return {
    ...manifest,
    config: Array.isArray(manifest.config) ? manifest.config : [],
    source,
    rootDir
  }
}

function findJobDirectory(extractDir: string): string {
  if (existsSync(join(extractDir, 'manifest.js'))) return extractDir

  const directories = readdirSync(extractDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())
  if (directories.length !== 1) throw new Error('zip 根目录必须直接包含 Job 文件，或只包含一个 Job 目录')

  return join(extractDir, directories[0].name)
}

async function installJobDependencies(jobDir: string, onProgress: ProgressCallback): Promise<boolean> {
  const packagePath = join(jobDir, 'package.json')
  if (!existsSync(packagePath)) return false

  const hasLock = existsSync(join(jobDir, 'package-lock.json'))
  const args = hasLock ? ['ci', '--omit=dev'] : ['install', '--omit=dev']
  onProgress({ step: 'installing', message: `执行 npm ${args.join(' ')}` })
  await runNpmCommand(args, jobDir, (line) => onProgress({ step: 'installing', message: line }))
  return true
}

async function ensureNodeEnvironment(onProgress: ProgressCallback): Promise<void> {
  try {
    const nodeVersion = await runNodeTool(['node', '-v'])
    const npmVersion = await runNodeTool(['npm', '-v'])
    onProgress({ step: 'validating', message: `检测到 Node ${nodeVersion.trim()} / npm ${npmVersion.trim()}` })
  } catch {
    const message = '导入 Job 需要本机安装 Node.js 和 npm，并确保 npm 可在命令行中执行'
    onProgress({ step: 'failed', message })
    void shell.openExternal('https://nodejs.org/')
    throw new Error(message)
  }
}

function runNodeTool(command: string[]): Promise<string> {
  if (process.platform !== 'win32') return runCommandWithOutput(command[0], command.slice(1), process.cwd())
  return runCommandWithOutput('cmd.exe', ['/d', '/s', '/c', command.join(' ')], process.cwd())
}

async function importByPath(filePath: string): Promise<Record<string, unknown>> {
  const url = pathToFileURL(filePath).href
  return import(`${url}?t=${Date.now()}`) as Promise<Record<string, unknown>>
}

function createTempDir(prefix: string): string {
  const dir = join(app.getPath('temp'), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function runPowerShell(args: string[], cwd: string): Promise<void> {
  return runCommand('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', buildPowerShellCommand(args)], cwd)
}

function runNpmCommand(args: string[], cwd: string, onOutput?: (line: string) => void): Promise<void> {
  if (process.platform !== 'win32') return runCommand('npm', args, cwd, onOutput)

  const command = ['npm', ...args].join(' ')
  return runCommand('cmd.exe', ['/d', '/s', '/c', command], cwd, onOutput)
}

function buildPowerShellCommand(args: string[]): string {
  const [command, ...rest] = args
  return `& ${quotePowerShell(command)} ${rest.map(formatPowerShellArg).join(' ')}`
}

function formatPowerShellArg(value: string): string {
  if (value.startsWith('-')) return value
  return quotePowerShell(value)
}

function quotePowerShell(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function runCommand(command: string, args: string[], cwd: string, onOutput?: (line: string) => void): Promise<void> {
  return runCommandWithOutput(command, args, cwd, onOutput).then(() => undefined)
}

function runCommandWithOutput(command: string, args: string[], cwd: string, onOutput?: (line: string) => void): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, windowsHide: true })
    let output = ''

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      output += text
      for (const line of text.split(/\r?\n/).filter(Boolean)) onOutput?.(line)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      output += text
      for (const line of text.split(/\r?\n/).filter(Boolean)) onOutput?.(line)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolvePromise(output)
      else reject(new Error(output.trim() || `${command} exited with code ${code}`))
    })
  })
}

function resolveBuiltinJobRoot(): string {
  if (!app.isPackaged) return join(process.cwd(), 'src', 'jobs')
  return join(app.getAppPath(), 'src', 'jobs')
}

function resolveUserJobRoot(): string {
  return join(app.getPath('userData'), 'jobs')
}
