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
  capsules,
}: {
  name: string
  summary: ReturnType<typeof summarizeCardPing>
  status: string
  unavailable: boolean
  capsules: boolean
}) {
  const { t } = useTranslation()
  const [hover, setHover] = useState<{ index: number; metric: "latency" | "loss" } | null>(null)
  const point = hover ? summary.buckets[hover.index] : null
  const time = (value: number) => new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const valueLabel = (value: number | null, unit: string) =>
    value === null ? "--" : `${unit === "ms" ? Math.round(value) : value.toFixed(1)} ${unit}`
  const bars = (metric: "latency" | "loss") => (
    <span data-ping-metric={metric} className="grid h-[4.5px] min-w-0 grid-cols-[repeat(30,minmax(0,1fr))] gap-px" aria-hidden="true">
      {summary.buckets.map((bucket: CardPingBucket, index: number) => (
        <span
          key={index}
          data-ping-value={bucket[metric] ?? "missing"}
          className={cn(
            "rounded-[0.5px]",
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
          className={cn(
            "block w-full min-w-0 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            capsules
              ? "h-full border border-foreground/10 bg-foreground/[0.04] px-1 py-1 text-center hover:bg-foreground/[0.08]"
              : "space-y-0.5 px-0.5 py-px text-left hover:bg-foreground/[0.04]",
          )}
          aria-label={`${name}, ${status || `${t("monitor.avgDelay")} ${valueLabel(summary.latency, "ms")}, ${t("monitor.packetLoss")} ${valueLabel(summary.loss, "%")}`}${capsules ? "" : `. ${t("cardPing.keyboard")}`}`}
          onClick={(event) => event.stopPropagation()}
          onPointerMove={(event) => {
            if (capsules) {
              setHover({ index: 29, metric: "latency" })
              return
            }
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
            if (!capsules && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
              event.preventDefault()
              setHover((previous) => ({
                metric: previous?.metric ?? "latency",
                index: Math.max(0, Math.min(29, (previous?.index ?? 29) + (event.key === "ArrowLeft" ? -1 : 1))),
              }))
            }
          }}
        >
          {capsules ? (
            <span className="flex min-w-0 flex-col items-center gap-0.5 text-[11px] leading-[13px]">
              <span className="w-full whitespace-normal break-words font-medium [overflow-wrap:anywhere]">{name}</span>
              <span className={cn("whitespace-nowrap tabular-nums", unavailable ? "text-muted-foreground" : "text-foreground")}>
                {valueLabel(unavailable ? null : summary.latency, "ms")}
              </span>
              <span className="w-full break-words text-[10px] text-muted-foreground" aria-label={t("monitor.packetLoss")}>
                {status && status !== "--" ? (
                  status
                ) : (
                  <span className="whitespace-nowrap tabular-nums">{valueLabel(unavailable ? null : summary.loss, "%")}</span>
                )}
              </span>
            </span>
          ) : (
            <>
              <span className="grid grid-cols-2 gap-3 text-[10.5px] leading-[13px]">
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
            </>
          )}
        </button>
      </TooltipTrigger>
      <Portal>
        <TooltipContent side="top" className="max-w-[min(90vw,20rem)] px-2 py-1.5 text-[11px]">
          <div className="font-medium">
            {name} · {capsules ? (summary.lastTime ? time(summary.lastTime) : "--") : point ? `${time(point.start)}–${time(point.end)}` : "--"}
          </div>
          <div>
            {capsules
              ? `${t("monitor.avgDelay")} ${valueLabel(unavailable ? null : summary.latency, "ms")} · ${t("monitor.packetLoss")} ${valueLabel(unavailable ? null : summary.loss, "%")}${status ? ` · ${status}` : ""}`
              : point?.count
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
  const capsules = settings.CardPingDisplayMode === "capsules"
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
    <section
      className="space-y-1 border-t pt-1"
      data-card-ping="true"
      data-ping-display={capsules ? "capsules" : "bars"}
      aria-label={t("cardPing.title")}
    >
      {(!capsules || !online) && (
        <div className="flex items-center justify-between gap-1 text-[10px] leading-[13px]">
          <span className="font-medium">{t("cardPing.title")}</span>
          <span className={cn("truncate", online ? "text-muted-foreground" : "text-red-600 dark:text-red-300")}>
            {online ? t("cardPing.window") : t("monitor.monitoringInterrupted")}
          </span>
        </div>
      )}
      <TooltipProvider delayDuration={0}>
        <div
          className={capsules ? "server-card-ping-lines grid items-stretch gap-1" : "server-card-ping-lines grid gap-0.5"}
          style={capsules ? { gridTemplateColumns: `repeat(${lines.length}, minmax(0, 1fr))` } : undefined}
        >
          {lines.map((line, index) => (
            <PingLine key={`${index}:${line.name}:${capsules}`} {...line} capsules={capsules} />
          ))}
        </div>
      </TooltipProvider>
      {!online && lastTime > 0 && (
        <div className="truncate text-[10px] text-muted-foreground">
          {t("monitor.lastMonitoredAt", { time: new Date(lastTime).toLocaleTimeString() })}
        </div>
      )}
    </section>
  )
}
