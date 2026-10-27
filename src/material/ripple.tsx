import React, { useCallback, useEffect, useRef, useState } from "react"
import { motion, useGpuixRequired, type PublicInstance } from "@gpuix/react"
import { stateLayer } from "../theme.js"

// Material ink ripple, following Flutter's `InkRipple` (`ink_ripple.dart`) —
// the splash M3 uses on desktop: `ThemeData` picks `InkSparkle` only on
// Android and `InkRipple` on every other platform.
//
// Flutter runs three animations *concurrently* and confirms them on release:
//
//   press down   `_kFadeInDuration` (75ms): alpha 0 → 12%, while the splash
//                grows as far as `Curves.ease` has travelled by then
//   still held   `_kUnconfirmedRippleDuration` (1s in total): an unreleased
//                splash keeps expanding, then waits at full size
//   release      `confirm()`: `_kRadiusDuration` (225ms) to finish the
//                expansion, then the visible tail of `_kFadeOutDuration` —
//                its alpha tween is `Interval(225/375, 1)`, so the splash
//                holds for 225ms and fades over the last 150ms
//   drag off     `cancel()`: `_kCancelDuration` (75ms), fading from wherever
//                the splash had got to
//
// GPUIX animates one target per element, so that schedule is replayed as
// chained phases whose durations sum to the same totals: 375ms from release to
// gone, 1s from press to a held splash at full size.
//
// Geometry follows `InkRipple.paintFeature`: a circle of radius
// `lerp(0.30 * T, T + 5, ease)`, centred at `lerp(pressPoint, boxCentre,
// ease)`, where `T` is half the box diagonal (`_getTargetRadius`). Flutter
// clips that circle to the widget's rounded silhouette (`paintInkCircle` →
// `clipRRect`); GPUIX's `overflow: "hidden"` clips to the border *rectangle*
// and ignores the corner radii — which is what made the ink finish as a bare
// rectangle on a pill button. The splash therefore ends as the element's own
// box with the element's own radius, and never relies on being clipped into
// shape.

/** Flutter `_kUnconfirmedRippleDuration`: how long an unreleased splash grows. */
export const RIPPLE_UNCONFIRMED_DURATION = 1
/** Flutter `_kFadeInDuration`: press down to the splash's full 12%. */
export const RIPPLE_FADE_IN_DURATION = 0.075
/** Flutter `_kRadiusDuration`: a confirmed splash's remaining expansion. */
export const RIPPLE_RADIUS_DURATION = 0.225
/** Flutter `_kFadeOutDuration`: `confirm()` to gone. */
export const RIPPLE_FADE_OUT_DURATION = 0.375
/** Flutter `_kCancelDuration`: a cancelled splash's fade. */
export const RIPPLE_CANCEL_DURATION = 0.075
/**
 * Splash opacity. Material's splash *is* the pressed state layer, animated, so
 * it uses the same 12% the state layer does and composes with it exactly as
 * Flutter's highlight and splash compose.
 */
export const RIPPLE_OPACITY = stateLayer.press

/**
 * Flutter's `Curves.ease` — `Cubic(0.25, 0.1, 0.25, 1.0)`, the curve the
 * splash travels on. GPUIX takes the same cubic as a four-number `ease`.
 */
const SPLASH_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1]

/**
 * `Curves.ease` has travelled this far (`ease(1/3)`) when the 75ms fade-in
 * ends. Splitting the expansion there lets the fade-in's alpha ramp stay
 * linear — Flutter's `IntTween` has no curve — while the geometry follows the
 * real curve on either side of the split.
 */
const GROW_FADE_IN_KNOT = 0.5763
/** Flutter's `Tween(begin: _targetRadius * 0.30, ...)`: a splash is born big. */
const SPLASH_BIRTH_FRACTION = 0.3
/** Flutter's `Tween(..., end: _targetRadius + 5.0)`. */
const SPLASH_OVERSHOOT = 5

/** Phases a splash moves through. */
type Phase = "in" | "hold" | "held" | "grow" | "fade" | "cancel"

/** Phase the splash grows into. `undefined` freezes the shape it has reached. */
const PHASE_TARGET: Record<Phase, number | undefined> = {
  in: GROW_FADE_IN_KNOT,
  hold: 1,
  held: 1,
  grow: 1,
  fade: undefined,
  cancel: undefined,
}

/** Tween duration of each phase, in seconds. */
const PHASE_DURATION: Record<Phase, number> = {
  in: RIPPLE_FADE_IN_DURATION,
  // `_kUnconfirmedRippleDuration` less the fade-in already spent on it.
  hold: RIPPLE_UNCONFIRMED_DURATION - RIPPLE_FADE_IN_DURATION,
  // `held` has nothing left to move, but a tween still needs a duration.
  held: RIPPLE_FADE_IN_DURATION,
  grow: RIPPLE_RADIUS_DURATION,
  // The tail of `_kFadeOutDuration`: its alpha starts at 225/375 of the way in.
  fade: RIPPLE_FADE_OUT_DURATION - RIPPLE_RADIUS_DURATION,
  cancel: RIPPLE_CANCEL_DURATION,
}

/**
 * Where a phase's completion goes. `undefined` removes the splash, except for
 * `held`, which has nowhere to go and simply waits for the release.
 */
const NEXT_PHASE: Partial<Record<Phase, Phase>> = {
  in: "hold",
  hold: "held",
  grow: "fade",
}

/** Phases whose completion removes the splash. */
const TERMINAL_PHASES: Phase[] = ["fade", "cancel"]

/** `hold` and `grow` travel on Flutter's curve; the rest are linear. */
const PHASE_EASE: Partial<Record<Phase, [number, number, number, number]>> = {
  hold: SPLASH_EASE,
  grow: SPLASH_EASE,
}

/**
 * Phases a splash is still being *pressed* through. A new press discards them:
 * they belong to a gesture whose release never arrived, so leaving them on
 * screen would strand 12% ink on the control.
 */
const LIVE_PHASES: Phase[] = ["in", "hold", "held"]

const DEADLINE_SLACK = 0.25

const lerp = (from: number, to: number, fraction: number) => from + (to - from) * fraction

interface Ripple {
  id: number
  /** Where the splash grows from, in element-local pixels. */
  x: number
  y: number
  /** The element's own box: where the splash must end up. */
  width: number
  height: number
  /** The element's own corner radius: the splash's final curvature. */
  radius: number
  /** Flutter's `_targetRadius`, half the box diagonal: the radius that covers it. */
  targetRadius: number
  phase: Phase
  /** The growth this phase's tween starts from, and when that tween started. */
  growth: number
  since: number
}

/** The farthest corner of the element box from the splash's centre. */
function farthestCorner(ripple: Ripple, centreX: number, centreY: number) {
  const dx = Math.max(centreX, ripple.width - centreX)
  const dy = Math.max(centreY, ripple.height - centreY)
  return Math.hypot(dx, dy)
}

/**
 * The splash's box and curvature at an eased growth of `progress`, where 0 is
 * the moment of the press and 1 is the whole element covered.
 *
 * Flutter paints a circle clipped to the widget's rounded silhouette. Since
 * GPUIX can only clip rectangles, what is painted is the circle's bounding box
 * inside the element, with the curvature converging on the element's own
 * radius as the splash covers it. A box the circle sits inside is square and
 * takes half its side, so it reads as the circle itself; by the last frame the
 * box is the element's box and the radius is the element's radius, exactly.
 */
function shapeAt(ripple: Ripple, progress: number) {
  const { x, y, width, height, radius, targetRadius } = ripple
  // Snapped, so the final frame is exactly the element's own box rather than
  // something a floating-point hair inside it.
  if (progress >= 1) return { left: 0, top: 0, width, height, borderRadius: radius }

  const disc = lerp(targetRadius * SPLASH_BIRTH_FRACTION, targetRadius + SPLASH_OVERSHOOT, progress)
  const centreX = lerp(x, width / 2, progress)
  const centreY = lerp(y, height / 2, progress)
  const left = Math.max(0, centreX - disc)
  const top = Math.max(0, centreY - disc)
  const boxWidth = Math.min(width, centreX + disc) - left
  const boxHeight = Math.min(height, centreY + disc) - top
  // Half the shorter side is the roundest a box can get — the wavefront.
  const circular = Math.min(disc, boxWidth / 2, boxHeight / 2)
  // …and the element's own curvature takes over as the wavefront reaches it,
  // so the splash settles into the element's shape instead of snapping to it.
  const coverage = Math.min(1, disc / farthestCorner(ripple, centreX, centreY))
  return {
    left,
    top,
    width: boxWidth,
    height: boxHeight,
    borderRadius: lerp(circular, radius, coverage ** 3),
  }
}

/**
 * Where an interrupted splash's growth actually is. The rendered value lives in
 * the native tween, which the library cannot read back, so it is reconstructed
 * from the phase's clock: every phase eases linearly between two knots.
 */
function growthNow(ripple: Ripple): number {
  const duration = PHASE_DURATION[ripple.phase]
  const target = PHASE_TARGET[ripple.phase]
  if (duration <= 0 || target === undefined) return ripple.growth
  const fraction = Math.min(Math.max((Date.now() - ripple.since) / 1000 / duration, 0), 1)
  return lerp(ripple.growth, target, fraction)
}

export interface RippleControls {
  /** Attach to the pressable element so a press point can be resolved. */
  ref: React.RefObject<PublicInstance | null>
  /** Call from the element's `onMouseDown`, passing the event through. */
  onMouseDown: (event: { x?: number; y?: number }) => void
  /**
   * Call from the element's `onMouseUp`. Flutter confirms the splash on
   * release — `InkRipple.confirm()` — so a splash that is released early
   * finishes its expansion, and one that was held stays until it is let go.
   * Leaving this unwired leaves a splash at its unconfirmed size until the next
   * press or a `mouseLeave`; there is no timer that can tell a held control
   * from a lost release.
   */
  onMouseUp: () => void
  /**
   * Call from the element's `onMouseLeave`. Dragging off a control cancels the
   * gesture, and Flutter cancels the splash with it. Safe to call when no press
   * is in progress.
   */
  onMouseLeave: () => void
  /**
   * Render inside the pressable element, which must be positioned and set
   * `overflow: "hidden"`.
   */
  layer: React.ReactNode
}

/**
 * Ink ripple for one pressable element.
 *
 * ```tsx
 * const ripple = useRipple({ color: theme.onSurface, radius: theme.shape.full, disabled })
 * <motion.div
 *   ref={ripple.ref}
 *   onMouseDown={disabled ? undefined : (event) => { setPressed(true); ripple.onMouseDown(event) }}
 *   onMouseUp={disabled ? undefined : () => { setPressed(false); ripple.onMouseUp() }}
 *   onMouseLeave={() => { setHovered(false); ripple.onMouseLeave() }}
 *   style={{ position: "relative", overflow: "hidden", borderRadius: theme.shape.full }}
 * >
 *   <StateLayer … />
 *   {ripple.layer}
 *   {children}
 * </motion.div>
 * ```
 *
 * A press whose bounds cannot be resolved spawns nothing rather than a
 * misplaced splash; the state layer still gives press feedback.
 */
export function useRipple({ color, radius = 0, disabled }: {
  color: string
  /**
   * The element's own corner radius. The splash finishes with this radius, so
   * pass the same token the element's `style` uses — this is what makes the
   * ripple take the component's shape.
   */
  radius?: number
  disabled?: boolean
}): RippleControls {
  const renderer = useGpuixRequired()
  const ref = useRef<PublicInstance | null>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const nextId = useRef(0)
  const deadlines = useRef(new Map<number, { phase: Phase; timer: ReturnType<typeof setTimeout> }>())

  /**
   * Step one splash along the timeline.
   *
   * Driven by `onMotionComplete`, which GPUIX fires for the target that started
   * the tween — and backstopped by a deadline per phase, because a tween whose
   * target never changes (confirming a splash that is already at full size)
   * has no completion to wait for.
   */
  const advance = useCallback((id: number, from: Phase) => {
    setRipples(previous => {
      const next: Ripple[] = []
      for (const ripple of previous) {
        if (ripple.id !== id || ripple.phase !== from) {
          next.push(ripple)
          continue
        }
        const phase = NEXT_PHASE[from]
        if (!phase) {
          // A finished fade or cancel is gone; `held` waits for the release.
          if (!TERMINAL_PHASES.includes(from)) next.push(ripple)
          continue
        }
        next.push({ ...ripple, phase, growth: PHASE_TARGET[from] ?? ripple.growth, since: Date.now() })
      }
      return next
    })
  }, [])

  // One deadline per live tween: a completion that never arrives must not
  // strand a splash on screen. `held` has no deadline — it is waiting for the
  // pointer, not for an animation.
  useEffect(() => {
    const armed = deadlines.current
    for (const ripple of ripples) {
      const existing = armed.get(ripple.id)
      if (existing?.phase === ripple.phase) continue
      // A phase that needs no deadline — `held` waits for the pointer, not for
      // an animation — still retires the one its predecessor armed.
      if (existing) clearTimeout(existing.timer)
      armed.delete(ripple.id)
      const duration = PHASE_DURATION[ripple.phase]
      const advancing = NEXT_PHASE[ripple.phase] !== undefined || TERMINAL_PHASES.includes(ripple.phase)
      if (duration <= 0 || !advancing) continue
      const timer = setTimeout(() => {
        armed.delete(ripple.id)
        advance(ripple.id, ripple.phase)
      }, (duration + DEADLINE_SLACK) * 1000)
      armed.set(ripple.id, { phase: ripple.phase, timer })
    }
    for (const [id, existing] of armed) {
      if (ripples.some(ripple => ripple.id === id)) continue
      clearTimeout(existing.timer)
      armed.delete(id)
    }
  }, [ripples, advance])

  useEffect(() => () => {
    for (const { timer } of deadlines.current.values()) clearTimeout(timer)
    deadlines.current.clear()
  }, [])

  const onMouseDown = useCallback((event: { x?: number; y?: number }) => {
    if (disabled) return
    const instance = ref.current
    const bounds = instance ? renderer.getElementBounds?.(instance.id) : null
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return

    // Event coordinates are window-space, so the press point is relative to the
    // element's own painted origin. Bounds come from the last painted frame, so
    // clamp in case the element moved between paint and press.
    const clamp = (value: number | undefined, extent: number) =>
      typeof value === "number" && Number.isFinite(value)
        ? Math.min(Math.max(value, 0), extent)
        : extent / 2
    const x = clamp(typeof event.x === "number" ? event.x - bounds.x : undefined, bounds.width)
    const y = clamp(typeof event.y === "number" ? event.y - bounds.y : undefined, bounds.height)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return

    const id = nextId.current++
    setRipples(previous => [
      // A splash still being pressed through belongs to a gesture that never
      // released; the new press supersedes it.
      ...previous.filter(ripple => !LIVE_PHASES.includes(ripple.phase)),
      {
        id, x, y,
        width: bounds.width,
        height: bounds.height,
        radius,
        // Flutter's `_getTargetRadius`: half the diagonal covers the box from
        // its centre, wherever the press landed.
        targetRadius: Math.hypot(bounds.width, bounds.height) / 2,
        phase: "in" as const,
        growth: 0,
        since: Date.now(),
      },
    ])
  }, [disabled, radius, renderer])

  const onMouseUp = useCallback(() => {
    setRipples(previous => previous.map(ripple =>
      LIVE_PHASES.includes(ripple.phase)
        ? { ...ripple, phase: "grow" as const, growth: growthNow(ripple), since: Date.now() }
        : ripple))
  }, [])

  const onMouseLeave = useCallback(() => {
    // Only an unconfirmed splash is cancelled. A released one is already
    // confirmed, and Flutter lets it finish even if the pointer moves away.
    setRipples(previous => previous.map(ripple =>
      LIVE_PHASES.includes(ripple.phase)
        ? { ...ripple, phase: "cancel" as const, growth: growthNow(ripple), since: Date.now() }
        : ripple))
  }, [])

  const layer = ripples.length === 0 ? null : ripples.map(ripple => {
    const phase = ripple.phase
    const easing = PHASE_EASE[phase]
    const faded = TERMINAL_PHASES.includes(phase)
    return (
      <motion.div
        key={ripple.id}
        initial={{ ...shapeAt(ripple, 0), opacity: 0 }}
        animate={{
          ...shapeAt(ripple, PHASE_TARGET[phase] ?? ripple.growth),
          opacity: faded ? 0 : RIPPLE_OPACITY,
        }}
        transition={easing
          ? { duration: PHASE_DURATION[phase], ease: easing }
          : { duration: PHASE_DURATION[phase], ease: "linear" }}
        onMotionComplete={() => advance(ripple.id, phase)}
        style={{ position: "absolute", backgroundColor: color, pointerEvents: "none" }}
      />
    )
  })

  return { ref, onMouseDown, onMouseUp, onMouseLeave, layer }
}
