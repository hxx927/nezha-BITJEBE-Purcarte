import { NetworkChart } from "@/components/NetworkChart"
import ServerDetailChart from "@/components/ServerDetailChart"
import ServerDetailOverview from "@/components/ServerDetailOverview"
import TabSwitch from "@/components/TabSwitch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

export type ServerDetailRange = 0 | 1 | 4

export default function ServerDetail() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [])

  const tabs = ["Detail", "Network"]
  const [currentTab, setCurrentTab] = useState(tabs[0])
  const [detailRange, setDetailRange] = useState<ServerDetailRange>(0)

  const { id: server_id } = useParams()

  if (!server_id) {
    navigate("/404")
    return null
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-4 px-0 sm:w-[85vw] server-info">
      <ServerDetailOverview server_id={server_id} />
      <section className="my-1 flex w-full flex-col items-center gap-2 py-1">
        <div className="flex justify-center">
          <TabSwitch tabs={tabs} currentTab={currentTab} setCurrentTab={setCurrentTab} />
        </div>
        {currentTab === tabs[0] && (
          <div className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-card/80 p-1 shadow-sm">
            {([0, 1, 4] as ServerDetailRange[]).map((hours) => (
              <Button
                key={hours}
                type="button"
                size="sm"
                variant={detailRange === hours ? "default" : "ghost"}
                className={cn("h-8 rounded-md px-3", detailRange !== hours && "text-muted-foreground")}
                onClick={() => setDetailRange(hours)}
              >
                {hours === 0 ? t("serverDetail.realtime") : t(`serverDetail.last${hours}Hours`)}
              </Button>
            ))}
          </div>
        )}
      </section>
      <div style={{ display: currentTab === tabs[0] ? "block" : "none" }}>
        <ServerDetailChart server_id={server_id} hours={detailRange} />
      </div>
      <div style={{ display: currentTab === tabs[1] ? "block" : "none" }}>
        <NetworkChart server_id={Number(server_id)} show={currentTab === tabs[1]} />
      </div>
    </div>
  )
}
