import { cn } from "@/lib/utils"

type TrafficCircleProps = {
  value: number
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
  className?: string
}

function getStrokeColor(value: number) {
  if (value > 90) return "stroke-red-600"
  if (value > 50) return "stroke-yellow-400"
  return "stroke-green-500"
}

export default function TrafficCircle({
  value,
  size = 38,
  strokeWidth = 4,
  showPercentage = true,
  className,
}: TrafficCircleProps) {
  const percentage = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
  const radius = size / 2 - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percentage / 100) * circumference

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      role="progressbar"
      aria-label={`Traffic ${percentage.toFixed(0)}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percentage)}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-secondary/80"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={cn("transition-[stroke-dashoffset] duration-300", getStrokeColor(percentage))}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showPercentage && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-foreground">
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
