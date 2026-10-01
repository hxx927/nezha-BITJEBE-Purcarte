import type { NezhaServer } from "@/types/nezha-api"

export type CardPingSelector = string | number
export type CardPingSample = { time: number; latency: number | null; loss: number | null; count: number }
export type CardPingTask = { id: number; name: string; clients?: string[] }
export type CardPingData = { tasks: CardPingTask[]; samples: Record<string, Record<number, CardPingSample[]>> }
export type CardPingBucket = { start: number; end: number; latency: number | null; loss: number | null; count: number }
export const CARD_PING_WINDOW = 60 * 60 * 1000
export const CARD_PING_BUCKETS = 30
const DEFAULT_TASKS: CardPingSelector[] = ["联通", "移动+35", "电信"]

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function parseCardPingSelectors(value: unknown): CardPingSelector[] {
  const parsed = parseJson(value)
  if (!Array.isArray(parsed)) return []
  const selectors: CardPingSelector[] = []
  for (const item of parsed) {
    const valid = typeof item === "number" ? Number.isSafeInteger(item) && item > 0 : typeof item === "string" && item.trim().length > 0
    if (!valid) continue
    const selector = typeof item === "string" ? item.trim() : item
    if (!selectors.includes(selector)) selectors.push(selector)
    if (selectors.length === 3) break
  }
  return selectors
}

export function cardPingEnabled(value: unknown): boolean {
  return ![false, 0, "false", "0", "off"].includes(typeof value === "string" ? value.trim().toLowerCase() : (value as boolean))
}

export function cardPingSelectors(server: Pick<NezhaServer, "uuid" | "id" | "name">, settings: Record<string, unknown>): CardPingSelector[] {
  const overrides = parseJson(settings.CardPingTaskOverrides)
  if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
    const values = overrides as Record<string, unknown>
    for (const key of [server.uuid, String(server.id), server.name]) {
      if (!key || !Object.prototype.hasOwnProperty.call(values, key)) continue
      const selectors = parseCardPingSelectors(values[key])
      if (selectors.length) return selectors
    }
  }
  const selectors = parseCardPingSelectors(settings.CardPingTasks)
  return selectors.length ? selectors : DEFAULT_TASKS
}

/** IDs are exact. Names prefer exact matches; ambiguous partial names never pick a random task. */
export function resolveCardPingTask(selector: CardPingSelector, tasks: CardPingTask[]): CardPingTask | undefined {
  const text = String(selector)
  if (typeof selector === "number" || /^\d+$/.test(text)) return tasks.find((task) => task.id === Number(selector))
  const exact = tasks.filter((task) => task.name === text)
  if (exact.length) return exact.length === 1 ? exact[0] : undefined
  const partial = tasks.filter((task) => task.name.includes(text))
  return partial.length === 1 ? partial[0] : undefined
}

export function normalizeCardPingSample(time: unknown, latency: unknown, loss?: unknown, count?: unknown): CardPingSample | null {
  const timestamp = typeof time === "number" ? time : Date.parse(String(time))
  if (!Number.isFinite(timestamp)) return null
  const value = latency === null || latency === undefined ? null : Number(latency)
  const valid = value !== null && Number.isFinite(value) && value >= 0 ? value : null
  const lossValue = loss === null || loss === undefined ? null : Number(loss)
  const validLoss =
    lossValue !== null && Number.isFinite(lossValue)
      ? Math.min(100, Math.max(0, lossValue))
      : value !== null && Number.isFinite(value)
        ? valid === null
          ? 100
          : 0
        : null
  const sampleCount = Number(count)
  return { time: timestamp, latency: valid, loss: validLoss, count: Number.isFinite(sampleCount) && sampleCount > 0 ? sampleCount : 1 }
}

export function summarizeCardPing(samples: CardPingSample[], now: number, online: boolean, lastActive: number | null) {
  const start = now - CARD_PING_WINDOW
  const cutoff = online ? now : Math.min(now, lastActive ?? now)
  const records = samples.filter((point) => point.time >= start && point.time <= cutoff).sort((a, b) => a.time - b.time)
  const buckets: CardPingBucket[] = Array.from({ length: CARD_PING_BUCKETS }, (_, index) => ({
    start: start + (index * CARD_PING_WINDOW) / CARD_PING_BUCKETS,
    end: start + ((index + 1) * CARD_PING_WINDOW) / CARD_PING_BUCKETS,
    latency: null,
    loss: null,
    count: 0,
  }))
  const totals = buckets.map(() => ({ latency: 0, valid: 0, loss: 0, count: 0 }))
  let lossSum = 0
  let lossCount = 0
  for (const point of records) {
    const index = Math.min(CARD_PING_BUCKETS - 1, Math.floor(((point.time - start) / CARD_PING_WINDOW) * CARD_PING_BUCKETS))
    const total = totals[index]
    const validCount = point.count * (point.loss === null ? 1 : 1 - point.loss / 100)
    if (point.latency !== null && validCount > 0) {
      total.latency += point.latency * validCount
      total.valid += validCount
    }
    if (point.loss !== null) {
      total.loss += point.loss * point.count
      total.count += point.count
      lossSum += point.loss * point.count
      lossCount += point.count
    }
    buckets[index].count += point.count
  }
  buckets.forEach((bucket, index) => {
    const total = totals[index]
    bucket.latency = total.valid > 0 ? total.latency / total.valid : null
    bucket.loss = total.count > 0 ? total.loss / total.count : null
  })
  // Allow two expected sampling intervals, with a 3-minute floor and 10-minute ceiling.
  const intervals = records
    .slice(1)
    .map((point, index) => point.time - records[index].time)
    .filter((delta) => delta > 0)
    .sort((a, b) => a - b)
  const interval = intervals.length ? intervals[Math.floor(intervals.length / 2)] : 60000
  const latest = records[records.length - 1]
  const stale = !latest || now - latest.time > Math.min(600000, Math.max(180000, interval * 2))
  return {
    buckets,
    lastTime: latest?.time ?? null,
    stale,
    latency: online && !stale ? latest.latency : null,
    loss: online && !stale && lossCount > 0 ? lossSum / lossCount : null,
  }
}
