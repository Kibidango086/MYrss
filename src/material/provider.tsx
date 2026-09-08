import React, { useContext } from "react"
import { createMaterialTheme, type AppearanceMode, type MaterialTheme } from "../theme.js"
import { ThemeContext } from "./shared.js"

export { ThemeContext }

export function MaterialProvider({ mode, accentColor, children }: {
  mode: AppearanceMode
  accentColor?: string
  children: React.ReactNode
}) {
  const theme = createMaterialTheme(mode, accentColor)
  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: theme.surface }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useMaterialTheme(): MaterialTheme {
  return useContext(ThemeContext)
}
