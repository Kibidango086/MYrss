import React, { useEffect, useState } from "react"
import { AnimatePresence, motion } from "@gpuix/react"
import { useMaterialTheme } from "./provider.js"
import { font } from "./shared.js"
import { FloatingSurface } from "./surfaces.js"
import { a11y } from "../jsx/intrinsics.js"
import { elevationShadow } from "../theme.js"
import { PresenceMotion, useResponsiveWindowSize } from "../motion.js"

// ─── Snackbar ────────────────────────────────────────────────────────────────

export function Snackbar({ open, message, actionLabel, onAction }: {
  open: boolean
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  const theme = useMaterialTheme()
  const windowSize = useResponsiveWindowSize()
  const toastWidth = Math.min(560, Math.max(288, windowSize.width - 48))
  const toastHeight = theme.metrics.snackbarHeight
  const toastX = Math.round((windowSize.width - toastWidth) / 2)
  const toastY = Math.max(16, windowSize.height - toastHeight - 32)
  return (
    <AnimatePresence>
      {open ? (
        <FloatingSurface key="snackbar" open x={toastX} y={toastY} width={toastWidth} height={toastHeight} priority={30} occlude={false} background={theme.inverseSurface}>
          {/* MD3 slides a snackbar up as it fades in, and back down as it leaves. */}
          <PresenceMotion
            {...a11y({ role: "status" }, message)}
            initial={{ opacity: 0, top: 12 }}
            animate={{ opacity: 1, top: 0 }}
            exit={{ opacity: 0, top: 12 }}
            enterDuration={.24}
            exitDuration={.2}
            style={{ width: toastWidth, height: toastHeight, display: "flex", alignItems: "center", gap: 16, paddingLeft: 16, paddingRight: 8, borderRadius: theme.shape.extraSmall, backgroundColor: theme.inverseSurface, pointerEvents: "auto", position: "relative", ...elevationShadow(theme, 6) }}
          >
            <text style={{ flexGrow: 1, color: theme.inverseOnSurface, ...font(theme.typescale.bodyMedium) }}>{message}</text>
            {actionLabel ? (
              <div
                {...a11y({}, actionLabel, "button")}
                onClick={onAction}
                style={{ paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 12, borderRadius: theme.shape.full, cursor: "pointer" }}
              >
                <text style={{ color: theme.inversePrimary, ...font(theme.typescale.labelLarge) }}>{actionLabel}</text>
              </div>
            ) : null}
          </PresenceMotion>
        </FloatingSurface>
      ) : null}
    </AnimatePresence>
  )
}

// ─── CircularProgress ────────────────────────────────────────────────────────

/**
 * Segment count for the circular progress arc approximation.
 * We render N thin wedge-shaped divs arranged in a circle.
 * For determinate mode, segments up to `value` are colored.
 * For indeterminate mode, segments cycle opacity to simulate rotation.
 */
const CIRCULAR_SEGMENTS = 12
const SEGMENT_ANGLE_DEG = 360 / CIRCULAR_SEGMENTS

export interface CircularProgressProps {
  /** If provided, renders in determinate mode (0-100). Otherwise indeterminate. */
  value?: number
  /** Diameter of the progress indicator in px. Default 40. */
  size?: number
  /** Track/indicator thickness. Default 4. */
  strokeWidth?: number
  /** Custom color override. Defaults to theme.primary. */
  color?: string
}

export function CircularProgress({ value, size = 40, strokeWidth = 4, color }: CircularProgressProps) {
  const theme = useMaterialTheme()
  const indicatorColor = color ?? theme.primary
  const trackColor = theme.surfaceContainerHighest
  const determinate = value !== undefined

  // For indeterminate: cycle which segment is "active" to approximate rotation
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (determinate) return
    let frame = 0
    const interval = setInterval(() => {
      frame = (frame + 1) % CIRCULAR_SEGMENTS
      setActiveIndex(frame)
    }, 80)
    return () => clearInterval(interval)
  }, [determinate])

  // Calculate how many segments should be filled for determinate mode
  const filledSegments = determinate
    ? Math.round((Math.min(100, Math.max(0, value)) / 100) * CIRCULAR_SEGMENTS)
    : 0

  const radius = (size - strokeWidth) / 2
  const center = size / 2

  return (
    <div
      {...a11y({ role: "progressbar", ariaValueText: determinate ? `${Math.round(filledSegments / CIRCULAR_SEGMENTS * 100)}%` : "loading" }, "Progress")}
      style={{ width: size, height: size, position: "relative" }}
    >
      {Array.from({ length: CIRCULAR_SEGMENTS }, (_, i) => {
        const angle = (i * SEGMENT_ANGLE_DEG * Math.PI) / 180
        // Position each segment dot around the circle
        const x = center + radius * Math.cos(angle) - strokeWidth / 2
        const y = center + radius * Math.sin(angle) - strokeWidth / 2

        let segmentOpacity: number
        if (determinate) {
          segmentOpacity = i < filledSegments ? 1 : 0.2
        } else {
          // Create a fading trail effect: the active segment is brightest,
          // trailing segments fade out
          const distance = ((i - activeIndex + CIRCULAR_SEGMENTS) % CIRCULAR_SEGMENTS)
          segmentOpacity = distance === 0 ? 1.0
            : distance === 1 ? 0.85
            : distance === 2 ? 0.65
            : distance === 3 ? 0.45
            : distance === 4 ? 0.3
            : 0.15
        }

        return (
          <motion.div
            key={i}
            initial={false}
            animate={{ opacity: segmentOpacity }}
            transition={{ duration: 0.08 }}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: strokeWidth,
              height: strokeWidth,
              borderRadius: strokeWidth / 2,
              backgroundColor: determinate && i >= filledSegments ? trackColor : indicatorColor,
            }}
          />
        )
      })}
    </div>
  )
}

// ─── LinearProgress ──────────────────────────────────────────────────────────

export interface LinearProgressProps {
  /** If provided, renders in determinate mode (0-100). Otherwise indeterminate. */
  value?: number
  /** Custom color override. Defaults to theme.primary. */
  color?: string
  /** Height of the progress bar. Default 4. */
  height?: number
  /** Track width in pixels. Default 240. Required for pixel-based animation. */
  trackWidth?: number
}

export function LinearProgress({ value, color, height = 4, trackWidth = 240 }: LinearProgressProps) {
  const theme = useMaterialTheme()
  const indicatorColor = color ?? theme.primary
  const trackColor = theme.surfaceContainerHighest
  const determinate = value !== undefined

  // For indeterminate: animate a sliding bar back and forth
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (determinate) return
    let frame = 0
    const interval = setInterval(() => {
      frame = (frame + 1) % 4
      setPhase(frame)
    }, 600)
    return () => clearInterval(interval)
  }, [determinate])

  // Indeterminate: sliding bar cycles through positions (as fractions of trackWidth)
  // Phase 0: left 0%, width 30%
  // Phase 1: left 25%, width 45%
  // Phase 2: left 60%, width 30%
  // Phase 3: left 80%, width 15% -> wraps to phase 0
  const indeterminatePositions = [
    { leftFraction: 0, widthFraction: 0.3 },
    { leftFraction: 0.25, widthFraction: 0.45 },
    { leftFraction: 0.6, widthFraction: 0.3 },
    { leftFraction: 0.8, widthFraction: 0.15 },
  ]

  const borderRadius = height / 2

  if (determinate) {
    const clampedValue = Math.min(100, Math.max(0, value))
    const barWidth = Math.round((clampedValue / 100) * trackWidth)
    return (
      <div
        {...a11y({ role: "progressbar", ariaValueText: `${Math.round(clampedValue)}%` }, "Progress")}
        style={{ width: trackWidth, height, backgroundColor: trackColor, borderRadius, overflow: "hidden", position: "relative" }}
      >
        <motion.div
          initial={false}
          animate={{ width: barWidth }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          style={{
            height,
            backgroundColor: indicatorColor,
            borderRadius,
            position: "absolute",
            left: 0,
            top: 0,
          }}
        />
      </div>
    )
  }

  // Indeterminate mode
  const pos = indeterminatePositions[phase] ?? indeterminatePositions[0]!
  const barLeft = Math.round(pos.leftFraction * trackWidth)
  const barWidth = Math.round(pos.widthFraction * trackWidth)
  return (
    <div
      {...a11y({ role: "progressbar", ariaValueText: "loading" }, "Progress")}
      style={{ width: trackWidth, height, backgroundColor: trackColor, borderRadius, overflow: "hidden", position: "relative" }}
    >
      <motion.div
        initial={false}
        animate={{
          left: barLeft,
          width: barWidth,
        }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
        style={{
          height,
          backgroundColor: indicatorColor,
          borderRadius,
          position: "absolute",
          top: 0,
        }}
      />
    </div>
  )
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export interface BadgeProps {
  /** Content to display. If undefined or 0, renders as a small dot. */
  content?: number
  /** Whether the badge is visible. Default true. */
  visible?: boolean
  /** Max number to display before showing "N+". Default 99. */
  max?: number
  /** Custom badge color. Defaults to theme.error. */
  color?: string
  /** Children to wrap (typically an icon). */
  children: React.ReactNode
}

export function Badge({ content, visible = true, max = 99, color, children }: BadgeProps) {
  const theme = useMaterialTheme()
  const badgeColor = color ?? theme.error
  const textColor = theme.onError

  const showDot = content === undefined || content === 0
  const displayText = content !== undefined && content > 0
    ? content > max ? `${max}+` : `${content}`
    : ""

  // Dot badge: 6x6 circle
  // Number badge: min-width 16, height 16, pill-shaped
  const dotSize = 6
  const numberHeight = 16
  const numberMinWidth = 16
  const numberPaddingH = 4

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {children}
      <AnimatePresence>
        {visible ? (
          <PresenceMotion
            key="badge"
            {...a11y({ role: "status" }, showDot ? undefined : `${displayText} new items`)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            enterDuration={0.15}
            exitDuration={0.12}
            style={showDot ? {
              position: "absolute",
              top: -2,
              right: -2,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: badgeColor,
            } : {
              position: "absolute",
              top: -4,
              right: -6,
              minWidth: numberMinWidth,
              height: numberHeight,
              borderRadius: numberHeight / 2,
              backgroundColor: badgeColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingLeft: numberPaddingH,
              paddingRight: numberPaddingH,
            }}
          >
            {!showDot ? (
              <text style={{ color: textColor, fontSize: 11, fontWeight: 500, lineHeight: 16 }}>{displayText}</text>
            ) : null}
          </PresenceMotion>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
