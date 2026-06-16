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

Job 放在 `src/jobs` 下，每个 Job 一个目录：

```text
src/jobs/
  demo-job/
    manifest.js
    index.js
```

`manifest.js` 用于声明 Job 信息和配置项：

```js
export default {
  jobId: 'demo',
  jobName: '演示任务',
  description: '输出多步骤日志并演示停止信号',
  version: '1.0.0',
  timeout: 120000,
  config: [
    {
      name: '用户名',
      param: 'username',
      type: 'string',
      required: true,
      defaultValue: 'admin'
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
    context.logger.info(`开始执行：${config.username}`)

    if (context.signal.aborted) {
      context.logger.warn('任务已停止')
      return
    }

    context.logger.info('执行完成')
  }
}
```

Job 可以正常使用项目 `node_modules` 中的依赖，例如 `dayjs`、`lodash-es` 等。

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
  jobs/       Job 模板目录

build/icons/  应用图标资源
docs/         需求与设计文档
```

## 数据与日志

运行时数据保存在 Electron 的 `userData` 目录中：

- SQLite 数据库：`database/script-box.sqlite`
- 日志文件：`logs/`

## License

MIT
