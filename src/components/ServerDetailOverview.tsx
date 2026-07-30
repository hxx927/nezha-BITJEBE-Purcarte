import ServerFlag from "@/components/ServerFlag"
import { ServerDetailLoading } from "@/components/loading/ServerDetailLoading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { formatBytes } from "@/lib/format"
import { cn, formatNezhaInfo } from "@/lib/utils"
import { NezhaWebsocketResponse } from "@/types/nezha-api"
import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react"
import { ReactNode, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

type DetailItemProps = {
  label: string
  value: ReactNode
  className?: string
}

function DetailItem({ label, value, className }: DetailItemProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium leading-5">{value}</dd>
    </div>
  )
}

export default function ServerDetailOverview({ server_id }: { server_id: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [hasHistory, setHasHistory] = useState(false)
  const { lastMessage, connected } = useWebSocketContext()

  useEffect(() => {
    setHasHistory(Boolean(sessionStorage.getItem("fromMainPage")))
  }, [])

  if (!connected && !lastMessage) {
    return <ServerDetailLoading />
  }

  const nezhaWsData = lastMessage ? (JSON.parse(lastMessage.data) as NezhaWebsocketResponse) : null
  const server = nezhaWsData?.servers.find((item) => item.id === Number(server_id))

  if (!nezhaWsData || !server) {
    return <ServerDetailLoading />
  }

  const info = formatNezhaInfo(nezhaWsData.now, server)
  const {
    name,
    online,
    uptime,
    version,
    arch,
    mem_total,
    swap_total,
    disk_total,
    country_code,
    platform,
    platform_version,
    cpu_info,
    cpu_cores,
    gpu_info,
    load_1,
    load_5,
    load_15,
    net_out_transfer,
    net_in_transfer,
    last_active_time_string,
    boot_time_string,
  } = info

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined
  const uptimeText =
    uptime / 86400 >= 1
      ? `${Math.floor(uptime / 86400)} ${t("serverDetail.days")} ${Math.floor((uptime % 86400) / 3600)} ${t("serverDetail.hours")}`
      : `${Math.floor(uptime / 3600)} ${t("serverDetail.hours")}`
  const systemText = [platform, platform_version].filter(Boolean).join(" - ") || t("serverDetail.unknown")
  const virtualization = server.host.virtualization
  const temperatures = server.state.temperatures || []

  const goBack = () => {
    if (hasHistory) {
      navigate(-1)
      return
    }
    navigate("/")
  }

  return (
    <Card className={cn("overflow-hidden", { "bg-card/70": customBackgroundImage })}>
      <CardContent className="p-4 sm:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="secondary" size="icon" className="size-9 shrink-0" onClick={goBack} aria-label={t("error.backToHome")}>
              <ArrowLeft />
            </Button>
            {country_code && <ServerFlag className="shrink-0 text-2xl" country_code={country_code} />}
            <h1 className="min-w-0 break-words text-xl font-semibold leading-tight sm:text-2xl">{name}</h1>
          </div>
          <Badge
            variant="secondary"
            className={cn("gap-1.5 rounded-md px-2.5 py-1 text-xs", {
              "bg-green-500/15 text-green-700 dark:text-green-300": online,
              "bg-red-500/15 text-red-700 dark:text-red-300": !online,
            })}
          >
            <span className={cn("size-2 rounded-full", online ? "bg-green-500" : "bg-red-500")} />
            {online ? t("serverDetail.online") : t("serverDetail.offline")}
          </Badge>
        </header>

        <section className="mt-5 border-t border-border/70 pt-4">
          <h2 className="mb-4 text-sm font-semibold">{t("serverCard.instanceDetails", { defaultValue: t("tabSwitch.Detail") })}</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem
              label="CPU"
              value={`${cpu_info.join(", ") || t("serverDetail.unknown")}${cpu_cores ? ` (${cpu_cores} ${t("serverCard.cores", { defaultValue: "Cores" })})` : ""}`}
              className="lg:col-span-2"
            />
            <DetailItem label={t("serverDetail.system")} value={systemText} className="lg:col-span-2" />
            <DetailItem label={t("serverDetail.arch")} value={arch || t("serverDetail.unknown")} />
            {virtualization && <DetailItem label={t("serverDetail.virtualization")} value={virtualization} />}
            {version && <DetailItem label={t("serverDetail.version")} value={version} />}
            {country_code && (
              <DetailItem
                label={t("serverDetail.region")}
                value={
                  <span className="inline-flex items-center gap-1.5">
                    {country_code.toUpperCase()}
                    <ServerFlag className="text-sm" country_code={country_code} />
                  </span>
                }
              />
            )}
            {gpu_info.length > 0 && <DetailItem label="GPU" value={gpu_info.join(", ")} className="sm:col-span-2" />}
          </dl>
        </section>

        <section className="mt-5 border-t border-border/70 pt-4">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem
              label={t("serverDetail.mem")}
              value={mem_total ? `${formatBytes(server.state.mem_used)} / ${formatBytes(mem_total)}` : t("serverDetail.unknown")}
            />
            <DetailItem
              label={t("serverDetail.swap")}
              value={swap_total ? `${formatBytes(server.state.swap_used)} / ${formatBytes(swap_total)}` : t("serverDetail.disabled")}
            />
            <DetailItem
              label={t("serverDetail.disk")}
              value={disk_total ? `${formatBytes(server.state.disk_used)} / ${formatBytes(disk_total)}` : t("serverDetail.unknown")}
            />
            <DetailItem label={t("serverDetail.loadAverage")} value={`${load_1} | ${load_5} | ${load_15}`} />
            <DetailItem
              label={t("serverDetail.realtimeNetwork")}
              value={
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <ArrowUp className="size-3.5 text-emerald-500" />
                    {formatBytes(server.state.net_out_speed)}/s
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ArrowDown className="size-3.5 text-violet-500" />
                    {formatBytes(server.state.net_in_speed)}/s
                  </span>
                </span>
              }
              className="lg:col-span-2"
            />
            <DetailItem
              label={t("serverDetail.totalTraffic")}
              value={
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <ArrowUp className="size-3.5 text-emerald-500" />
                    {formatBytes(net_out_transfer)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ArrowDown className="size-3.5 text-violet-500" />
                    {formatBytes(net_in_transfer)}
                  </span>
                </span>
              }
              className="lg:col-span-2"
            />
            <DetailItem label={t("serverDetail.uptime")} value={online ? uptimeText : t("serverDetail.offline")} />
            <DetailItem label={t("serverDetail.bootTime")} value={boot_time_string || t("serverDetail.unknown")} />
            <DetailItem label={t("serverDetail.lastActive")} value={last_active_time_string || t("serverDetail.unknown")} />
            {temperatures.length > 0 && (
              <DetailItem
                label={t("serverDetail.temperature")}
                value={temperatures.map((item) => `${item.Name}: ${item.Temperature.toFixed(1)} °C`).join(" · ")}
              />
            )}
          </dl>
        </section>
      </CardContent>
    </Card>
  )
}
