# 脚本任务管理 APP 设计方案

## 1. 项目简介

### 1.1 项目目标

构建一个基于 Electron + Vue3 的桌面脚本管理工具。

用户可以：

* 管理多个脚本（Job）
* 创建多个任务（Task）
* 配置任务参数
* 执行和停止任务
* 查看实时日志
* 查看历史执行记录

应用定位类似：

* Jenkins（简化版）
* 青龙面板（桌面版）
* 自动化脚本管理器

---

## 2. 技术架构

### 2.1 技术选型

#### 前端

* Vue3
* TypeScript
* Pinia
* Vuetify

#### 桌面框架

* Electron

#### 数据存储

* SQLite

推荐：

```bash
better-sqlite3
```

#### 日志存储

文件系统

```text
logs/
```

#### 脚本运行

Node.js Runtime

---

### 2.2 系统架构

```text
Electron
│
├── Main Process
│   ├── JobManager
│   ├── TaskManager
│   ├── RunnerManager
│   ├── LogManager
│   └── Database
│
├── Preload
│
└── Renderer(Vue3)
    ├── TaskList
    ├── TaskConfigModal
    ├── LogModal
    └── Settings
```

---

## 3. 核心概念

系统由三个核心模块组成：

```text
Job
 ↓
Task
 ↓
RunRecord
 ↓
Log
```

### Job

脚本模板。

负责定义：

* 脚本信息
* 配置项
* 执行逻辑

### Task

用户创建的任务实例。

负责：

* 保存配置
* 执行脚本

### RunRecord

任务执行记录。

每执行一次任务产生一条记录。

### Log

执行日志。

用于记录运行过程。

---

# 4. Job设计

## 4.1 Job目录结构

```text
jobs/

├── test-job
│   ├── index.js
│   └── manifest.js

├── email-job
│   ├── index.js
│   └── manifest.js
```

---

## 4.2 Manifest定义

```js
export default {
  jobId: "email",

  jobName: "邮件发送",

  description: "发送邮件脚本",

  version: "1.0.0",

  timeout: 300000,

  config: []
}
```

---

## 4.3 配置字段定义

```js
{
  name: "用户名",

  param: "username",

  type: "string",

  required: true,

  defaultValue: ""
}
```

---

### 支持类型

#### string

```js
{
  type: "string"
}
```

文本输入框

---

#### password

```js
{
  type: "password"
}
```

密码输入框

---

#### number

```js
{
  type: "number"
}
```

数字输入

---

#### textarea

```js
{
  type: "textarea"
}
```

多行文本

---

#### boolean

```js
{
  type: "boolean"
}
```

开关

---

#### select

```js
{
  type: "select",

  options: [
    {
      label: "测试环境",
      value: "test"
    },
    {
      label: "生产环境",
      value: "prod"
    }
  ]
}
```

下拉选择

---

## 4.4 Job标准接口

```js
export default {
  manifest,

  async run(config, context) {

  }
}
```

---

### config

任务配置

```js
{
  username: "",
  password: ""
}
```

---

### context

执行上下文

```js
{
  logger,
  signal
}
```

---

### logger

```js
context.logger.info("开始执行")
context.logger.error("执行失败")
```

---

### signal

用于停止任务

```js
if (signal.aborted) {
  return
}
```

---

# 5. Task设计

## 5.1 Task定义

Task是Job实例。

例如：

```text
Job
  邮件发送

Task
  每日邮件任务
```

---

## 5.2 Task数据结构

```ts
interface Task {
  id: string

  jobId: string

  name: string

  description: string

  config: Record<string, any>

  status: TaskStatus

  createdAt: number

  updatedAt: number

  lastRunAt?: number

  lastSuccessAt?: number

  lastFailedAt?: number

  runCount: number
}
```

---

## 5.3 状态定义

```ts
type TaskStatus =
  | "idle"
  | "running"
  | "success"
  | "failed"
  | "stopped"
```

---

# 6. RunRecord设计

## 6.1 设计目的

记录任务的每一次执行。

例如：

```text
任务A

执行1
执行2
执行3
```

对应：

```text
RunRecord1
RunRecord2
RunRecord3
```

---

## 6.2 数据结构

```ts
interface RunRecord {

  id: string

  taskId: string

  status: string

  startTime: number

  endTime?: number

  duration?: number

  logFile: string

}
```

---

## 6.3 状态

```text
running
success
failed
stopped
```

---

# 7. 日志设计

## 7.1 日志目录

```text
logs/

├── task_1
│   ├── run_1.log
│   ├── run_2.log
│   └── run_3.log

├── task_2
```

---

## 7.2 日志格式

```text
[2025-01-01 10:00:00] INFO 开始执行

[2025-01-01 10:00:03] INFO 登录成功

[2025-01-01 10:00:10] ERROR 请求失败

[2025-01-01 10:00:12] INFO 执行结束
```

---

## 7.3 实时日志

运行过程中：

```text
Job
 ↓
Logger
 ↓
LogFile

 ↓

IPC

 ↓

Renderer
```

实时推送日志到前端。

---

# 8. Runner设计

## 8.1 Runner职责

统一管理任务执行。

```text
启动
停止
超时控制
日志记录
状态维护
```

---

## 8.2 RunnerManager

```js
RunnerManager.run(task)
```

---

## 8.3 运行中的任务

```js
Map<taskId, controller>
```

```js
runningMap.set(taskId, controller)
```

---

## 8.4 停止任务

```js
controller.abort()
```

---

## 8.5 超时控制

```js
setTimeout(() => {
  controller.abort()
}, timeout)
```

---

# 9. 数据库设计

## 9.1 Task表

```sql
CREATE TABLE task (
  id TEXT PRIMARY KEY,

  job_id TEXT,

  name TEXT,

  description TEXT,

  config_json TEXT,

  status TEXT,

  created_at INTEGER,

  updated_at INTEGER,

  last_run_at INTEGER,

  last_success_at INTEGER,

  last_failed_at INTEGER,

  run_count INTEGER
);
```

---

## 9.2 RunRecord表

```sql
CREATE TABLE run_record (
  id TEXT PRIMARY KEY,

  task_id TEXT,

  status TEXT,

  start_time INTEGER,

  end_time INTEGER,

  duration INTEGER,

  log_file TEXT
);
```

---

# 10. IPC接口设计

## Job

### 获取Job列表

```ts
job:list
```

返回：

```ts
Job[]
```

---

### 获取Job详情

```ts
job:get
```

参数：

```ts
jobId
```

---

## Task

### 创建任务

```ts
task:create
```

---

### 更新任务

```ts
task:update
```

---

### 删除任务

```ts
task:delete
```

---

### 查询任务

```ts
task:list
```

---

### 执行任务

```ts
task:run
```

---

### 停止任务

```ts
task:stop
```

---

## Log

### 获取执行记录

```ts
run:list
```

参数：

```ts
taskId
```

---

### 获取日志内容

```ts
log:get
```

参数：

```ts
runId
```

---

### 实时日志订阅

```ts
log:subscribe
```

---

# 11. 页面设计

# 11.1 主界面

顶部：

```text
[新增任务]
```

---

下方：

```text
┌───────────────────────┐
│ 每日邮件任务          │
│                       │
│ 每天发送日报          │
│                       │
│ 状态：运行中          │
│                       │
│ 最后执行：
│ 2025-01-01 10:00:00   │
│                       │
│ ▶ ■ ⚙ 🗑             │
└───────────────────────┘
```

---

运行中效果：

```text
绿色呼吸动画

Running...
```

---

点击卡片：

```text
打开日志窗口
```

---

# 11.2 配置弹窗

新增任务：

```text
选择Job
```

自动加载配置项：

```text
用户名

密码

环境选择

执行次数
```

动态生成Form。

---

# 11.3 日志弹窗

顶部：

```text
执行记录下拉框
```

例如：

```text
2025-01-01 10:00 成功

2025-01-01 10:30 失败

2025-01-01 11:00 成功
```

---

下方：

```text
日志内容
```

支持：

```text
自动滚动
关键字搜索
复制
下载
```

---

# 12. 项目目录结构

```text
src/

├── main
│   ├── job
│   ├── runner
│   ├── task
│   ├── log
│   ├── db
│   └── ipc
│
├── preload
│
├── renderer
│   ├── views
│   ├── components
│   ├── stores
│   ├── api
│   └── types
│
├── jobs
│
├── database
│
└── logs
```

---

# 13. 后续扩展规划

## V1

* Job管理
* Task管理
* 执行任务
* 停止任务
* 日志查看

---

## V2

* 定时任务(Cron)
* 导入导出任务
* 任务分组
* 全局配置

---

## V3

* 脚本市场
* 自动更新脚本
* 任务依赖
* 并发控制
* 插件系统

---

# 14. MVP目标

第一版本仅实现：

* Job自动发现
* Task管理
* SQLite存储
* 执行与停止
* 实时日志
* 历史日志

保证架构完整、实现简单、后续易扩展。
