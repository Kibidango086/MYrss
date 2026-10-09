import React, { useState, useRef } from "react"
import { motion, type PublicInstance } from "@gpuix/react"
import { MaterialIcon } from "../icons.js"
import { useMaterialTheme } from "./provider.js"
import { MOTION_EASE, font } from "./shared.js"
import { a11y } from "../jsx/intrinsics.js"
import { nativeTheme } from "../theme.js"

/**
 * Native editor theme for the Material text fields.
 *
 * GPUIX 0.10.0 paints the caret at the row's `lineHeight` and centers a
 * single-line `<input>` inside extra height, so `lineHeight` is set explicitly
 * from the MD3 typescale instead of left to GPUI's default leading.
 */
function fieldTheme(theme: ReturnType<typeof useMaterialTheme>) {
  return nativeTheme(theme, { bg: "transparent", border: "transparent" })
}

/**
 * Material 3 filled text field.
 *
 * The label lives *inside* the container, the way Flutter draws it: while the
 * field is empty and unfocused the label sits on the input line as the
 * placeholder, and once it is focused or filled the label floats to the top in
 * `labelSmall` and the placeholder takes its place. M3 has no "label above the
 * box" state — that was Material 2.
 *
 * The container is `fieldHeight` (Flutter's 56) with a 4dp corner and a 1dp
 * active indicator along the bottom that becomes 2dp `primary` on focus.
 */
export function FilledTextField({ label, value, placeholder, autoFocus, onChange, onSubmit, ariaLabel, ariaDescription, ariaId }: {
  label?: string
  value: string
  placeholder?: string
  autoFocus?: boolean
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  ariaLabel?: string
  ariaDescription?: string
  ariaId?: string
}) {
  const theme = useMaterialTheme()
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0
  return (
    <div
      style={{
        width: "100%",
        height: theme.metrics.fieldHeight,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        borderRadius: theme.shape.extraSmall,
        backgroundColor: theme.surfaceContainerHighest,
        borderBottomWidth: focused ? 2 : 1,
        borderColor: focused ? theme.primary : theme.onSurfaceVariant,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {label && floated ? (
        <text style={{ color: focused ? theme.primary : theme.onSurfaceVariant, ...font(theme.typescale.labelSmall) }}>{label}</text>
      ) : null}
      <input
        value={value}
        placeholder={floated ? placeholder : (label ?? placeholder)}
        autoFocus={autoFocus}
        {...a11y({ ariaLabel, ariaDescription, ariaId, role: "textbox" }, label ?? placeholder)}
        onChange={(event) => onChange(event.value ?? "")}
        onSubmit={onSubmit ? (event) => onSubmit(event.value ?? "") : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        theme={fieldTheme(theme)}
        style={{ width: "100%", height: theme.typescale.bodyLarge.lineHeight, paddingLeft: 0, paddingRight: 0, backgroundColor: "transparent", color: theme.onSurface, fontSize: theme.typescale.bodyLarge.size, lineHeight: theme.typescale.bodyLarge.lineHeight }}
      />
    </div>
  )
}

export function Checkbox({ checked, label, onChange, ariaLabel, ariaDescription, ariaId }: {
  checked: boolean
  label?: string
  onChange?: (checked: boolean) => void
  ariaLabel?: string
  ariaDescription?: string
  ariaId?: string
}) {
  const theme = useMaterialTheme()
  return (
    <div
      onClick={() => onChange?.(!checked)}
      {...a11y({ role: "checkbox", ariaLabel, ariaDescription, ariaId, ariaSelected: checked }, label)}
      style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40, cursor: "pointer" }}
    >
      <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, borderWidth: 2, borderColor: checked ? theme.primary : theme.onSurfaceVariant, backgroundColor: checked ? theme.primary : "transparent" }}>
        {checked ? <MaterialIcon name="check" color={theme.onPrimary} size={14} /> : null}
      </div>
      {label ? <text style={{ color: theme.onSurface, ...font(theme.typescale.bodyLarge) }}>{label}</text> : null}
    </div>
  )
}

export function RadioOption({ selected, label, onSelect, ariaDescription, ariaId }: {
  selected: boolean
  label: string
  onSelect?: () => void
  ariaDescription?: string
  ariaId?: string
}) {
  const theme = useMaterialTheme()
  return (
    <div
      onClick={onSelect}
      {...a11y({ role: "radio", ariaDescription, ariaId, ariaSelected: selected }, label)}
      style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40, cursor: "pointer" }}
    >
      <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: theme.shape.full, borderWidth: 2, borderColor: selected ? theme.primary : theme.onSurfaceVariant }}>
        {selected ? <div style={{ width: 10, height: 10, borderRadius: theme.shape.full, backgroundColor: theme.primary }} /> : null}
      </div>
      <text style={{ color: theme.onSurface, ...font(theme.typescale.bodyLarge) }}>{label}</text>
    </div>
  )
}

export function Switch({ checked, onChange, disabled, ariaLabel, ariaDescription, ariaId }: {
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  /** Accessible name — a switch has no visible text of its own. */
  ariaLabel?: string
  ariaDescription?: string
  ariaId?: string
}) {
  const theme = useMaterialTheme()
  return (
    <div
      onClick={disabled ? undefined : () => onChange?.(!checked)}
      {...a11y({ role: "switch", ariaLabel, ariaDescription, ariaId, ariaSelected: checked })}
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

export function OutlinedTextField({ label, value, placeholder, autoFocus, onChange, onSubmit, ariaLabel, ariaDescription, ariaId }: {
  label?: string
  value: string
  placeholder?: string
  autoFocus?: boolean
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  ariaLabel?: string
  ariaDescription?: string
  ariaId?: string
}) {
  const theme = useMaterialTheme()
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0
  return (
    <div
      style={{
        width: "100%",
        height: theme.metrics.fieldHeight,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        borderRadius: theme.shape.extraSmall,
        backgroundColor: "transparent",
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? theme.primary : theme.outline,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {/* Flutter notches the label into the top border; without a known parent
          surface colour behind the label the border would strike through it, so
          the label floats just inside the outline instead. */}
      {label && floated ? (
        <text style={{ color: focused ? theme.primary : theme.onSurfaceVariant, ...font(theme.typescale.labelSmall) }}>{label}</text>
      ) : null}
      <input
        value={value}
        placeholder={floated ? placeholder : (label ?? placeholder)}
        autoFocus={autoFocus}
        {...a11y({ ariaLabel, ariaDescription, ariaId, role: "textbox" }, label ?? placeholder)}
        onChange={(event) => onChange(event.value ?? "")}
        onSubmit={onSubmit ? (event) => onSubmit(event.value ?? "") : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        theme={fieldTheme(theme)}
        style={{ width: "100%", height: theme.typescale.bodyLarge.lineHeight, paddingLeft: 0, paddingRight: 0, backgroundColor: "transparent", color: theme.onSurface, fontSize: theme.typescale.bodyLarge.size, lineHeight: theme.typescale.bodyLarge.lineHeight }}
      />
    </div>
  )
}

export function Slider({ value, onChange, min = 0, max = 100, ariaLabel, ariaDescription, ariaId }: {
  value: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  ariaLabel?: string
  ariaDescription?: string
  ariaId?: string
}) {
  const theme = useMaterialTheme()
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<PublicInstance | null>(null)
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
    <div
      {...a11y({ role: "slider", ariaLabel, ariaDescription, ariaId, ariaValueText: String(clampedValue) })}
      style={{ width: trackWidth, height: 40, display: "flex", alignItems: "center", position: "relative" }}
    >
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

export function RangeSlider({ valueLow, valueHigh, onChange, min = 0, max = 100, ariaLabel, ariaDescription, ariaId }: {
  valueLow: number
  valueHigh: number
  onChange?: (low: number, high: number) => void
  min?: number
  max?: number
  ariaLabel?: string
  ariaDescription?: string
  ariaId?: string
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
    <div
      {...a11y({ role: "group", ariaLabel, ariaDescription, ariaId })}
      style={{ width: trackWidth, height: 40, display: "flex", alignItems: "center", position: "relative" }}
    >
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
        {...a11y({ role: "slider", ariaLabel: ariaLabel ? `${ariaLabel} minimum` : "Range minimum", ariaValueText: String(clampedLow) })}
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
        {...a11y({ role: "slider", ariaLabel: ariaLabel ? `${ariaLabel} maximum` : "Range maximum", ariaValueText: String(clampedHigh) })}
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
