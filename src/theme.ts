export type AppearanceMode = "light" | "dark"
export interface SiteIdentity { name?: string; description?: string; iconUrl?: string; bannerUrl?: string; accentColor?: string }

import { CorePalette, Hct, Scheme, argbFromHex, hexFromArgb } from "@material/material-color-utilities"

export interface MaterialTheme {
  mode: AppearanceMode
  hue: number
  primary: string
  onPrimary: string
  primaryContainer: string
  onPrimaryContainer: string
  secondary: string
  onSecondary: string
  secondaryContainer: string
  onSecondaryContainer: string
  tertiary: string
  onTertiary: string
  error: string
  onError: string
  errorContainer: string
  onErrorContainer: string
  surface: string
  surfaceDim: string
  surfaceBright: string
  surfaceContainerLowest: string
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  onSurface: string
  surfaceVariant: string
  onSurfaceVariant: string
  outline: string
  outlineVariant: string
  inverseSurface: string
  inverseOnSurface: string
  inversePrimary: string
  scrim: string
  fontSans: string
  fontMono: string
  shape: {
    extraSmall: number
    small: number
    medium: number
    large: number
    extraLarge: number
    full: number
  }
  typescale: {
    displayLarge: { size: number; weight: number; lineHeight: number }
    displayMedium: { size: number; weight: number; lineHeight: number }
    displaySmall: { size: number; weight: number; lineHeight: number }
    headlineLarge: { size: number; weight: number; lineHeight: number }
    headlineMedium: { size: number; weight: number; lineHeight: number }
    headlineSmall: { size: number; weight: number; lineHeight: number }
    titleLarge: { size: number; weight: number; lineHeight: number }
    titleMedium: { size: number; weight: number; lineHeight: number }
    titleSmall: { size: number; weight: number; lineHeight: number }
    bodyLarge: { size: number; weight: number; lineHeight: number }
    bodyMedium: { size: number; weight: number; lineHeight: number }
    bodySmall: { size: number; weight: number; lineHeight: number }
    labelLarge: { size: number; weight: number; lineHeight: number }
    labelMedium: { size: number; weight: number; lineHeight: number }
    labelSmall: { size: number; weight: number; lineHeight: number }
  }
  metrics: {
    railWidth: number
    navHeight: number
    layoutGap: number
    cardGap: number
    controlGap: number
    sectionGap: number
    radiusSm: number
    radiusMd: number
    radiusLg: number
    radiusXl: number
    noteGap: number
    notePadding: number
  }
}

const DEFAULT_SOURCE = "#006a6a"

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeColor(input?: string): string | undefined {
  const match = input?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match?.[1]) return undefined
  const hex = match[1]
  return hex.length === 3 ? `#${[...hex].map(character => character + character).join("")}`.toLowerCase() : `#${hex.toLowerCase()}`
}

function rgb(color: string): [number, number, number] {
  const safe = normalizeColor(color) ?? DEFAULT_SOURCE
  return [
    Number.parseInt(safe.slice(1, 3), 16),
    Number.parseInt(safe.slice(3, 5), 16),
    Number.parseInt(safe.slice(5, 7), 16),
  ]
}

function hueOf(color: string): number {
  const [redValue, greenValue, blueValue] = rgb(color).map(value => value / 255)
  const red = redValue ?? 0, green = greenValue ?? 0, blue = blueValue ?? 0
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  if (delta === 0) return 190
  if (max === red) return ((((green - blue) / delta) % 6 + 6) % 6) * 60
  if (max === green) return ((blue - red) / delta + 2) * 60
  return ((red - green) / delta + 4) * 60
}

function hsl(hue: number, saturation: number, lightness: number): string {
  const h = (((hue % 360) + 360) % 360) / 60
  const l = clamp(lightness)
  const c = (1 - Math.abs(2 * l - 1)) * clamp(saturation)
  const x = c * (1 - Math.abs((h % 2) - 1))
  const m = l - c / 2
  const channels = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x]
  const hex = channels.map(value => Math.round(((value ?? 0) + m) * 255).toString(16).padStart(2, "0")).join("")
  return `#${hex}`
}

export function createMaterialTheme(mode: AppearanceMode, sourceColor?: string): MaterialTheme {
  const source = normalizeColor(sourceColor) ?? DEFAULT_SOURCE
  const argb = argbFromHex(source)
  const scheme = mode === "dark" ? Scheme.dark(argb) : Scheme.light(argb)
  const palette = CorePalette.of(argb)
  const neutral = palette.n1
  const dark = mode === "dark"

  return {
    mode,
    hue: Hct.fromInt(argb).hue,
    primary: hexFromArgb(scheme.primary),
    onPrimary: hexFromArgb(scheme.onPrimary),
    primaryContainer: hexFromArgb(scheme.primaryContainer),
    onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),
    secondary: hexFromArgb(scheme.secondary),
    onSecondary: hexFromArgb(scheme.onSecondary),
    secondaryContainer: hexFromArgb(scheme.secondaryContainer),
    onSecondaryContainer: hexFromArgb(scheme.onSecondaryContainer),
    tertiary: hexFromArgb(scheme.tertiary),
    onTertiary: hexFromArgb(scheme.onTertiary),
    error: hexFromArgb(scheme.error),
    onError: hexFromArgb(scheme.onError),
    errorContainer: hexFromArgb(scheme.errorContainer),
    onErrorContainer: hexFromArgb(scheme.onErrorContainer),
    surface: hexFromArgb(scheme.surface),
    surfaceDim: hexFromArgb(neutral.tone(dark ? 6 : 87)),
    surfaceBright: hexFromArgb(neutral.tone(dark ? 24 : 98)),
    surfaceContainerLowest: hexFromArgb(neutral.tone(dark ? 4 : 100)),
    surfaceContainerLow: hexFromArgb(neutral.tone(dark ? 10 : 96)),
    surfaceContainer: hexFromArgb(neutral.tone(dark ? 12 : 94)),
    surfaceContainerHigh: hexFromArgb(neutral.tone(dark ? 17 : 92)),
    surfaceContainerHighest: hexFromArgb(neutral.tone(dark ? 22 : 90)),
    onSurface: hexFromArgb(scheme.onSurface),
    surfaceVariant: hexFromArgb(scheme.surfaceVariant),
    onSurfaceVariant: hexFromArgb(scheme.onSurfaceVariant),
    outline: hexFromArgb(scheme.outline),
    outlineVariant: hexFromArgb(scheme.outlineVariant),
    inverseSurface: hexFromArgb(scheme.inverseSurface),
    inverseOnSurface: hexFromArgb(scheme.inverseOnSurface),
    inversePrimary: hexFromArgb(scheme.inversePrimary),
    scrim: hexFromArgb(scheme.scrim),
    fontSans: "Roboto",
    fontMono: "Roboto Mono",
    shape: {
      extraSmall: 4,
      small: 8,
      medium: 12,
      large: 16,
      extraLarge: 28,
      full: 999,
    },
    typescale: {
      displayLarge: { size: 57, weight: 400, lineHeight: 64 },
      displayMedium: { size: 45, weight: 400, lineHeight: 52 },
      displaySmall: { size: 36, weight: 400, lineHeight: 44 },
      headlineLarge: { size: 32, weight: 400, lineHeight: 40 },
      headlineMedium: { size: 28, weight: 400, lineHeight: 36 },
      headlineSmall: { size: 24, weight: 400, lineHeight: 32 },
      titleLarge: { size: 22, weight: 400, lineHeight: 28 },
      titleMedium: { size: 16, weight: 500, lineHeight: 24 },
      titleSmall: { size: 14, weight: 500, lineHeight: 20 },
      bodyLarge: { size: 16, weight: 400, lineHeight: 24 },
      bodyMedium: { size: 14, weight: 400, lineHeight: 20 },
      bodySmall: { size: 12, weight: 400, lineHeight: 16 },
      labelLarge: { size: 14, weight: 500, lineHeight: 20 },
      labelMedium: { size: 12, weight: 500, lineHeight: 16 },
      labelSmall: { size: 11, weight: 500, lineHeight: 16 },
    },
    metrics: {
      railWidth: 288,
      navHeight: 72,
      layoutGap: 24,
      cardGap: 16,
      controlGap: 12,
      sectionGap: 28,
      radiusSm: 8,
      radiusMd: 12,
      radiusLg: 16,
      radiusXl: 28,
      noteGap: 18,
      notePadding: 20,
    },
  }
}

// --- surfaceAtElevation utility ---

/**
 * Returns the correct surface container token for a given elevation level (0-5).
 * Maps MD3 elevation levels to surface container color roles.
 */
export function surfaceAtElevation(theme: MaterialTheme, level: 0 | 1 | 2 | 3 | 4 | 5): string {
  switch (level) {
    case 0: return theme.surface
    case 1: return theme.surfaceContainerLowest
    case 2: return theme.surfaceContainerLow
    case 3: return theme.surfaceContainer
    case 4: return theme.surfaceContainerHigh
    case 5: return theme.surfaceContainerHighest
  }
}

// --- M3 Duration tokens ---

export const duration = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  medium3: 350,
  medium4: 400,
  long1: 450,
  long2: 500,
} as const

// --- State layer opacity tokens ---

export const stateLayer = {
  hover: 0.08,
  focus: 0.12,
  press: 0.12,
  drag: 0.16,
} as const
