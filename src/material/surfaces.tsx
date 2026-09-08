import React, { useState } from "react"
import { motion } from "@gpuix/react"
import { MaterialIcon, type MaterialSymbol } from "../icons.js"
import { useMaterialTheme } from "./provider.js"
import { MOTION_EASE, MOTION_ENTER, MOTION_EXIT, font } from "./shared.js"
import { useResponsiveWindowSize } from "../motion.js"

// ─── Tooltip ─────────────────────────────────────────────────────────────────

export function Tooltip({ open, label, side = "top", gap = 8, priority = 20, variant = "plain", title, actions, children }: {
  open: boolean
  label: string
  side?: "top" | "right" | "bottom" | "left"
  gap?: number
  priority?: number
  variant?: "plain" | "rich"
  title?: string
  actions?: React.ReactNode
  children?: React.ReactNode
}) {
  const theme = useMaterialTheme()

  if (!open) return null

  if (variant === "rich") {
    return (
      <anchored
        deferred
        side={side}
        align="center"
        gap={gap}
        priority={priority}
        occlude={false}
        fit="switch"
      >
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" as unknown as number }}
          transition={{ duration: 0.2, ease: MOTION_ENTER }}
          style={{
            maxWidth: 320,
            minWidth: 200,
            padding: 16,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.surfaceContainerHigh,
            pointerEvents: "auto",
          }}
        >
          {title ? (
            <text style={{ color: theme.onSurface, ...font(theme.typescale.titleSmall), marginBottom: 4 }}>{title}</text>
          ) : null}
          <text style={{ color: theme.onSurfaceVariant, ...font(theme.typescale.bodyMedium) }}>{label}</text>
          {children}
          {actions ? (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              {actions}
            </div>
          ) : null}
        </motion.div>
      </anchored>
    )
  }

  // Plain tooltip
  return (
    <anchored
      deferred
      side={side}
      align="center"
      gap={gap}
      priority={priority}
      occlude={false}
      fit="switch"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: MOTION_EASE }}
        style={{
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: theme.shape.extraSmall,
          backgroundColor: theme.inverseSurface,
          pointerEvents: "none",
        }}
      >
        <text style={{ color: theme.inverseOnSurface, ...font(theme.typescale.bodySmall) }}>{label}</text>
      </motion.div>
    </anchored>
  )
}

// ─── Menu ────────────────────────────────────────────────────────────────────

export function Menu({ open, side = "bottom", align = "start", gap = 4, priority = 25, width = 200, children }: {
  open: boolean
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  gap?: number
  priority?: number
  width?: number
  children: React.ReactNode
}) {
  const theme = useMaterialTheme()

  if (!open) return null

  return (
    <anchored
      deferred
      side={side}
      align={align}
      gap={gap}
      priority={priority}
      occlude={true}
      fit="switch"
    >
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" as unknown as number }}
        transition={{ duration: 0.2, ease: MOTION_ENTER }}
        style={{
          width,
          minWidth: 112,
          maxWidth: 280,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: theme.shape.extraSmall,
          backgroundColor: theme.surfaceContainer,
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        {children}
      </motion.div>
    </anchored>
  )
}

export function MenuItem({ label, icon, trailing, disabled, onClick }: {
  label: string
  icon?: MaterialSymbol
  trailing?: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={disabled ? undefined : () => setHovered(true)}
      onMouseLeave={disabled ? undefined : () => { setHovered(false); setPressed(false) }}
      onMouseDown={disabled ? undefined : () => setPressed(true)}
      onMouseUp={disabled ? undefined : () => setPressed(false)}
      style={{
        width: "100%",
        height: 48,
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingLeft: 12,
        paddingRight: 12,
        position: "relative",
        cursor: disabled ? "default" : "pointer",
        backgroundColor: pressed ? `${theme.onSurface}1f` : hovered ? `${theme.onSurface}14` : "transparent",
      }}
    >
      {icon ? (
        <MaterialIcon name={icon} color={disabled ? `${theme.onSurface}61` : theme.onSurfaceVariant} size={24} />
      ) : null}
      <text style={{
        flexGrow: 1,
        color: disabled ? `${theme.onSurface}61` : theme.onSurface,
        ...font(theme.typescale.bodyLarge),
      }}>{label}</text>
      {trailing}
    </div>
  )
}

export function MenuDivider() {
  const theme = useMaterialTheme()
  return (
    <div style={{ height: 1, marginTop: 8, marginBottom: 8, backgroundColor: theme.outlineVariant }} />
  )
}

// ─── BottomSheet ─────────────────────────────────────────────────────────────

export function BottomSheet({ open, height = 400, priority = 35, children }: {
  open: boolean
  height?: number
  priority?: number
  children: React.ReactNode
}) {
  const theme = useMaterialTheme()

  if (!open) return null

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        width: "100%",
        pointerEvents: "auto",
      }}
    >
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height, opacity: 1 }}
        transition={{ duration: 0.3, ease: MOTION_ENTER }}
        style={{
          width: "100%",
          height,
          borderRadius: 0,
          backgroundColor: theme.surfaceContainerLow,
          overflow: "hidden",
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drag handle */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 12 }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: theme.onSurfaceVariant }} />
        </div>
        {/* Sheet content */}
        <div style={{ flexGrow: 1, minHeight: 0, overflow: "scroll", paddingLeft: 16, paddingRight: 16, paddingBottom: 16 }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export function StateLayer({ visible, pressed, color, radius }: {
  visible: boolean
  pressed?: boolean
  color: string
  radius: number
}) {
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: pressed ? .12 : visible ? .08 : 0,
        borderRadius: pressed ? Math.max(radius * 0.6, radius - 8) : radius,
      }}
      transition={{ duration: pressed ? .1 : .2, ease: MOTION_EASE }}
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius, backgroundColor: color, pointerEvents: "none" }}
    />
  )
}

export function FloatingSurface({ open, x = 0, y = 0, width, height, priority, occlude = true, background, children }: {
  open: boolean
  x?: number
  y?: number
  width?: number | string
  height?: number | string
  priority: number
  occlude?: boolean
  background?: string
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        backgroundColor: background,
        pointerEvents: occlude ? "auto" : "none",
      }}
    >
      {children}
    </div>
  )
}

export function Card({ children, onClick, variant = "filled", style, entranceIndex }: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "filled" | "outlined" | "elevated" | "input"
  style?: Record<string, unknown>
  entranceIndex?: number
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const radius = variant === "input" ? theme.shape.medium : theme.shape.medium
  const background = variant === "elevated"
    ? theme.surfaceContainerLow
    : variant === "outlined"
      ? theme.surface
      : theme.surfaceContainerHigh

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={onClick ? () => setHovered(true) : undefined}
      onMouseLeave={onClick ? () => { setHovered(false); setPressed(false) } : undefined}
      onMouseDown={onClick ? () => setPressed(true) : undefined}
      onMouseUp={onClick ? () => setPressed(false) : undefined}
      initial={entranceIndex === undefined ? { opacity: 1 } : { opacity: 0, left: 18 }}
      animate={{
        opacity: pressed ? .88 : hovered && onClick ? .96 : 1,
        left: 0,
        borderRadius: pressed ? radius + 4 : hovered && onClick ? radius + 8 : radius,
      }}
      transition={{
        duration: pressed ? .12 : .3,
        delay: entranceIndex === undefined ? 0 : Math.min(entranceIndex * .032, .22),
        ease: pressed ? MOTION_EXIT : MOTION_ENTER,
      }}
      style={{
        width: "100%", display: "flex", flexDirection: "column", gap: theme.metrics.cardGap,
        padding: theme.metrics.notePadding, borderRadius: radius, backgroundColor: background,
        borderWidth: variant === "outlined" ? 1 : 0, borderColor: theme.outlineVariant,
        cursor: onClick ? "pointer" : "default", position: "relative", ...style,
      }}
    >
      {onClick ? <StateLayer visible={hovered} pressed={pressed} color={theme.onSurface} radius={radius} /> : null}
      {children}
    </motion.div>
  )
}

export function Dialog({ open, icon, title, message, actions }: {
  open: boolean
  icon?: MaterialSymbol
  title: string
  message?: string
  actions?: React.ReactNode
}) {
  const theme = useMaterialTheme()
  const windowSize = useResponsiveWindowSize()
  if (!open) return null
  const dialogWidth = Math.min(420, Math.max(280, windowSize.width - 48))
  return (
    <FloatingSurface open={open} width="100%" height="100%" priority={40} background={theme.scrim}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .22, ease: MOTION_ENTER }} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: theme.scrim, pointerEvents: "auto" }}>
        <motion.div initial={{ opacity: 0, borderRadius: theme.shape.extraLarge }} animate={{ opacity: 1, borderRadius: theme.shape.extraLarge }} transition={{ duration: .22, ease: MOTION_ENTER }} style={{ width: dialogWidth, padding: 24, borderRadius: theme.shape.extraLarge, backgroundColor: theme.surfaceContainerHigh }}>
          {icon ? <MaterialIcon name={icon} color={theme.primary} size={24} /> : null}
          <text style={{ marginTop: icon ? 16 : 0, color: theme.onSurface, ...font(theme.typescale.headlineSmall) }}>{title}</text>
          {message ? <text style={{ marginTop: 16, color: theme.onSurfaceVariant, ...font(theme.typescale.bodyMedium) }}>{message}</text> : null}
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 8 }}>{actions}</div>
        </motion.div>
      </motion.div>
    </FloatingSurface>
  )
}
