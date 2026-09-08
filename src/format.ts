export function formatRelative(ms: number | undefined): string {
  if (!ms || !Number.isFinite(ms)) return "—"
  const elapsed = Math.max(0, Date.now() - ms)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (elapsed < minute) return "刚刚"
  if (elapsed < hour) return `${Math.floor(elapsed / minute)} 分钟前`
  if (elapsed < day) return `${Math.floor(elapsed / hour)} 小时前`
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)} 天前`
  return new Date(ms).toLocaleDateString("zh-CN")
}

export function formatFullDate(ms: number | undefined): string {
  if (!ms || !Number.isFinite(ms)) return ""
  return new Date(ms).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" })
}
