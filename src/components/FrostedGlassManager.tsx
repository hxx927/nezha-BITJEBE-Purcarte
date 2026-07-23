import { useEffect } from "react"

const DEFAULT_BLUR = 10
const DEFAULT_LIGHT_BACKGROUND = "rgba(255, 255, 255, 0.5)"
const DEFAULT_DARK_BACKGROUND = "rgba(0, 0, 0, 0.5)"

function resolveBlurValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 40) : DEFAULT_BLUR
}

function resolveBackgroundColors(value: unknown) {
  const colors =
    typeof value === "string"
      ? value
          .split("|")
          .map((color) => color.trim())
          .filter(Boolean)
      : []
  return {
    light: colors[0] || DEFAULT_LIGHT_BACKGROUND,
    dark: colors[1] || colors[0] || DEFAULT_DARK_BACKGROUND,
  }
}

function isEnabled(value: unknown) {
  if (typeof value === "string") {
    return !["false", "0", "off"].includes(value.trim().toLowerCase())
  }
  return value !== false && value !== 0
}

export function FrostedGlassManager() {
  const managedSettings = (window as unknown as Record<string, unknown>).__themeSettings

  useEffect(() => {
    const root = document.documentElement

    const applySettings = () => {
      const settings = window as unknown as Record<string, unknown>
      const blur = resolveBlurValue(settings.blurValue)
      const colors = resolveBackgroundColors(settings.blurBackgroundColor)
      const hasBackground = Boolean(settings.CustomBackgroundImage || settings.CustomMobileBackgroundImage)

      root.style.setProperty("--frosted-glass-blur", `${blur}px`)
      root.style.setProperty("--frosted-glass-light-background", colors.light)
      root.style.setProperty("--frosted-glass-dark-background", colors.dark)
      root.classList.toggle("frosted-glass-enabled", hasBackground && isEnabled(settings.enableBlur) && blur > 0)
    }

    applySettings()
    window.addEventListener("backgroundChange", applySettings)

    return () => {
      window.removeEventListener("backgroundChange", applySettings)
      root.classList.remove("frosted-glass-enabled")
    }
  }, [managedSettings])

  return null
}
