import { NetworkChart } from "@/components/NetworkChart"
import ServerFlag from "@/components/ServerFlag"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatBytes } from "@/lib/format"
import { calcTrafficUsed, cn, formatNezhaInfo } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"
import { type ReactNode } from "react"
import { useTranslation } from "react-i18next"

type DetailsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  now: number
  serverInfo: NezhaServer
}

function InfoItem({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="break-words text-sm font-medium">{value}</div>
    </div>
  )
}

function formatUptime(uptime: number, daysLabel: string, hoursLabel: string) {
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  return days > 0 ? `${days} ${daysLabel} ${hours} ${hoursLabel}` : `${hours} ${hoursLabel}`
}

export default function ServerCardDetailsDialog({ open, onOpenChange, now, serverInfo }: DetailsDialogProps) {
  const { t } = useTranslation()
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
    load_1,
    load_5,
    load_15,
    net_out_transfer,
    net_in_transfer,
    last_active_time_string,
    boot_time_string,
    traffic_limit,
    traffic_limit_type,
  } = formatNezhaInfo(now, serverInfo)

  const trafficUsed = calcTrafficUsed(net_out_transfer, net_in_transfer, traffic_limit_type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto bg-background p-4 sm:p-6">
        <DialogHeader className="pr-8">
          <div className="flex min-w-0 items-center gap-2">
            <ServerFlag country_code={country_code} className="shrink-0 text-xl" />
            <DialogTitle className="truncate">{name}</DialogTitle>
            <Badge className={cn("shrink-0 rounded-md px-1.5 py-0 text-[10px] text-white", online ? "bg-green-600" : "bg-red-600")}>
              {online ? t("online") : t("offline")}
            </Badge>
          </div>
          <DialogDescription>{t("serverCard.detailsDescription")}</DialogDescription>
        </DialogHeader>

        <Card className="shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">{t("serverCard.instanceDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-5 gap-y-4 p-4 pt-2 sm:grid-cols-3 lg:grid-cols-4">
            <InfoItem
              label="CPU"
              value={`${cpu_info.length > 0 ? cpu_info.join(", ") : t("serverDetail.unknown")}${cpu_cores > 0 ? ` (x${cpu_cores})` : ""}`}
              className="col-span-2"
            />
            <InfoItem label={t("serverDetail.arch")} value={arch || t("serverDetail.unknown")} />
            <InfoItem
              label={t("serverDetail.system")}
              value={`${platform || t("serverDetail.unknown")}${platform_version ? ` ${platform_version}` : ""}`}
            />
            <InfoItem label={t("serverDetail.mem")} value={`${formatBytes(serverInfo.state.mem_used)} / ${formatBytes(mem_total)}`} />
            <InfoItem
              label={t("serverCard.swap")}
              value={swap_total > 0 ? `${formatBytes(serverInfo.state.swap_used)} / ${formatBytes(swap_total)}` : t("serverCard.disabled")}
            />
            <InfoItem label={t("serverDetail.disk")} value={`${formatBytes(serverInfo.state.disk_used)} / ${formatBytes(disk_total)}`} />
            <InfoItem label={t("serverDetail.region")} value={country_code ? country_code.toUpperCase() : t("serverDetail.unknown")} />
            <InfoItem
              label={t("serverCard.network")}
              value={`${t("serverCard.upload")} ${formatBytes(serverInfo.state.net_out_speed)}/s ${t("serverCard.download")} ${formatBytes(serverInfo.state.net_in_speed)}/s`}
              className="col-span-2"
            />
            <InfoItem
              label={t("serverCard.traffic")}
              value={`${t("serverCard.upload")} ${formatBytes(net_out_transfer)} ${t("serverCard.download")} ${formatBytes(net_in_transfer)}${traffic_limit > 0 ? ` (${formatBytes(trafficUsed)} / ${formatBytes(traffic_limit)})` : ""}`}
              className="col-span-2"
            />
            <InfoItem label={t("serverCard.load")} value={`${load_1} | ${load_5} | ${load_15}`} />
            <InfoItem
              label={t("serverCard.uptime")}
              value={online ? formatUptime(uptime, t("serverCard.days"), t("serverCard.hours")) : t("offline")}
            />
            <InfoItem label={t("serverDetail.version")} value={version || t("serverDetail.unknown")} />
            <InfoItem label={t("serverDetail.bootTime")} value={boot_time_string || t("serverDetail.unknown")} />
            <InfoItem label={t("serverDetail.lastActive")} value={last_active_time_string || t("serverDetail.unknown")} className="col-span-2" />
          </CardContent>
        </Card>

        {open && <NetworkChart server_id={serverInfo.id} show={open} />}
      </DialogContent>
    </Dialog>
  )
}
