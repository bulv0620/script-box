import manifest from './manifest.js'

export default {
  manifest,

  async run(config, context) {
    const controller = new AbortController()
    const abort = () => controller.abort()
    context.signal.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(abort, Number(config.timeout ?? 10000))

    try {
      context.logger.info(`请求：${config.url}`)
      const response = await fetch(String(config.url), { signal: controller.signal })
      context.logger.info(`状态码：${response.status}`)
      context.logger.info(`Content-Type：${response.headers.get('content-type') ?? '-'}`)
      if (!response.ok) {
        throw new Error(`HTTP 状态异常：${response.status}`)
      }
    } finally {
      clearTimeout(timer)
      context.signal.removeEventListener('abort', abort)
    }
  }
}
