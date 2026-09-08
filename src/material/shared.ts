import { createContext } from "react"
import { createMaterialTheme, type MaterialTheme } from "../theme.js"

export const ThemeContext = createContext<MaterialTheme>(createMaterialTheme("dark"))
export const MOTION_EASE: [number, number, number, number] = [.2, 0, 0, 1]
export const MOTION_ENTER: [number, number, number, number] = [.05, .7, .1, 1]
export const MOTION_EXIT: [number, number, number, number] = [.3, 0, .8, .15]

export function font(scale: { size: number; weight: number; lineHeight: number }) {
  return { fontSize: scale.size, fontWeight: scale.weight, lineHeight: scale.lineHeight }
}
