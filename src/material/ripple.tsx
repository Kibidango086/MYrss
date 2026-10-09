import React, { useCallback, useEffect, useRef, useState } from "react"
import { motion, useGpuixRequired, type PublicInstance } from "@gpuix/react"
import { stateLayer } from "../theme.js"
import { MOTION_EASE } from "./shared.js"

// Material ink ripple.
//
// GPUIX has no ripple primitive, but everything one needs is there:
// `mouseDown` carries the press point in window coordinates, `getElementBounds`
// turns that into element-local coordinates, and `motion.div` can tween
// `width`, `height`, `left`, `top`, `borderRadius` and `opacity`. Timings and
// the easing curve are Flutter's.
//
// **The splash ends as the component's own box and corner radius, and does not
// rely on being clipped.** Growing a circle and letting the parent's
// `overflow: "hidden"` shape it does not work: GPUIX clips to the border
// rectangle, ignoring the corner radii, so the finished splash reads as a
// rectangle (observed in a real window). Instead the splash grows from the
// press point to exactly the element's box, with `borderRadius` converging on
// the element's own radius — a shape that is correct in its final frame for
// every component and needs no clipping at all. The starting radius is half the
// shorter side, so the early frames read as a rounded wavefront rather than a
// hard-edged wipe.

/** Flutter `ink_ripple.dart` `_kRadiusDuration`: the circle grows for this long. */
export const RIPPLE_RADIUS_DURATION = 0.225
/** Flutter `ink_ripple.dart` `_kFadeOutDuration`. */
export const RIPPLE_FADE_DURATION = 0.375
/**
 * Splash opacity. Material's splash *is* the pressed state layer, animated, so
 * it uses the same 12% the state layer does and composes with it exactly as
 * Flutter's highlight and splash compose.
 */
export const RIPPLE_OPACITY = stateLayer.press

/** Flutter tweens the radius with `Curves.ease`. */
const RIPPLE_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1]

interface Ripple {
  id: number
  /** Where the splash grows from, in element-local pixels. */
  x: number
  y: number
  /** The element's own box: where the splash must end up. */
  width: number
  height: number
  phase: "expand" | "fade"
}

export interface RippleControls {
  /** Attach to the pressable element so a press point can be resolved. */
  ref: React.RefObject<PublicInstance | null>
  /** Call from the element's `onMouseDown`, passing the event through. */
  onMouseDown: (event: { x?: number; y?: number }) => void
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
 * <motion.div ref={ripple.ref} onMouseDown={(event) => { setPressed(true); ripple.onMouseDown(event) }}
 *   style={{ position: "relative", overflow: "hidden" }}>
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
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  useEffect(() => () => {
    for (const timer of timers.current) clearTimeout(timer)
    timers.current.clear()
  }, [])

  const drop = useCallback((id: number) => {
    setRipples(prev => prev.filter(ripple => ripple.id !== id))
  }, [])

  /**
   * Advance one ripple: expanding → fading → gone.
   *
   * Driven by `onMotionComplete`, which GPUIX fires for the target that started
   * the tween, no-op targets included.
   */
  const advance = useCallback((id: number) => {
    setRipples(prev => {
      const next: Ripple[] = []
      for (const ripple of prev) {
        if (ripple.id !== id) next.push(ripple)
        else if (ripple.phase === "expand") next.push({ ...ripple, phase: "fade" })
        // A completed fade is dropped.
      }
      return next
    })
  }, [])

  const onMouseDown = useCallback((event: { x?: number; y?: number }) => {
    if (disabled) return
    const instance = ref.current
    const bounds = instance ? renderer.getElementBounds?.(instance.id) : null
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return

    // Event coordinates are window-space, so the press point is relative to the
    // element's own painted origin. Bounds come from the last painted frame, so
    // clamp in case the element moved between paint and press.
    const press = (value: number | undefined, extent: number) =>
      typeof value === "number" && Number.isFinite(value)
        ? Math.min(Math.max(value, 0), extent)
        : extent / 2
    const x = press(typeof event.x === "number" ? event.x - bounds.x : undefined, bounds.width)
    const y = press(typeof event.y === "number" ? event.y - bounds.y : undefined, bounds.height)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return

    const id = nextId.current++
    setRipples(prev => [...prev, { id, x, y, width: bounds.width, height: bounds.height, phase: "expand" }])

    // A missed completion would leave a translucent circle on screen forever.
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      drop(id)
    }, (RIPPLE_RADIUS_DURATION + RIPPLE_FADE_DURATION) * 1000 + 250)
    timers.current.add(timer)
  }, [disabled, drop, renderer])

  const layer = ripples.length === 0 ? null : ripples.map(ripple => {
    // The splash finishes as the element's own box with the element's own
    // corner radius, which is the only way to match a rounded component —
    // GPUIX's `overflow: "hidden"` clips to the border rectangle.
    const settled = {
      left: 0,
      top: 0,
      width: ripple.width,
      height: ripple.height,
      borderRadius: radius,
    }
    return (
      <motion.div
        key={ripple.id}
        initial={{
          left: ripple.x,
          top: ripple.y,
          width: 0,
          height: 0,
          // Half the shorter side: early frames read as a rounded wavefront.
          borderRadius: Math.min(ripple.width, ripple.height) / 2,
          opacity: 0,
        }}
        animate={ripple.phase === "expand"
          ? { ...settled, opacity: RIPPLE_OPACITY }
          : { ...settled, opacity: 0 }}
        transition={{
          duration: ripple.phase === "expand" ? RIPPLE_RADIUS_DURATION : RIPPLE_FADE_DURATION,
          ease: ripple.phase === "expand" ? RIPPLE_EASE : MOTION_EASE,
        }}
        onMotionComplete={() => advance(ripple.id)}
        style={{ position: "absolute", backgroundColor: color, pointerEvents: "none" }}
      />
    )
  })

  return { ref, onMouseDown, layer }
}
