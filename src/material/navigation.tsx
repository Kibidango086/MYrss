import React, { useState, useRef, useCallback } from "react"
import { motion } from "@gpuix/react"
import { MaterialIcon, type MaterialSymbol } from "../icons.js"
import { useMaterialTheme } from "./provider.js"
import { MOTION_EASE, MOTION_ENTER, MOTION_EXIT, font } from "./shared.js"
import { StateLayer } from "./surfaces.js"
import { Card } from "./surfaces.js"
import { Divider } from "./layout.js"

export function TopAppBar({ avatar, title, actions }: { avatar?: string; title: string; actions?: React.ReactNode }) {
  const theme = useMaterialTheme()
  return (
    <div style={{ width: "100%", height: theme.metrics.navHeight, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: theme.metrics.controlGap, paddingLeft: 16, paddingRight: 16, backgroundColor: theme.surface }}>
      {avatar ? <img src={avatar} alt="" objectFit="cover" style={{ width: 36, height: 36, marginRight: 12, borderRadius: theme.shape.full }} /> : null}
      <text style={{ flexGrow: 1, minWidth: 0, color: theme.onSurface, ...font(theme.typescale.titleLarge) }}>{title}</text>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: theme.metrics.controlGap }}>{actions}</div>
    </div>
  )
}

export function NavigationDrawer({ header, children, footer, width }: {
  header?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}) {
  const theme = useMaterialTheme()
  const railWidth = width ?? theme.metrics.railWidth
  const contentWidth = railWidth - theme.metrics.layoutGap * 2
  return (
    <motion.div
      initial={false}
      animate={{ width: railWidth }}
      transition={{ duration: .28, ease: MOTION_ENTER }}
      style={{
        height: "100%",
        flexShrink: 0,
        overflow: "hidden",
        paddingLeft: theme.metrics.layoutGap,
        paddingRight: theme.metrics.layoutGap,
        paddingTop: theme.metrics.layoutGap,
        paddingBottom: theme.metrics.layoutGap,
      }}
    >
      <div style={{ width: contentWidth, height: "100%" }}>
        <Card variant="filled" style={{ height: "100%", gap: theme.metrics.sectionGap }}>
          {header}
          <Divider />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexGrow: 1, minHeight: 0 }}>{children}</div>
          {footer}
        </Card>
      </div>
    </motion.div>
  )
}

export function NavigationRail({ children, header, align = "center" }: {
  children: React.ReactNode
  header?: React.ReactNode
  align?: "start" | "center" | "end"
}) {
  const theme = useMaterialTheme()
  return (
    <div style={{
      width: 80, height: "100%", flexShrink: 0,
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 12, paddingBottom: 12, gap: 4,
      justifyContent: align === "start" ? "flex-start" : align === "end" ? "flex-end" : "center",
      backgroundColor: theme.surface,
    }}>
      {header}
      {children}
    </div>
  )
}

export function NavigationItem({ label, badge, active, onClick, icon, compact }: {
  label: string
  badge?: number
  active?: boolean
  onClick?: () => void
  icon?: MaterialSymbol
  compact?: boolean
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  if (compact) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false) }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        style={{
          width: 56,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          paddingTop: 4,
          paddingBottom: 4,
          cursor: "pointer",
          position: "relative",
        }}
      >
        {/* Icon container with pill-shaped active indicator */}
        <div style={{
          width: 56, height: 32,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", borderRadius: theme.shape.full,
        }}>
          <motion.div
            initial={false}
            animate={{ width: active ? 56 : 0, opacity: active ? 1 : 0 }}
            transition={{ duration: 0.2, ease: MOTION_EASE }}
            style={{
              position: "absolute", height: 32,
              borderRadius: theme.shape.full,
              backgroundColor: theme.secondaryContainer,
            }}
          />
          {!active ? <StateLayer visible={hovered} pressed={pressed} color={theme.onSurfaceVariant} radius={theme.shape.full} /> : null}
          <MaterialIcon name={icon ?? "home"} color={active ? theme.onSecondaryContainer : theme.onSurfaceVariant} size={24} />
          {badge ? (
            <div style={{ position: "absolute", top: -4, right: 2, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 5, paddingRight: 5, borderRadius: theme.shape.full, backgroundColor: theme.error, pointerEvents: "none" }}>
              <text style={{ color: theme.onError, ...font(theme.typescale.labelSmall), fontWeight: 700 }}>{badge > 9 ? "9+" : String(badge)}</text>
            </div>
          ) : null}
        </div>
        <text style={{
          color: active ? theme.onSurface : theme.onSurfaceVariant,
          ...font(theme.typescale.labelMedium),
          fontWeight: active ? 600 : 500,
          textAlign: "center",
        }}>{label}</text>
      </div>
    )
  }

  const itemRadius = active ? theme.shape.full : pressed ? theme.shape.small : theme.shape.medium
  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      initial={false}
      animate={{ opacity: pressed ? .86 : 1, left: pressed ? -2 : 0, borderRadius: itemRadius }}
      transition={{ duration: pressed ? .12 : .26, ease: pressed ? MOTION_EXIT : MOTION_ENTER }}
      style={{
        width: "100%",
        minHeight: 56,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: active ? theme.secondaryContainer : "transparent",
        position: "relative",
        cursor: "pointer",
      }}
    >
      {!active ? <StateLayer visible={hovered} pressed={pressed} color={theme.onSurfaceVariant} radius={theme.shape.full} /> : null}
      {icon ? (
        <div onClick={onClick} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <MaterialIcon name={icon} color={active ? theme.onSecondaryContainer : theme.onSurfaceVariant} size={22} />
        </div>
      ) : null}
      <text style={{ flexGrow: 1, minWidth: 0, marginLeft: icon ? 12 : 0, color: active ? theme.onSecondaryContainer : theme.onSurfaceVariant, ...font(theme.typescale.labelLarge) }}>{label}</text>
      {badge ? (
        <div style={{ minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 6, paddingRight: 6, borderRadius: theme.shape.full, backgroundColor: theme.error }}>
          <text style={{ color: theme.onError, ...font(theme.typescale.labelSmall), fontWeight: 700 }}>{badge > 99 ? "99+" : String(badge)}</text>
        </div>
      ) : null}
    </motion.div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

export interface TabItem {
  label: string
  icon?: MaterialSymbol
}

export function Tabs({ items, activeIndex, onTabChange, variant = "primary" }: {
  items: TabItem[]
  activeIndex: number
  onTabChange?: (index: number) => void
  variant?: "primary" | "secondary"
}) {
  const theme = useMaterialTheme()
  const tabCount = items.length
  const tabWidth = tabCount > 0 ? 100 / tabCount : 0

  // Calculate indicator position based on active index
  // We use percentage-based positioning: each tab is (100/tabCount)% wide
  // For primary variant, indicator is narrower (centered within tab)
  // For secondary variant, indicator spans full tab width
  const indicatorWidthPercent = variant === "primary" ? tabWidth * 0.5 : tabWidth
  const indicatorLeftPercent = variant === "primary"
    ? activeIndex * tabWidth + tabWidth * 0.25
    : activeIndex * tabWidth

  return (
    <div style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: variant === "primary" ? theme.surface : theme.surfaceContainer,
    }}>
      <div style={{
        width: "100%",
        height: 48,
        display: "flex",
        flexDirection: "row",
        position: "relative",
      }}>
        {items.map((item, index) =>
          TabButton({
            item,
            active: index === activeIndex,
            variant,
            onClick: () => onTabChange?.(index),
            tabCount,
          })
        )}
      </div>
      {/* Animated indicator */}
      <div style={{ width: "100%", height: 3, position: "relative" }}>
        <motion.div
          initial={false}
          animate={{
            left: indicatorLeftPercent,
            width: indicatorWidthPercent,
          }}
          transition={{ duration: 0.25, ease: MOTION_EASE }}
          style={{
            position: "absolute",
            bottom: 0,
            height: 3,
            borderRadius: theme.shape.extraSmall,
            backgroundColor: theme.primary,
          }}
        />
      </div>
    </div>
  )
}

function TabButton({ item, active, variant, onClick, tabCount }: {
  item: TabItem
  active: boolean
  variant: "primary" | "secondary"
  onClick: () => void
  tabCount: number
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        flexGrow: 1,
        flexShrink: 1,
        height: 48,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: variant === "primary" && item.icon ? 2 : 0,
        position: "relative",
        cursor: "pointer",
      }}
    >
      <StateLayer visible={hovered} pressed={pressed} color={theme.primary} radius={0} />
      {variant === "primary" && item.icon ? (
        <MaterialIcon name={item.icon} color={active ? theme.primary : theme.onSurfaceVariant} size={20} />
      ) : null}
      <text style={{
        color: active ? theme.primary : theme.onSurfaceVariant,
        ...font(theme.typescale.labelLarge),
        fontWeight: active ? 600 : 500,
      }}>{item.label}</text>
    </div>
  )
}

// ─── NavigationBar ───────────────────────────────────────────────────────────

export interface NavigationDestination {
  icon: MaterialSymbol
  label: string
}

export function NavigationBar({ destinations, activeIndex, onDestinationChange }: {
  destinations: NavigationDestination[]
  activeIndex: number
  onDestinationChange?: (index: number) => void
}) {
  const theme = useMaterialTheme()
  const destCount = destinations.length

  return (
    <div style={{
      width: "100%",
      height: 80,
      flexShrink: 0,
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceContainer,
      borderTopWidth: 1,
      borderTopColor: theme.outlineVariant,
    }}>
      {destinations.map((dest, index) =>
        NavigationBarItem({
          destination: dest,
          active: index === activeIndex,
          onClick: () => onDestinationChange?.(index),
          destCount,
        })
      )}
    </div>
  )
}

function NavigationBarItem({ destination, active, onClick, destCount }: {
  destination: NavigationDestination
  active: boolean
  onClick: () => void
  destCount: number
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        flexGrow: 1,
        flexShrink: 1,
        height: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        position: "relative",
        cursor: "pointer",
      }}
    >
      <StateLayer visible={hovered} pressed={pressed} color={theme.onSurface} radius={0} />
      {/* Icon container with active indicator */}
      <div style={{
        width: 64,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        borderRadius: theme.shape.full,
      }}>
        {/* Active indicator pill */}
        <motion.div
          initial={false}
          animate={{
            width: active ? 64 : 0,
            opacity: active ? 1 : 0,
          }}
          transition={{ duration: 0.2, ease: MOTION_EASE }}
          style={{
            position: "absolute",
            height: 32,
            borderRadius: theme.shape.full,
            backgroundColor: theme.secondaryContainer,
          }}
        />
        <MaterialIcon
          name={destination.icon}
          color={active ? theme.onSecondaryContainer : theme.onSurfaceVariant}
          size={24}
        />
      </div>
      <text style={{
        color: active ? theme.onSurface : theme.onSurfaceVariant,
        ...font(theme.typescale.labelMedium),
        fontWeight: active ? 600 : 500,
      }}>{destination.label}</text>
    </div>
  )
}

// ─── SegmentedButton ─────────────────────────────────────────────────────────

export interface SegmentedButtonItem {
  label: string
  icon?: MaterialSymbol
}

export function SegmentedButton({ items, selectedIndex, onSelectionChange }: {
  items: SegmentedButtonItem[]
  selectedIndex: number
  onSelectionChange?: (index: number) => void
}) {
  const theme = useMaterialTheme()
  const itemCount = items.length
  const segmentWidthPercent = itemCount > 0 ? 100 / itemCount : 0

  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      height: 40,
      borderRadius: theme.shape.full,
      borderWidth: 1,
      borderColor: theme.outline,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Sliding selection indicator */}
      <motion.div
        initial={false}
        animate={{
          left: selectedIndex * segmentWidthPercent,
          width: segmentWidthPercent,
        }}
        transition={{ duration: 0.25, ease: MOTION_EASE }}
        style={{
          position: "absolute",
          top: 0,
          height: 40,
          backgroundColor: theme.secondaryContainer,
          borderRadius: theme.shape.full,
        }}
      />
      {items.map((item, index) =>
        SegmentedButtonSegment({
          item,
          selected: index === selectedIndex,
          onClick: () => onSelectionChange?.(index),
          isFirst: index === 0,
          isLast: index === itemCount - 1,
        })
      )}
    </div>
  )
}

function SegmentedButtonSegment({ item, selected, onClick, isFirst, isLast }: {
  item: SegmentedButtonItem
  selected: boolean
  onClick: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const theme = useMaterialTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        flexGrow: 1,
        flexShrink: 1,
        height: 40,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        position: "relative",
        cursor: "pointer",
      }}
    >
      <StateLayer visible={hovered} pressed={pressed} color={theme.onSurface} radius={theme.shape.full} />
      {selected && item.icon ? (
        <MaterialIcon name="check" color={theme.onSecondaryContainer} size={18} />
      ) : item.icon ? (
        <MaterialIcon name={item.icon} color={theme.onSurface} size={18} />
      ) : selected ? (
        <MaterialIcon name="check" color={theme.onSecondaryContainer} size={18} />
      ) : null}
      <text style={{
        color: selected ? theme.onSecondaryContainer : theme.onSurface,
        ...font(theme.typescale.labelLarge),
      }}>{item.label}</text>
    </div>
  )
}
