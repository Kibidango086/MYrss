import React, { useState } from "react"
import { useMaterialTheme } from "./provider.js"
import { font } from "./shared.js"
import { StateLayer } from "./surfaces.js"
import { a11y } from "../jsx/intrinsics.js"
import { useRipple } from "./ripple.js"
import type { A11yProps } from "./shared.js"

export function LayoutShell({ children, appBar, footer, overlays }: {
  children: React.ReactNode
  appBar: React.ReactNode
  footer?: React.ReactNode
  overlays?: React.ReactNode
}) {
  const theme = useMaterialTheme()
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        backgroundColor: theme.surface,
        fontFamily: theme.fontSans,
        paddingTop: process.platform === "darwin" ? 34 : 0,
      }}
    >
      {appBar}
      <div style={{ width: "100%", flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "row", gap: 0 }}>{children}</div>
      {footer}
      {overlays}
    </div>
  )
}

export function ContentContainer({ children, maxWidth = 880 }: { children: React.ReactNode; maxWidth?: number }) {
  const theme = useMaterialTheme()
  return (
    <div style={{ width: "100%", maxWidth, alignSelf: "center", display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0, gap: theme.metrics.sectionGap }}>
      {children}
    </div>
  )
}

export function LayoutFooter({ children }: { children: React.ReactNode }) {
  const theme = useMaterialTheme()
  return (
    <div
      style={{
        width: "100%",
        flexShrink: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: theme.metrics.controlGap + 4,
        paddingBottom: theme.metrics.controlGap + 4,
        paddingLeft: theme.metrics.layoutGap,
        paddingRight: theme.metrics.layoutGap,
        borderTopWidth: 1,
        borderColor: theme.outlineVariant,
      }}
    >
      <div style={{ width: "100%", maxWidth: 920, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: theme.metrics.controlGap }}>{children}</div>
    </div>
  )
}

export function Divider({ inset = false }: { inset?: boolean }) {
  const theme = useMaterialTheme()
  return <div style={{ height: 1, marginTop: inset ? 0 : 8, marginBottom: inset ? 0 : 8, marginLeft: inset ? 72 : 0, backgroundColor: theme.outlineVariant }} />
}

export function ListItem({ headline, supporting, leading, trailing, onClick, onFileDrop, ...rest }: {
  headline: string
  supporting?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
  onClick?: () => void
  /** Absolute paths dropped from the OS file manager onto this row. */
  onFileDrop?: (paths: string[]) => void
} & A11yProps) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const ripple = useRipple({ color: theme.onSurface })
  return (
    <div
      ref={ripple.ref}
      onClick={onClick}
      onFileDrop={onFileDrop ? (event) => onFileDrop(event.paths ?? []) : undefined}
      {...a11y(rest, onClick ? headline : undefined, onClick ? "button" : undefined)}
      onMouseEnter={onClick ? () => setHovered(true) : undefined}
      onMouseLeave={onClick ? () => { setHovered(false); setPressed(false) } : undefined}
      onMouseDown={onClick ? (event) => { setPressed(true); ripple.onMouseDown(event) } : undefined}
      onMouseUp={onClick ? () => setPressed(false) : undefined}
      style={{
        width: "100%",
        minHeight: 56,
        display: "flex",
        alignItems: "center",
        gap: 16,
        paddingLeft: 16,
        paddingRight: 16,
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {onClick ? <StateLayer visible={hovered} pressed={pressed} color={theme.onSurface} radius={0} /> : null}
      {onClick ? ripple.layer : null}
      {leading}
      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <text style={{ color: theme.onSurface, ...font(theme.typescale.bodyLarge), lineClamp: 1 }}>{headline}</text>
        {supporting ? <text style={{ color: theme.onSurfaceVariant, ...font(theme.typescale.bodyMedium), lineClamp: 2 }}>{supporting}</text> : null}
      </div>
      {trailing}
    </div>
  )
}

export function LayoutPane({ children }: { children: React.ReactNode }) {
  const theme = useMaterialTheme()
  return (
    <div
      style={{
        flexGrow: 1,
        minWidth: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: theme.metrics.sectionGap,
        paddingTop: theme.metrics.layoutGap,
        paddingBottom: theme.metrics.layoutGap,
        paddingRight: theme.metrics.layoutGap,
      }}
    >
      {children}
    </div>
  )
}

export function Grid({ columns, children }: { columns: number; children: React.ReactNode }) {
  const theme = useMaterialTheme()
  return <div style={{ width: "100%", display: "grid", gridTemplateColumns: columns, gridColumnMin: "min-content", gap: theme.metrics.cardGap }}>{children}</div>
}

export function SectionHeader({ title, subtitle, level = 2 }: { title: string; subtitle?: string; level?: number }) {
  const theme = useMaterialTheme()
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4, marginBottom: theme.metrics.sectionGap }}>
      <text {...a11y({ role: "heading", ariaLevel: level }, title)} style={{ color: theme.onSurface, ...font(theme.typescale.titleLarge) }}>{title}</text>
      {subtitle ? <text style={{ color: theme.onSurfaceVariant, ...font(theme.typescale.bodyMedium) }}>{subtitle}</text> : null}
    </div>
  )
}
