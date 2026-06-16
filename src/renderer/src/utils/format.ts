export function formatDate(value?: number | null): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date(value))
}

export function formatDuration(value?: number | null): string {
  if (!value) return '-'
  if (value < 1000) return `${value} ms`
  return `${(value / 1000).toFixed(1)} s`
}

export function statusText(status: string): string {
  const map: Record<string, string> = {
    idle: '空闲',
    running: '运行中',
    success: '成功',
    failed: '失败',
    stopped: '已停止'
  }
  return map[status] ?? status
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    idle: 'grey',
    running: 'primary',
    success: 'success',
    failed: 'error',
    stopped: 'warning'
  }
  return map[status] ?? 'grey'
}
