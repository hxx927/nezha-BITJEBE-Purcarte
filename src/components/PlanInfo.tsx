import { PublicNoteData, cn } from "@/lib/utils"
import { type CSSProperties, type ReactNode } from "react"

const TAG_COLORS = {
  gray: { className: "bg-gray-600 text-gray-200 dark:bg-gray-800 dark:text-gray-300", value: "#4b5563" },
  gold: { className: "bg-amber-600 text-amber-200 dark:bg-amber-800 dark:text-amber-300", value: "#b45309" },
  bronze: { className: "bg-amber-700 text-amber-200 dark:bg-amber-900 dark:text-amber-300", value: "#92400e" },
  brown: { className: "bg-amber-800 text-amber-200 dark:bg-amber-950 dark:text-amber-300", value: "#78350f" },
  yellow: { className: "bg-yellow-600 text-yellow-200 dark:bg-yellow-800 dark:text-yellow-300", value: "#a16207" },
  amber: { className: "bg-amber-600 text-amber-200 dark:bg-amber-800 dark:text-amber-300", value: "#b45309" },
  orange: { className: "bg-orange-600 text-orange-200 dark:bg-orange-800 dark:text-orange-300", value: "#c2410c" },
  tomato: { className: "bg-red-500 text-red-100 dark:bg-red-700 dark:text-red-200", value: "#dc2626" },
  red: { className: "bg-red-600 text-red-200 dark:bg-red-800 dark:text-red-300", value: "#dc2626" },
  ruby: { className: "bg-rose-600 text-rose-200 dark:bg-rose-800 dark:text-rose-300", value: "#e11d48" },
  crimson: { className: "bg-rose-600 text-rose-200 dark:bg-rose-800 dark:text-rose-300", value: "#e11d48" },
  pink: { className: "bg-pink-600 text-pink-200 dark:bg-pink-800 dark:text-pink-300", value: "#db2777" },
  plum: { className: "bg-fuchsia-600 text-fuchsia-200 dark:bg-fuchsia-800 dark:text-fuchsia-300", value: "#c026d3" },
  purple: { className: "bg-purple-600 text-purple-200 dark:bg-purple-800 dark:text-purple-300", value: "#9333ea" },
  violet: { className: "bg-violet-600 text-violet-200 dark:bg-violet-800 dark:text-violet-300", value: "#7c3aed" },
  iris: { className: "bg-indigo-600 text-indigo-200 dark:bg-indigo-800 dark:text-indigo-300", value: "#4f46e5" },
  indigo: { className: "bg-indigo-600 text-indigo-200 dark:bg-indigo-800 dark:text-indigo-300", value: "#4f46e5" },
  blue: { className: "bg-blue-600 text-blue-200 dark:bg-blue-800 dark:text-blue-300", value: "#2563eb" },
  cyan: { className: "bg-cyan-600 text-cyan-200 dark:bg-cyan-800 dark:text-cyan-300", value: "#0891b2" },
  teal: { className: "bg-teal-600 text-teal-200 dark:bg-teal-800 dark:text-teal-300", value: "#0f766e" },
  jade: { className: "bg-emerald-600 text-emerald-200 dark:bg-emerald-800 dark:text-emerald-300", value: "#059669" },
  green: { className: "bg-green-600 text-green-200 dark:bg-green-800 dark:text-green-300", value: "#16a34a" },
  grass: { className: "bg-green-600 text-green-200 dark:bg-green-800 dark:text-green-300", value: "#16a34a" },
  lime: { className: "bg-lime-600 text-lime-200 dark:bg-lime-800 dark:text-lime-300", value: "#65a30d" },
  mint: { className: "bg-emerald-500 text-emerald-100 dark:bg-emerald-700 dark:text-emerald-200", value: "#10b981" },
  sky: { className: "bg-sky-600 text-sky-200 dark:bg-sky-800 dark:text-sky-300", value: "#0284c7" },
}

type TagColor = keyof typeof TAG_COLORS

const DEFAULT_TAG_COLORS: TagColor[] = ["ruby", "gray", "gold", "bronze", "brown", "yellow", "amber", "orange", "tomato", "red"]

function getConfiguredTagColors(value: unknown): TagColor[] {
  if (typeof value !== "string") return DEFAULT_TAG_COLORS
  const colors = value
    .split(",")
    .map((color) => color.trim().toLowerCase())
    .filter((color): color is TagColor => color in TAG_COLORS)

  return colors.length > 0 ? colors : DEFAULT_TAG_COLORS
}

function parseExtraTag(tag: string, fallbackColor: TagColor): { text: string; color: TagColor } {
  const colonIndex = tag.indexOf(":")
  if (colonIndex > 0) {
    const maybeColor = tag.substring(0, colonIndex).trim().toLowerCase()
    if (maybeColor in TAG_COLORS) {
      return { text: tag.substring(colonIndex + 1).trim(), color: maybeColor as TagColor }
    }
  }

  return { text: tag.trim(), color: fallbackColor }
}

function isTransparentTagEnabled(value: unknown) {
  return typeof value === "string" ? !["false", "0", "off"].includes(value.trim().toLowerCase()) : value !== false && value !== 0
}

function PlanTag({ color, transparent, children }: { color: TagColor; transparent: boolean; children: ReactNode }) {
  const style = transparent ? ({ "--plan-tag-color": TAG_COLORS[color].value } as CSSProperties) : undefined

  return (
    <p
      className={cn("w-fit rounded-[5px] px-[3px] py-[1.5px] text-[9px]", transparent ? "plan-tag-transparent" : TAG_COLORS[color].className)}
      style={style}
    >
      {children}
    </p>
  )
}

export default function PlanInfo({ parsedData }: { parsedData: PublicNoteData }) {
  if (!parsedData || !parsedData.planDataMod) {
    return null
  }

  const win = window as unknown as Record<string, unknown>
  const hideIPv4IPv6 = win.HideIPv4IPv6Tag === true
  const hideTrafficVol = win.HideTrafficVolTag === true
  const transparentTags = isTransparentTagEnabled(win.enableTransparentTags)
  const tagColors = getConfiguredTagColors(win.tagDefaultColorList)
  const extraList = parsedData.planDataMod.extra
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <section className="mt-0.5 flex flex-wrap items-center gap-1">
      {parsedData.planDataMod.bandwidth !== "" && (
        <PlanTag color="blue" transparent={transparentTags}>
          {parsedData.planDataMod.bandwidth}
        </PlanTag>
      )}
      {!hideTrafficVol && parsedData.planDataMod.trafficVol !== "" && (
        <PlanTag color="green" transparent={transparentTags}>
          {parsedData.planDataMod.trafficVol}
        </PlanTag>
      )}
      {!hideIPv4IPv6 && parsedData.planDataMod.IPv4 === "1" && (
        <PlanTag color="purple" transparent={transparentTags}>
          IPv4
        </PlanTag>
      )}
      {!hideIPv4IPv6 && parsedData.planDataMod.IPv6 === "1" && (
        <PlanTag color="pink" transparent={transparentTags}>
          IPv6
        </PlanTag>
      )}
      {parsedData.planDataMod.networkRoute && (
        <PlanTag color="blue" transparent={transparentTags}>
          {parsedData.planDataMod.networkRoute.split(",").map((route, index) => {
            return route + (index === parsedData.planDataMod!.networkRoute.split(",").length - 1 ? "" : "｜")
          })}
        </PlanTag>
      )}
      {extraList.map((extra, index) => {
        const { text, color } = parseExtraTag(extra, tagColors[index % tagColors.length])
        return (
          <PlanTag key={index} color={color} transparent={transparentTags}>
            {text}
          </PlanTag>
        )
      })}
    </section>
  )
}
