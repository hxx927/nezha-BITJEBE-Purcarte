import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CardPingBucket, CardPingData, cardPingSelectors, resolveCardPingTask, summarizeCardPing } from "@/lib/card-ping"
import { cn } from "@/lib/utils"
import type { NezhaServer } from "@/types/nezha-api"
import { Portal } from "@radix-ui/react-tooltip"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

function latencyColor(value: number | null) {
  return value === null ? "bg-muted-foreground/15" : value <= 100 ? "bg-green-500" : value <= 200 ? "bg-amber-400" : "bg-red-500"
}

function lossColor(value: number | null) {
  return value === null ? "bg-muted-foreground/15" : value === 0 ? "bg-green-500" : value <= 5 ? "bg-amber-400" : "bg-red-500"
}

function PingLine({
  name,
  summary,
  status,
  unavailable,
}: {
  name: string
  summary: ReturnType<typeof summarizeCardPing>
  status: string
  unavailable: boolean
}) {
  const { t } = useTranslation()
  const [hover, setHover] = useState<{ index: number; metric: "latency" | "loss" } | null>(null)
  const point = hover ? summary.buckets[hover.index] : null
  const time = (value: number) => new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const valueLabel = (value: number | null, unit: string) =>
    value === null ? "--" : `${unit === "ms" ? Math.round(value) : value.toFixed(1)} ${unit}`
  const bars = (metric: "latency" | "loss") => (
    <span data-ping-metric={metric} className="grid h-2 min-w-0 grid-cols-[repeat(30,minmax(0,1fr))] gap-px" aria-hidden="true">
      {summary.buckets.map((bucket: CardPingBucket, index: number) => (
        <span
          key={index}
          data-ping-value={bucket[metric] ?? "missing"}
          className={cn(
            "rounded-[1px]",
            metric === "latency" ? latencyColor(bucket.latency) : lossColor(bucket.loss),
            hover?.index === index && hover.metric === metric && "ring-1 ring-foreground",
          )}
        />
      ))}
    </span>
  )
  return (
    <Tooltip open={hover !== null}>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-card-ping-line={name}
          className="block w-full min-w-0 space-y-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${name}, ${status || `${t("monitor.avgDelay")} ${valueLabel(summary.latency, "ms")}, ${t("monitor.packetLoss")} ${valueLabel(summary.loss, "%")}`}. ${t("cardPing.keyboard")}`}
          onClick={(event) => event.stopPropagation()}
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect()
            const width = (bounds.width - 12) / 2
            const x = event.clientX - bounds.left
            const metric = x < width + 6 ? "latency" : "loss"
            const relative = metric === "latency" ? x : x - width - 12
            setHover({ metric, index: Math.max(0, Math.min(29, Math.floor((relative / width) * 30))) })
          }}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover({ index: 29, metric: "latency" })}
          onBlur={() => setHover(null)}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === "Escape") setHover(null)
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault()
              setHover((previous) => ({
                metric: previous?.metric ?? "latency",
                index: Math.max(0, Math.min(29, (previous?.index ?? 29) + (event.key === "ArrowLeft" ? -1 : 1))),
              }))
            }
          }}
        >
          <span className="grid grid-cols-2 gap-3 text-[11px] leading-4">
            <span className="flex min-w-0 items-baseline justify-between gap-1">
              <span className="truncate font-medium" title={name}>
                {name}
              </span>
              <span className={cn("shrink-0 tabular-nums", unavailable ? "text-muted-foreground" : "text-foreground")}>
                {valueLabel(unavailable ? null : summary.latency, "ms")}
              </span>
            </span>
            <span className={cn("truncate text-right tabular-nums", unavailable ? "text-muted-foreground" : "text-foreground")}>
              {status || valueLabel(summary.loss, "%")}
            </span>
          </span>
          <span className="grid grid-cols-2 gap-3">
            {bars("latency")}
            {bars("loss")}
          </span>
        </button>
      </TooltipTrigger>
      <Portal>
        <TooltipContent side="top" className="max-w-[min(90vw,20rem)] px-2 py-1.5 text-[11px]">
          <div className="font-medium">
            {name} · {point ? `${time(point.start)}–${time(point.end)}` : "--"}
          </div>
          <div>
            {point?.count
              ? `${t("monitor.avgDelay")} ${valueLabel(point.latency, "ms")} · ${t("monitor.packetLoss")} ${valueLabel(point.loss, "%")}`
              : t("cardPing.noSamples")}
          </div>
        </TooltipContent>
      </Portal>
    </Tooltip>
  )
}

export default function ServerCardPing({
  server,
  online,
  now,
  data,
  loading,
  error,
}: {
  server: NezhaServer
  online: boolean
  now: number
  data?: CardPingData
  loading: boolean
  error: boolean
}) {
  const { t } = useTranslation()
  const settings = window as unknown as Record<string, unknown>
  const lines = useMemo(() => {
    const samples = data?.samples[server.uuid || ""] || {}
    const tasks = data?.tasks || []
    const lastActive = Date.parse(server.last_active)
    const available = tasks.filter((task) => task.clients?.includes(server.uuid || "") || samples[task.id]?.length)
    return cardPingSelectors(server, settings).map((selector) => {
      const task = resolveCardPingTask(selector, available) || resolveCardPingTask(selector, tasks)
      const summary = summarizeCardPing(task ? samples[task.id] || [] : [], now, online, Number.isFinite(lastActive) ? lastActive : null)
      const status = !online
        ? "--"
        : error
          ? t("cardPing.error")
          : !data && loading
            ? t("cardPing.loading")
            : !task || summary.lastTime === null
              ? t("cardPing.noData")
              : summary.stale
                ? t("cardPing.stale")
                : ""
      return { name: task?.name || String(selector), summary, status, unavailable: !online || error || summary.stale }
    })
  }, [
    data,
    server.uuid,
    server.id,
    server.name,
    server.last_active,
    online,
    now,
    settings.CardPingTasks,
    settings.CardPingTaskOverrides,
    loading,
    error,
    t,
  ])
  const lastTime = Math.max(0, ...lines.map((line) => line.summary.lastTime || 0))
  return (
    <section className="space-y-1.5 border-t pt-1.5" data-card-ping aria-label={t("cardPing.title")}>
      <div className="flex items-center justify-between gap-1 text-[11px] leading-4">
        <span className="font-medium">{t("cardPing.title")}</span>
        <span className={cn("truncate", online ? "text-muted-foreground" : "text-red-600 dark:text-red-300")}>
          {online ? t("cardPing.window") : t("monitor.monitoringInterrupted")}
        </span>
      </div>
      <TooltipProvider delayDuration={0}>
        {lines.map((line, index) => (
          <PingLine key={`${index}:${line.name}`} {...line} />
        ))}
      </TooltipProvider>
      {!online && lastTime > 0 && (
        <div className="truncate text-[10px] text-muted-foreground">
          {t("monitor.lastMonitoredAt", { time: new Date(lastTime).toLocaleTimeString() })}
        </div>
      )}
    </section>
  )
}
