import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

const source = await readFile(new URL("../src/lib/card-ping.ts", import.meta.url), "utf8")
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
const { cardPingEnabled, cardPingSelectors, normalizeCardPingSample, parseCardPingSelectors, resolveCardPingTask, summarizeCardPing } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
)

const now = Date.UTC(2026, 9, 1, 12)
const server = { uuid: "node-a", id: 12, name: "HK" }
const point = (time, latency, loss, count) => normalizeCardPingSample(time, latency, loss, count)

test("selectors validate malformed settings, deduplicate and respect UUID overrides", () => {
  assert.deepEqual(parseCardPingSelectors("invalid JSON"), [])
  assert.deepEqual(parseCardPingSelectors([null, {}, -1, 2, 2, "联通", "电信", 4]), [2, "联通", "电信"])
  assert.deepEqual(cardPingSelectors(server, {}), ["联通", "移动+35", "电信"])
  assert.deepEqual(cardPingSelectors(server, { CardPingTasks: "[1,2,3]", CardPingTaskOverrides: '{"HK":[6],"12":[5],"node-a":[4]}' }), [4])
  assert.deepEqual(cardPingSelectors(server, { CardPingTaskOverrides: '{"node-a":null,"HK":[6]}' }), [6])
  assert.equal(cardPingEnabled("false"), false)
  assert.equal(cardPingEnabled(undefined), true)
})

test("task matching uses IDs, exact names, and only unambiguous partial names", () => {
  const tasks = [
    { id: 1, name: "湖南联通" },
    { id: 2, name: "香港联通" },
    { id: 3, name: "移动+35" },
  ]
  assert.equal(resolveCardPingTask("联通", tasks), undefined)
  assert.equal(resolveCardPingTask("湖南联通", tasks).id, 1)
  assert.equal(resolveCardPingTask("3", tasks).id, 3)
  assert.equal(resolveCardPingTask("移动", tasks).id, 3)
})

test("raw failures and missing samples remain distinct, with valid zero latency", () => {
  assert.deepEqual(point(now, -1), { time: now, latency: null, loss: 100, count: 1 })
  assert.deepEqual(point(now, null), { time: now, latency: null, loss: null, count: 1 })
  assert.equal(point(now, 0).latency, 0)
  assert.equal(point("invalid", 20), null)
  const result = summarizeCardPing([point(now - 60000, 42), point(now, -1)], now, true, now)
  assert.equal(result.latency, null)
  assert.equal(result.loss, 50)
  assert.equal(result.buckets[29].latency, 42)
  assert.equal(result.buckets[29].loss, 50)
})

test("aggregated loss is sample-weighted, not averaged per bucket", () => {
  const result = summarizeCardPing([point(now - 180000, 20, 0, 9), point(now, null, 100, 1)], now, true, now)
  assert.equal(result.loss, 10)
  assert.equal(result.latency, null)
})

test("different task frequencies independently cover the hour without inventing samples", () => {
  for (const interval of [30000, 60000]) {
    const samples = Array.from({ length: 3600000 / interval }, (_, index) => point(now - 3600000 + (index + 1) * interval, 50))
    const result = summarizeCardPing(samples, now, true, now)
    assert.equal(result.buckets.length, 30)
    assert.equal(
      result.buckets.every((bucket) => bucket.latency === 50 && bucket.loss === 0),
      true,
    )
  }
  const result = summarizeCardPing([point(now - 3000000, 50), point(now, 60)], now, true, now)
  assert.equal(result.buckets[15].count, 0)
  assert.equal(result.buckets[15].loss, null)
})

test("offline cutoff removes synthetic tail, preserves history and leaves the right side empty", () => {
  const cutoff = now - 900000
  const result = summarizeCardPing([point(cutoff, 80), point(now, 80)], now, false, cutoff)
  assert.equal(result.latency, null)
  assert.equal(result.loss, null)
  assert.equal(result.lastTime, cutoff)
  assert.equal(
    result.buckets.slice(23).every((bucket) => bucket.count === 0),
    true,
  )
  assert.equal(
    result.buckets.some((bucket) => bucket.latency === 80),
    true,
  )
})

test("stale readings become unavailable while their history stays visible", () => {
  const result = summarizeCardPing([point(now - 600000, 90)], now, true, now)
  assert.equal(result.stale, true)
  assert.equal(result.latency, null)
  assert.equal(result.loss, null)
  assert.equal(
    result.buckets.some((bucket) => bucket.latency === 90),
    true,
  )
})
