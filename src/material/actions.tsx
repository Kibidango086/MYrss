import React, { useState } from "react"
import { motion } from "@gpuix/react"
import { MaterialIcon, type MaterialSymbol } from "../icons.js"
import { useMaterialTheme } from "./provider.js"
import { MOTION_ENTER, MOTION_EXIT, font } from "./shared.js"
import { StateLayer } from "./surfaces.js"

export function Button({ children, onClick, disabled, variant = "filled", minWidth, icon }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "filled" | "tonal" | "outlined" | "text" | "danger"
  minWidth?: number
  icon?: MaterialSymbol
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const colors = variant === "danger"
    ? { foreground: theme.onError, background: theme.error }
    : variant === "filled"
      ? { foreground: theme.onPrimary, background: theme.primary }
      : variant === "tonal"
        ? { foreground: theme.onSecondaryContainer, background: theme.secondaryContainer }
        : variant === "text"
          ? { foreground: theme.primary, background: "transparent" }
          : { foreground: theme.onSurface, background: "transparent" }

  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      onMouseDown={disabled ? undefined : () => setPressed(true)}
      onMouseUp={disabled ? undefined : () => setPressed(false)}
      onMouseEnter={disabled ? undefined : () => setHovered(true)}
      onMouseLeave={disabled ? undefined : () => { setHovered(false); setPressed(false) }}
      initial={false}
      animate={{
        opacity: pressed ? .86 : hovered ? .98 : 1,
        borderRadius: pressed ? 14 : theme.shape.full,
      }}
      transition={{ duration: pressed ? .12 : .24, ease: pressed ? MOTION_EXIT : MOTION_ENTER }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", minWidth,
        height: 40, paddingLeft: variant === "text" ? 12 : 24, paddingRight: variant === "text" ? 12 : 24,
        borderRadius: theme.shape.full, borderWidth: variant === "outlined" && !disabled ? 1 : 0,
        borderColor: theme.outline, backgroundColor: disabled ? `${theme.onSurface}1f` : colors.background,
        position: "relative", overflow: "hidden", cursor: disabled ? "default" : "pointer",
      }}
    >
      {!disabled ? <StateLayer visible={hovered} pressed={pressed} color={colors.foreground} radius={theme.shape.full} /> : null}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {icon ? <MaterialIcon name={icon} color={disabled ? `${theme.onSurface}61` : colors.foreground} size={18} /> : null}
        <text style={{ color: disabled ? `${theme.onSurface}61` : colors.foreground, ...font(theme.typescale.labelLarge) }}>{children}</text>
      </div>
    </motion.div>
  )
}

export function FAB({ icon, label, onClick }: { icon: MaterialSymbol; label?: string; onClick?: () => void }) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      initial={false}
      animate={{ opacity: pressed ? .84 : hovered ? .96 : 1, left: pressed ? -2 : 0, borderRadius: pressed ? theme.shape.medium : theme.shape.large }}
      transition={{ duration: pressed ? .12 : .28, ease: pressed ? MOTION_EXIT : MOTION_ENTER }}
      style={{
        position: "relative",
        height: 56,
        paddingLeft: label ? 20 : 16,
        paddingRight: label ? 24 : 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        borderRadius: theme.shape.large,
        backgroundColor: theme.primaryContainer,
        cursor: "pointer",
      }}
    >
      <MaterialIcon name={icon} color={theme.onPrimaryContainer} size={24} />
      {label ? <text style={{ color: theme.onPrimaryContainer, ...font(theme.typescale.labelLarge) }}>{label}</text> : null}
    </motion.div>
  )
}

export function IconButton({ icon, onClick, disabled, variant = "standard", selected, label }: {
  icon: MaterialSymbol
  onClick?: () => void
  disabled?: boolean
  variant?: "standard" | "filled" | "tonal" | "outlined"
  selected?: boolean
  label?: string
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const colors = variant === "filled"
    ? { foreground: theme.onPrimary, background: theme.primary }
    : variant === "tonal" || selected
      ? { foreground: theme.onSecondaryContainer, background: theme.secondaryContainer }
      : variant === "outlined"
        ? { foreground: theme.onSurfaceVariant, background: "transparent" }
        : { foreground: theme.onSurfaceVariant, background: "transparent" }
  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={disabled ? undefined : () => setHovered(true)}
      onMouseLeave={disabled ? undefined : () => { setHovered(false); setPressed(false) }}
      onMouseDown={disabled ? undefined : () => setPressed(true)}
      onMouseUp={disabled ? undefined : () => setPressed(false)}
      initial={false}
      animate={{ opacity: pressed ? .82 : hovered ? .94 : 1, borderRadius: pressed ? theme.shape.small : theme.shape.full }}
      transition={{ duration: pressed ? .12 : .24, ease: pressed ? MOTION_EXIT : MOTION_ENTER }}
      style={{
        width: 40,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.shape.full,
        borderWidth: variant === "outlined" && !disabled ? 1 : 0,
        borderColor: theme.outline,
        backgroundColor: disabled ? `${theme.onSurface}1f` : colors.background,
        cursor: disabled ? "default" : "pointer",
        hover: disabled ? undefined : { backgroundColor: variant === "standard" && !selected ? `${theme.onSurface}14` : `${colors.foreground}1f` },
      }}
    >
      <MaterialIcon name={icon} color={disabled ? `${theme.onSurface}61` : colors.foreground} size={20} />
    </motion.div>
  )
}

export function AssistChip({ label, onClick, selected, icon }: {
  label: string
  onClick?: () => void
  selected?: boolean
  icon?: MaterialSymbol
}) {
  const theme = useMaterialTheme()
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 32,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: theme.shape.full,
        borderWidth: 1,
        borderColor: selected ? "transparent" : theme.outline,
        backgroundColor: selected ? theme.secondaryContainer : theme.surface,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {icon ? <MaterialIcon name={icon} color={selected ? theme.onSecondaryContainer : theme.primary} size={18} /> : null}
      <text style={{ color: selected ? theme.onSecondaryContainer : theme.onSurfaceVariant, ...font(theme.typescale.labelLarge) }}>{label}</text>
    </div>
  )
}

// ─── FilterChip ──────────────────────────────────────────────────────────────

export function FilterChip({ label, selected, onClick, icon }: {
  label: string
  selected?: boolean
  onClick?: () => void
  icon?: MaterialSymbol
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={onClick ? () => setHovered(true) : undefined}
      onMouseLeave={onClick ? () => { setHovered(false); setPressed(false) } : undefined}
      onMouseDown={onClick ? () => setPressed(true) : undefined}
      onMouseUp={onClick ? () => setPressed(false) : undefined}
      initial={false}
      animate={{
        borderRadius: pressed ? theme.shape.medium : theme.shape.full,
      }}
      transition={{ duration: pressed ? .1 : .2, ease: pressed ? MOTION_EXIT : MOTION_ENTER }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 32,
        paddingLeft: selected ? 8 : 16,
        paddingRight: 16,
        borderRadius: theme.shape.full,
        borderWidth: selected ? 0 : 1,
        borderColor: theme.outline,
        backgroundColor: selected ? theme.secondaryContainer : theme.surface,
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {onClick ? <StateLayer visible={hovered} pressed={pressed} color={selected ? theme.onSecondaryContainer : theme.onSurfaceVariant} radius={theme.shape.full} /> : null}
      {selected ? (
        <MaterialIcon name="check" color={theme.onSecondaryContainer} size={18} />
      ) : icon ? (
        <MaterialIcon name={icon} color={theme.onSurfaceVariant} size={18} />
      ) : null}
      <text style={{ color: selected ? theme.onSecondaryContainer : theme.onSurfaceVariant, ...font(theme.typescale.labelLarge) }}>{label}</text>
    </motion.div>
  )
}

// ─── InputChip ───────────────────────────────────────────────────────────────

export function InputChip({ label, selected, onClick, onRemove, icon, avatar }: {
  label: string
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
  icon?: MaterialSymbol
  avatar?: string
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      initial={false}
      animate={{
        borderRadius: pressed ? theme.shape.medium : theme.shape.full,
      }}
      transition={{ duration: pressed ? .1 : .2, ease: pressed ? MOTION_EXIT : MOTION_ENTER }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 32,
        paddingLeft: avatar ? 4 : icon ? 8 : 12,
        paddingRight: onRemove ? 4 : 12,
        borderRadius: theme.shape.full,
        borderWidth: selected ? 0 : 1,
        borderColor: theme.outline,
        backgroundColor: selected ? theme.secondaryContainer : theme.surface,
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {<StateLayer visible={hovered} pressed={pressed} color={selected ? theme.onSecondaryContainer : theme.onSurfaceVariant} radius={theme.shape.full} />}
      {avatar ? (
        <img src={avatar} style={{ width: 24, height: 24, borderRadius: 12 }} />
      ) : icon ? (
        <MaterialIcon name={icon} color={selected ? theme.onSecondaryContainer : theme.onSurfaceVariant} size={18} />
      ) : null}
      <text style={{ color: selected ? theme.onSecondaryContainer : theme.onSurfaceVariant, ...font(theme.typescale.labelLarge) }}>{label}</text>
      {onRemove ? (
        <div
          onClick={() => { onRemove() }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 12, cursor: "pointer" }}
        >
          <MaterialIcon name="close" color={selected ? theme.onSecondaryContainer : theme.onSurfaceVariant} size={18} />
        </div>
      ) : null}
    </motion.div>
  )
}

// ─── SuggestionChip ──────────────────────────────────────────────────────────

export function SuggestionChip({ label, onClick, icon }: {
  label: string
  onClick?: () => void
  icon?: MaterialSymbol
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={onClick ? () => setHovered(true) : undefined}
      onMouseLeave={onClick ? () => { setHovered(false); setPressed(false) } : undefined}
      onMouseDown={onClick ? () => setPressed(true) : undefined}
      onMouseUp={onClick ? () => setPressed(false) : undefined}
      initial={false}
      animate={{
        borderRadius: pressed ? theme.shape.medium : theme.shape.full,
      }}
      transition={{ duration: pressed ? .1 : .2, ease: pressed ? MOTION_EXIT : MOTION_ENTER }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 32,
        paddingLeft: icon ? 8 : 16,
        paddingRight: 16,
        borderRadius: theme.shape.full,
        borderWidth: 1,
        borderColor: theme.outline,
        backgroundColor: theme.surface,
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {onClick ? <StateLayer visible={hovered} pressed={pressed} color={theme.onSurfaceVariant} radius={theme.shape.full} /> : null}
      {icon ? <MaterialIcon name={icon} color={theme.onSurfaceVariant} size={18} /> : null}
      <text style={{ color: theme.onSurfaceVariant, ...font(theme.typescale.labelLarge) }}>{label}</text>
    </motion.div>
  )
}
