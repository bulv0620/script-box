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
    },
    {
      name: '执行次数',
      param: 'count',
      type: 'number',
      required: true,
      defaultValue: 5
    },
    {
      name: '环境',
      param: 'env',
      type: 'select',
      required: true,
      defaultValue: 'test',
      options: [
        { label: '测试环境', value: 'test' },
        { label: '生产环境', value: 'prod' }
      ]
    },
    {
      name: '开启详细日志',
      param: 'verbose',
      type: 'boolean',
      defaultValue: true
    },
    {
      name: '备注',
      param: 'note',
      type: 'textarea',
      defaultValue: ''
    }
  ]
}
