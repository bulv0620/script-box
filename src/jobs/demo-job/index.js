import dayjs from 'dayjs'
import { clamp } from 'lodash-es'
import manifest from './manifest.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default {
  manifest,

  async run(config, context) {
    const count = clamp(Number(config.count ?? 1), 1, 20)

    context.logger.info(`当前时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`)
    context.logger.info(`用户：${config.username}`)
    context.logger.info(`环境：${config.env}`)

    if (config.note) {
      context.logger.info(`备注：${config.note}`)
    }

    for (let index = 1; index <= count; index += 1) {
      if (context.signal.aborted) {
        context.logger.warn('收到停止信号，退出执行循环')
        return
      }

      context.logger.info(`执行步骤 ${index}/${count}`)
      if (config.verbose) {
        context.logger.info(`步骤 ${index} 使用 node_modules 中的 dayjs/lodash-es 正常运行`)
      }
      await sleep(800)
    }
  }
}
