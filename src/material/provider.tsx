import React, { useContext } from "react"
import { createMaterialTheme, type AppearanceMode, type MaterialTheme } from "../theme.js"
import { defaultFontMono, defaultFontSans } from "../fonts.js"
import { ThemeContext } from "./shared.js"

export { ThemeContext }

export function MaterialProvider({ mode, accentColor, fontSans, fontMono, children }: {
  mode: AppearanceMode
  accentColor?: string
  /**
   * UI font family. Defaults to the best family installed on this host —
   * "Roboto" when it is present, which is what Flutter always renders in.
   * Pass "Roboto" explicitly once Roboto is installed to pin exact parity.
   */
  fontSans?: string
  /** Monospaced family. Defaults to the best family installed on this host. */
  fontMono?: string
  children: React.ReactNode
}) {
  const theme = createMaterialTheme(mode, accentColor, {
    fontSans: fontSans ?? defaultFontSans(),
    fontMono: fontMono ?? defaultFontMono(),
  })
  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: theme.surface, fontFamily: theme.fontSans }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useMaterialTheme(): MaterialTheme {
  return useContext(ThemeContext)
}
