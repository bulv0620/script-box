# Script Box

Script Box 是一个基于 Electron + Vue 3 的桌面脚本任务管理工具，用于管理 Job 模板、创建 Task、执行/停止任务、查看实时日志和历史执行记录。

## 技术栈

- Electron
- Vue 3
- TypeScript
- Pinia
- Vuetify
- SQLite, via `better-sqlite3`
- Node.js Runtime for Job execution

## 开发

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

普通构建：

```bash
npm run build
```

Windows 打包，生成安装包和免安装程序：

```bash
npm run dist:win
```

打包产物输出到 `release/`。

## Job 目录结构

内置 Job 放在 `src/jobs` 下，每个 Job 一个目录：

```text
src/jobs/
  http-job/
    manifest.js
    index.js
```

`manifest.js` 用于声明 Job 信息和配置项：

```js
export default {
  jobId: 'http-check',
  jobName: 'HTTP 检测',
  description: '检查指定 URL 的可访问状态',
  version: '1.0.0',
  timeout: 60000,
  config: [
    {
      name: 'URL',
      param: 'url',
      type: 'string',
      required: true,
      defaultValue: 'https://example.com'
    }
  ]
}
```

`index.js` 用于实现执行逻辑：

```js
import manifest from './manifest.js'

export default {
  manifest,

  async run(config, context) {
    context.logger.info(`请求：${config.url}`)

    if (context.signal.aborted) {
      context.logger.warn('任务已停止')
      return
    }

    context.logger.info('执行完成')
  }
}
```

Job 可以正常使用项目 `node_modules` 中的依赖，例如 `dayjs`、`lodash-es` 等。

## 外部 Job 导入

v0.2.0 起支持导入用户 Job。

导入格式为 zip，zip 根目录可以直接包含 Job 文件，也可以只包含一个 Job 目录。

必须包含：

```text
manifest.js
index.js
package.json
```

`package.json` 必须包含：

```json
{
  "type": "module"
}
```

导入成功后，应用会把 Job 解压到 Electron `userData/jobs/<jobId>`，并在该目录自动安装依赖。

如果存在 `package-lock.json`：

```bash
npm ci --omit=dev
```

否则执行：

```bash
npm install --omit=dev
```

外部 Job 应在自己的 `package.json` 中声明运行依赖，不要依赖 Script Box 应用自身的 dependencies。

导入的用户 Job 可以在“Job 管理”中重新安装依赖或删除。已有关联任务的用户 Job 不允许删除。

## 支持的配置字段

- `string`
- `password`
- `number`
- `textarea`
- `boolean`
- `select`

## 主要目录

```text
src/
  main/       Electron 主进程、数据库、Job/Task/Runner/Log/IPC
  preload/    Renderer 安全访问主进程 API 的桥接层
  renderer/   Vue 3 前端界面
  jobs/       内置 Job 模板目录

build/icons/  应用图标资源
docs/         需求与设计文档
```

## 数据与日志

运行时数据保存在 Electron 的 `userData` 目录中：

- SQLite 数据库：`database/script-box.sqlite`
- 日志文件：`logs/`
- 用户 Job：`jobs/`

## License

MIT
