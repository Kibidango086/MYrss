import React, { useState, useRef } from "react"
import { motion } from "@gpuix/react"
import { MaterialIcon } from "../icons.js"
import { useMaterialTheme } from "./provider.js"
import { MOTION_EASE, font } from "./shared.js"

export function FilledTextField({ label, value, placeholder, autoFocus, onChange, onSubmit }: {
  label?: string
  value: string
  placeholder?: string
  autoFocus?: boolean
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
}) {
  const theme = useMaterialTheme()
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
      {label ? <text style={{ color: focused ? theme.primary : theme.onSurfaceVariant, ...font(theme.typescale.bodySmall) }}>{label}</text> : null}
      <div style={{ width: "100%", borderRadius: theme.shape.extraSmall, backgroundColor: theme.surfaceContainerHighest, borderWidth: 2, borderColor: focused ? theme.primary : "transparent" }}>
        <input
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.value ?? "")}
          onSubmit={onSubmit ? (event) => onSubmit(event.value ?? "") : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          theme={{
            bg: "transparent",
            border: "transparent",
            text: theme.onSurface,
            textMuted: theme.onSurfaceVariant,
            caret: theme.primary,
          }}
          style={{ width: "100%", height: 52, paddingLeft: 16, paddingRight: 16, backgroundColor: "transparent", color: theme.onSurface, fontSize: theme.typescale.bodyLarge.size }}
        />
      </div>
    </div>
  )
}

export function Checkbox({ checked, label, onChange }: { checked: boolean; label?: string; onChange?: (checked: boolean) => void }) {
  const theme = useMaterialTheme()
  return (
    <div onClick={() => onChange?.(!checked)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40, cursor: "pointer" }}>
      <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, borderWidth: 2, borderColor: checked ? theme.primary : theme.onSurfaceVariant, backgroundColor: checked ? theme.primary : "transparent" }}>
        {checked ? <MaterialIcon name="check" color={theme.onPrimary} size={14} /> : null}
      </div>
      {label ? <text style={{ color: theme.onSurface, ...font(theme.typescale.bodyLarge) }}>{label}</text> : null}
    </div>
  )
}

export function RadioOption({ selected, label, onSelect }: { selected: boolean; label: string; onSelect?: () => void }) {
  const theme = useMaterialTheme()
  return (
    <div onClick={onSelect} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40, cursor: "pointer" }}>
      <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: theme.shape.full, borderWidth: 2, borderColor: selected ? theme.primary : theme.onSurfaceVariant }}>
        {selected ? <div style={{ width: 10, height: 10, borderRadius: theme.shape.full, backgroundColor: theme.primary }} /> : null}
      </div>
      <text style={{ color: theme.onSurface, ...font(theme.typescale.bodyLarge) }}>{label}</text>
    </div>
  )
}

export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange?: (checked: boolean) => void; disabled?: boolean }) {
  const theme = useMaterialTheme()
  return (
    <div
      onClick={disabled ? undefined : () => onChange?.(!checked)}
      style={{
        width: 52,
        height: 32,
        position: "relative",
        borderRadius: theme.shape.full,
        borderWidth: 2,
        borderColor: checked ? theme.primary : theme.outline,
        backgroundColor: checked ? theme.primary : theme.surfaceContainerHighest,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <motion.div
        initial={false}
        animate={{
          left: checked ? 22 : 6,
          top: checked ? 2 : 4,
          width: checked ? 24 : 16,
          height: checked ? 24 : 16,
          opacity: 1,
          borderRadius: theme.shape.full,
        }}
        transition={{ duration: .26, ease: MOTION_EASE }}
        style={{
          position: "absolute",
          top: checked ? 2 : 4,
          width: checked ? 24 : 16,
          height: checked ? 24 : 16,
          borderRadius: theme.shape.full,
          backgroundColor: checked ? theme.onPrimary : theme.outline,
        }}
      />
    </div>
  )
}

export function OutlinedTextField({ label, value, placeholder, autoFocus, onChange, onSubmit }: {
  label?: string
  value: string
  placeholder?: string
  autoFocus?: boolean
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
}) {
  const theme = useMaterialTheme()
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
      {label ? <text style={{ color: focused ? theme.primary : theme.onSurfaceVariant, ...font(theme.typescale.bodySmall) }}>{label}</text> : null}
      <div style={{ width: "100%", borderRadius: theme.shape.extraSmall, backgroundColor: "transparent", borderWidth: focused ? 2 : 1, borderColor: focused ? theme.primary : theme.outline }}>
        <input
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.value ?? "")}
          onSubmit={onSubmit ? (event) => onSubmit(event.value ?? "") : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          theme={{
            bg: "transparent",
            border: "transparent",
            text: theme.onSurface,
            textMuted: theme.onSurfaceVariant,
            caret: theme.primary,
          }}
          style={{ width: "100%", height: 52, paddingLeft: 16, paddingRight: 16, backgroundColor: "transparent", color: theme.onSurface, fontSize: theme.typescale.bodyLarge.size }}
        />
      </div>
    </div>
  )
}

export function Slider({ value, onChange, min = 0, max = 100 }: {
  value: number
  onChange?: (value: number) => void
  min?: number
  max?: number
}) {
  const theme = useMaterialTheme()
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<{ id: number } | null>(null)
  const trackWidth = 300
  const thumbSize = 20
  const trackHeight = 4

  const clampedValue = Math.min(max, Math.max(min, value))
  const fraction = max > min ? (clampedValue - min) / (max - min) : 0
  const thumbLeft = fraction * (trackWidth - thumbSize)

  function handleTrackClick(event: { value?: unknown }) {
    // Click on track to jump to position
    if (onChange && typeof event.value === "number") {
      const clickFraction = Math.min(1, Math.max(0, event.value / trackWidth))
      const newValue = min + clickFraction * (max - min)
      onChange(Math.round(newValue))
    }
  }

  return (
    <div style={{ width: trackWidth, height: 40, display: "flex", alignItems: "center", position: "relative" }}>
      {/* Track background */}
      <div
        ref={trackRef}
        style={{ width: trackWidth, height: trackHeight, borderRadius: trackHeight / 2, backgroundColor: theme.surfaceContainerHighest, position: "absolute", left: 0, top: 18 }}
      />
      {/* Active track */}
      <div
        style={{ width: thumbLeft + thumbSize / 2, height: trackHeight, borderRadius: trackHeight / 2, backgroundColor: theme.primary, position: "absolute", left: 0, top: 18 }}
      />
      {/* Thumb */}
      <div
        onMouseDown={() => {
          setDragging(true)
        }}
        onMouseUp={() => {
          setDragging(false)
        }}
        style={{
          width: thumbSize,
          height: thumbSize,
          borderRadius: theme.shape.full,
          backgroundColor: theme.primary,
          position: "absolute",
          left: thumbLeft,
          top: 10,
          cursor: "pointer",
        }}
      />
    </div>
  )
}

export function RangeSlider({ valueLow, valueHigh, onChange, min = 0, max = 100 }: {
  valueLow: number
  valueHigh: number
  onChange?: (low: number, high: number) => void
  min?: number
  max?: number
}) {
  const theme = useMaterialTheme()
  const [draggingLow, setDraggingLow] = useState(false)
  const [draggingHigh, setDraggingHigh] = useState(false)
  const trackWidth = 300
  const thumbSize = 20
  const trackHeight = 4

  const clampedLow = Math.min(max, Math.max(min, valueLow))
  const clampedHigh = Math.min(max, Math.max(min, valueHigh))
  const fractionLow = max > min ? (clampedLow - min) / (max - min) : 0
  const fractionHigh = max > min ? (clampedHigh - min) / (max - min) : 0
  const thumbLeftLow = fractionLow * (trackWidth - thumbSize)
  const thumbLeftHigh = fractionHigh * (trackWidth - thumbSize)

  return (
    <div style={{ width: trackWidth, height: 40, display: "flex", alignItems: "center", position: "relative" }}>
      {/* Track background */}
      <div
        style={{ width: trackWidth, height: trackHeight, borderRadius: trackHeight / 2, backgroundColor: theme.surfaceContainerHighest, position: "absolute", left: 0, top: 18 }}
      />
      {/* Active track between thumbs */}
      <div
        style={{ width: thumbLeftHigh - thumbLeftLow + thumbSize, height: trackHeight, borderRadius: trackHeight / 2, backgroundColor: theme.primary, position: "absolute", left: thumbLeftLow, top: 18 }}
      />
      {/* Low thumb */}
      <div
        onMouseDown={() => {
          setDraggingLow(true)
        }}
        onMouseUp={() => {
          setDraggingLow(false)
        }}
        style={{
          width: thumbSize,
          height: thumbSize,
          borderRadius: theme.shape.full,
          backgroundColor: theme.primary,
          position: "absolute",
          left: thumbLeftLow,
          top: 10,
          cursor: "pointer",
        }}
      />
      {/* High thumb */}
      <div
        onMouseDown={() => {
          setDraggingHigh(true)
        }}
        onMouseUp={() => {
          setDraggingHigh(false)
        }}
        style={{
          width: thumbSize,
          height: thumbSize,
          borderRadius: theme.shape.full,
          backgroundColor: theme.primary,
          position: "absolute",
          left: thumbLeftHigh,
          top: 10,
          cursor: "pointer",
        }}
      />
    </div>
  )
}
