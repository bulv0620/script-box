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
    },
    {
      name: '超时毫秒',
      param: 'timeout',
      type: 'number',
      required: true,
      defaultValue: 10000
    }
  ]
}
