import { createContext } from "react"
import { createMaterialTheme, type MaterialTheme } from "../theme.js"
import type { A11yProps } from "../jsx/intrinsics.js"

export const ThemeContext = createContext<MaterialTheme>(createMaterialTheme("dark"))

// ─── Material 3 motion tokens ────────────────────────────────────────────────
//
// Easing curves are the MD3 "emphasized" family. Enter uses decelerate (the
// element arrives and slows into place); exit uses accelerate (it leaves
// quickly). Durations are in seconds, which is what GPUIX's `motion.div`
// transition expects.
//
// GPUIX 0.10.0 added `AnimatePresence` + `motion.div exit`, so an exiting node
// can now play its exit curve instead of unmounting instantly. Every overlay in
// this library declares one — see `../motion.js`.

export const MOTION_EASE: [number, number, number, number] = [.2, 0, 0, 1]
export const MOTION_ENTER: [number, number, number, number] = [.05, .7, .1, 1]
export const MOTION_EXIT: [number, number, number, number] = [.3, 0, .8, .15]

/** MD3 motion durations in seconds, for `motion.div` transitions. */
export const MOTION_DURATION = {
  short: .14,
  medium: .26,
  large: .34,
} as const

/** MD3 emphasized-decelerate, the standard entrance transition. */
export const TRANSITION_ENTER = { duration: MOTION_DURATION.medium, ease: MOTION_ENTER }
/** MD3 emphasized-accelerate, the standard exit transition. */
export const TRANSITION_EXIT = { duration: MOTION_DURATION.short, ease: MOTION_EXIT }

export function font(scale: { size: number; weight: number; lineHeight: number }) {
  return { fontSize: scale.size, fontWeight: scale.weight, lineHeight: scale.lineHeight }
}

/** Accessibility props accepted by every interactive Material component. */
export type { A11yProps }
