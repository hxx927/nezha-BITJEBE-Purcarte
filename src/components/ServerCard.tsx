import ServerCardDetailsDialog from "@/components/ServerCardDetailsDialog"
import ServerFlag from "@/components/ServerFlag"
import TrafficCircle from "@/components/TrafficCircle"
import { Progress } from "@/components/ui/progress"
import { formatBytes } from "@/lib/format"
import { GetFontLogoClass, GetPlatformLogoColor, MageMicrosoftWindows } from "@/lib/logo-class"
import { calcTrafficUsed, cn, formatBillingAmount, formatNezhaInfo, getDaysBetweenDatesWithAutoRenewal, parsePublicNote } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"
import { Cpu, HardDrive, Info, MemoryStick, Server } from "lucide-react"
import { type KeyboardEvent, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import PlanInfo from "./PlanInfo"
import { Card } from "./ui/card"

type ResourceRowProps = {
  label: string
  value: number
  valueLabel?: string
  disabled?: boolean
}

function ResourceRow({ label, value, valueLabel, disabled }: ResourceRowProps) {
  const normalizedValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
  const indicatorClassName = disabled
    ? "bg-muted-foreground/30"
    : normalizedValue > 90
      ? "bg-red-500"
      : normalizedValue > 70
        ? "bg-orange-400"
        : "bg-green-500"

  return (
    <div className="grid min-h-5 grid-cols-[3rem_minmax(0,1fr)_2.75rem] items-center gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Progress
        value={normalizedValue}
        className="h-2 bg-secondary/80"
        indicatorClassName={indicatorClassName}
        aria-label={`${label} ${valueLabel || `${normalizedValue.toFixed(0)}%`}`}
      />
      <span className="text-right tabular-nums text-foreground">{valueLabel || `${normalizedValue.toFixed(0)}%`}</span>
    </div>
  )
}

function formatUptime(uptime: number, daysLabel: string, hoursLabel: string) {
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  return days > 0 ? `${days}${daysLabel}${hours}${hoursLabel}` : `${hours}${hoursLabel}`
}

function formatExpiryDate(value?: string) {
  if (!value || value.startsWith("0000-00-00")) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  return date.toLocaleDateString()
}

function formatTrafficLimitType(type: string) {
  switch (type) {
    case "max":
      return "较大值"
    case "min":
      return "较小值"
    case "up":
      return "单向上行"
    case "down":
      return "单向下行"
    default:
      return "双向"
  }
}

export default function ServerCard({ now, serverInfo }: { now: number; serverInfo: NezhaServer }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const {
    name,
    country_code,
    online,
    cpu,
    up,
    down,
    mem,
    swap,
    stg,
    uptime,
    mem_total,
    swap_total,
    disk_total,
    load_1,
    load_5,
    load_15,
    net_in_transfer,
    net_out_transfer,
    last_active_time_string,
    public_note,
    platform,
    traffic_limit,
    traffic_limit_type,
    expired_at,
    cpu_cores,
  } = formatNezhaInfo(now, serverInfo)

  const parsedData = parsePublicNote(public_note)
  const billingData = parsedData?.billingDataMod
  const showTrafficBar = (window as unknown as Record<string, unknown>).ShowTrafficBar !== false
  const showTrafficPercent = (window as unknown as Record<string, unknown>).TrafficBarShowPercent !== false
  const showTrafficBillingMode = (window as unknown as Record<string, unknown>).TrafficBarShowBillingMode !== false
  const trafficUsed = calcTrafficUsed(net_out_transfer, net_in_transfer, traffic_limit_type)
  const trafficPercentage = traffic_limit > 0 ? Math.min(100, (trafficUsed / traffic_limit) * 100) : 0

  let billingPrice: string | null = null
  let remainingDays: number | null = null
  if (billingData) {
    if (billingData.amount === "-1") {
      billingPrice = t("billingInfo.free")
    } else if (billingData.amount && billingData.amount !== "0") {
      billingPrice = `${formatBillingAmount(billingData.amount, billingData.currency)}/${billingData.cycle}`
    }

    if (billingData.endDate && !billingData.endDate.startsWith("0000-00-00")) {
      try {
        remainingDays = getDaysBetweenDatesWithAutoRenewal(billingData).days
      } catch {
        remainingDays = null
      }
    }
  }

  const expiryDate = formatExpiryDate(billingData?.endDate || expired_at)

  const openServerDetail = () => {
    sessionStorage.setItem("fromMainPage", "true")
    navigate(`/server/${serverInfo.id}`)
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      openServerDetail()
    }
  }

  return (
    <>
      <Card
        role="link"
        tabIndex={0}
        className={cn(
          "group flex h-full w-full cursor-pointer flex-col gap-1.5 overflow-hidden px-2.5 py-3 transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !online && "server-card-offline border-red-500/80 ring-2 ring-red-500/55 shadow-[0_10px_30px_rgba(220,38,38,0.24)]",
        )}
        onClick={openServerDetail}
        onKeyDown={handleCardKeyDown}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={cn("size-2 shrink-0 rounded-full", online ? "bg-green-500" : "bg-red-500")} aria-hidden="true" />
            <ServerFlag country_code={country_code} className="shrink-0 text-xl" />
            <span
              className="flex size-6 shrink-0 items-center justify-center text-lg text-foreground"
              style={{ color: GetPlatformLogoColor(platform) }}
              aria-hidden="true"
            >
              {platform.includes("Windows") ? (
                <MageMicrosoftWindows className="size-5" />
              ) : platform ? (
                <span className={`fl-${GetFontLogoClass(platform)}`} />
              ) : (
                <Server className="size-5" />
              )}
            </span>
            <h2 className="truncate text-lg font-bold leading-tight">{name}</h2>
          </div>
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("serverCard.details")}
            title={t("serverCard.details")}
            onClick={(event) => {
              event.stopPropagation()
              setDetailsOpen(true)
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Info className="size-5" />
          </button>
        </div>

        {(billingPrice || remainingDays !== null) && (
          <div className="flex flex-wrap gap-1.5">
            {billingPrice && (
              <span className="rounded border border-red-200/70 bg-red-50/80 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-red-600 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
                {billingPrice}
              </span>
            )}
            {remainingDays !== null && (
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-4",
                  remainingDays >= 0
                    ? "border-green-200/70 bg-green-50/80 text-green-700 dark:border-green-900/60 dark:bg-green-950/50 dark:text-green-300"
                    : "border-red-200/70 bg-red-50/80 text-red-600 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300",
                )}
              >
                {remainingDays >= 0
                  ? `${t("billingInfo.remaining")} ${remainingDays} ${t("billingInfo.days")}`
                  : `${t("billingInfo.expired")} ${Math.abs(remainingDays)} ${t("billingInfo.days")}`}
              </span>
            )}
          </div>
        )}

        {parsedData?.planDataMod && <PlanInfo parsedData={parsedData} />}

        <div className="grid grid-cols-3 gap-1 border-y py-1.5 text-center text-xs">
          <div className="flex min-w-0 items-center justify-center gap-1">
            <Cpu className="size-3.5 shrink-0 text-blue-600" />
            <span className="truncate">{cpu_cores > 0 ? `${cpu_cores} ${t("serverCard.cores")}` : t("serverDetail.unknown")}</span>
          </div>
          <div className="flex min-w-0 items-center justify-center gap-1">
            <MemoryStick className="size-3.5 shrink-0 text-green-600" />
            <span className="truncate">{formatBytes(mem_total)}</span>
          </div>
          <div className="flex min-w-0 items-center justify-center gap-1">
            <HardDrive className="size-3.5 shrink-0 text-red-600" />
            <span className="truncate">{formatBytes(disk_total)}</span>
          </div>
        </div>

        <div className="space-y-0.5">
          <ResourceRow label="CPU" value={online ? cpu : 0} />
          <ResourceRow label={t("serverCard.mem")} value={online ? mem : 0} />
          <ResourceRow
            label={t("serverCard.swap")}
            value={online ? swap : 0}
            valueLabel={swap_total > 0 ? undefined : t("serverCard.disabled")}
            disabled={swap_total <= 0}
          />
          <ResourceRow label={t("serverCard.stg")} value={online ? stg : 0} />
        </div>

        <div className="mt-auto space-y-1 border-t pt-2 text-sm">
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-1.5">
            <span className="whitespace-nowrap font-medium">{t("serverCard.network")}</span>
            <span className="truncate text-right text-xs tabular-nums text-foreground">
              ↑ {formatBytes(up * 1024 * 1024)}/s&nbsp;&nbsp;↓ {formatBytes(down * 1024 * 1024)}/s
            </span>
          </div>
          <div className="grid min-h-9 grid-cols-[3rem_minmax(0,1fr)] items-center gap-1.5">
            <span className="whitespace-nowrap font-medium">{t("serverCard.traffic")}</span>
            <div className="flex min-w-0 items-center gap-1.5">
              {traffic_limit > 0 && showTrafficBar && (
                <TrafficCircle value={trafficPercentage} showPercentage={showTrafficPercent} />
              )}
              <div className="min-w-0 flex-1 text-right text-xs leading-4 tabular-nums text-foreground">
                <div className="truncate">
                  ↑ {formatBytes(net_out_transfer)}&nbsp;&nbsp;↓ {formatBytes(net_in_transfer)}
                </div>
                {traffic_limit > 0 && showTrafficBar && (
                  <div className="truncate">
                    {formatBytes(traffic_limit)}
                    {showTrafficBillingMode ? ` (${formatTrafficLimitType(traffic_limit_type)})` : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-1.5">
            <span className="whitespace-nowrap font-medium">{t("serverCard.load")}</span>
            <span className="truncate text-right tabular-nums text-foreground">
              {load_1} | {load_5} | {load_15}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 border-t pt-1.5 text-[11px]">
            <div className="min-w-0 truncate">
              <span className="mr-1">{t("serverCard.expires")}:</span>
              <span>{expiryDate || t("serverDetail.unknown")}</span>
            </div>
            <div className="min-w-0 truncate text-right">
              <span className="mr-1">{online ? t("online") : t("offline")}:</span>
              <span>{online ? formatUptime(uptime, t("serverCard.days"), t("serverCard.hours")) : last_active_time_string || t("serverDetail.unknown")}</span>
            </div>
          </div>
        </div>
      </Card>

      <ServerCardDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} now={now} serverInfo={serverInfo} />
    </>
  )
}
