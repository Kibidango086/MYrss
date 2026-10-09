export type AppearanceMode = "light" | "dark"
export interface SiteIdentity { name?: string; description?: string; iconUrl?: string; bannerUrl?: string; accentColor?: string }

/**
 * MD3 elevation level. 1–5 are the spec levels; 6 is Flutter's default FAB and
 * snackbar elevation, so it is included to match Flutter exactly.
 */
export type ElevationLevel = 1 | 2 | 3 | 4 | 5 | 6

/**
 * One drop shadow, shaped to drop straight into a style's `boxShadow`.
 *
 * Flutter draws each MD3 elevation as a key shadow plus an ambient one; GPUI
 * takes a single shadow, so these carry the ambient component, which is the
 * soft one that reads as elevation.
 */
export interface Shadow {
  offsetX: number
  offsetY: number
  blurRadius: number
  spreadRadius: number
  color: string
}

export interface ThemeOptions {
  /**
   * UI font family. Defaults to `"Roboto"` — the face Material 3 is drawn for,
   * and the one Flutter embeds. GPUIX resolves family names against the host,
   * so a machine without Roboto renders in GPUI's fallback; `MaterialProvider`
   * resolves a family the host actually has when this is not given.
   */
  fontSans?: string
  /** Monospaced family. Defaults to `"Roboto Mono"`. */
  fontMono?: string
}

import { CorePalette, Hct, Scheme, argbFromHex, hexFromArgb } from "@material/material-color-utilities"
import type { GpuixMetrics, GpuixTheme } from "@gpuix/react"

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
  /**
   * The M3 scrim composited at the 32% opacity M3 uses for modal backdrops.
   * Use this for dialogs; use `scrim` when a full-screen viewer needs an
   * opaque backdrop (an image lightbox), because a 32% wash would let the
   * application behind it show through the picture.
   */
  scrimOverlay: string
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
    /** Standard navigation drawer width. Flutter: `Drawer._kWidth`. */
    drawerWidth: number
    /** Top app bar height. Flutter: `kToolbarHeight`. */
    appBarHeight: number
    /** Text field container height. Flutter: `InputDecorator`. */
    fieldHeight: number
    /** Snackbar height. Flutter M3 fixed snackbar. */
    snackbarHeight: number
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
  /**
   * MD3 elevation shadows, keyed by level. Flutter applies these to elevated
   * cards, menus, dialogs and the navigation drawer; the tonal surface roles
   * alone do not read as elevation on a light background.
   */
  elevation: Record<ElevationLevel, Shadow>
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

export function createMaterialTheme(mode: AppearanceMode, sourceColor?: string, options: ThemeOptions = {}): MaterialTheme {
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
    // M3 pins `surface` to neutral tone 6 in dark and 98 in light. MCU's legacy
    // `Scheme` still reports tone 10 for dark, which collides with
    // `surfaceContainerLow` and collapses the whole surface ramp into one
    // colour, so the tone is taken from the neutral palette instead.
    surface: hexFromArgb(neutral.tone(dark ? 6 : 98)),
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
    // 0x52 = 82/255 ≈ 32%, the opacity M3 specifies for a modal scrim.
    scrimOverlay: `${hexFromArgb(scheme.scrim)}52`,
    fontSans: options.fontSans ?? "Roboto",
    fontMono: options.fontMono ?? "Roboto Mono",
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
      // Flutter `Drawer._kWidth` (NavigationDrawer wraps a Drawer).
      drawerWidth: 304,
      // Flutter `kToolbarHeight`, the default `AppBar.toolbarHeight`.
      appBarHeight: 56,
      // Flutter `InputDecorator` filled container height.
      fieldHeight: 56,
      // Flutter M3 `SnackBar` fixed height.
      snackbarHeight: 48,
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
    elevation: {
      1: { offsetX: 0, offsetY: 1, blurRadius: 3, spreadRadius: 1, color: "#00000026" },
      2: { offsetX: 0, offsetY: 2, blurRadius: 6, spreadRadius: 2, color: "#00000026" },
      3: { offsetX: 0, offsetY: 4, blurRadius: 8, spreadRadius: 3, color: "#00000026" },
      4: { offsetX: 0, offsetY: 6, blurRadius: 10, spreadRadius: 4, color: "#00000026" },
      5: { offsetX: 0, offsetY: 8, blurRadius: 12, spreadRadius: 6, color: "#00000026" },
      // Flutter M3 FAB and SnackBar both rest at elevation 6.
      6: { offsetX: 0, offsetY: 10, blurRadius: 16, spreadRadius: 8, color: "#00000026" },
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

/**
 * The raw drop shadow for an MD3 elevation level.
 *
 * To put it on an element use `elevationShadow`, which wraps it under the
 * `boxShadow` key. Spreading these fields flat into a style is silently
 * dropped by the renderer — and the shadow's `color` would leak into the
 * element's inherited text colour.
 */
export function shadowAtElevation(theme: MaterialTheme, level: ElevationLevel): Shadow {
  return theme.elevation[level]
}

/**
 * Style fragment carrying an MD3 elevation shadow, ready to spread.
 *
 * ```tsx
 * style={{ borderRadius: 12, ...elevationShadow(theme, 1) }}
 * ```
 */
export function elevationShadow(theme: MaterialTheme, level: ElevationLevel): { boxShadow: Shadow } {
  return { boxShadow: theme.elevation[level] }
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

// --- GPUIX native component theming ---

/**
 * Translate a Material You theme into GPUIX's native theme tokens.
 *
 * GPUIX paints `<code>`, `<diff>`, `<markdown>`, `<input>` and `<textarea>`
 * inside Rust with its own default palette and its own layout metrics, so none
 * of this library's React surfaces affect them. Passing the result to those
 * elements' `theme` prop keeps native-painted content on the same Material 3
 * colour roles and the same MD3 typescale as the rest of the page.
 *
 * The syntax palette derives from colour roles rather than hand-picked hexes,
 * so it follows `accentColor` and light/dark mode automatically:
 *
 * | Capture | Role |
 * | --- | --- |
 * | comment | `outline` |
 * | keyword, function, type, tag | `primary` |
 * | string, macro, label | `tertiary` |
 * | number, boolean, constant, constructor, attribute | `secondary` |
 * | variable, property | `onSurface` |
 * | parameter, operator, punctuation | `onSurfaceVariant` |
 * | invalid | `error` |
 *
 * Text metrics are taken from `bodyMedium`; markdown headings follow
 * `headlineMedium` → `titleMedium`, and radii follow the MD3 shape scale.
 */
export function nativeTheme(theme: MaterialTheme, overrides: GpuixTheme = {}): GpuixTheme {
  const { typescale, shape } = theme

  const syntax: NonNullable<GpuixTheme["syntax"]> = {
    comment: theme.outline,
    keyword: theme.primary,
    string: theme.tertiary,
    stringSpecial: theme.tertiary,
    escape: theme.tertiary,
    number: theme.secondary,
    boolean: theme.secondary,
    typeName: theme.primary,
    typeBuiltin: theme.primary,
    constructor: theme.secondary,
    function: theme.primary,
    functionBuiltin: theme.primary,
    macroName: theme.tertiary,
    property: theme.onSurface,
    constant: theme.secondary,
    variable: theme.onSurface,
    variableSpecial: theme.onSurface,
    parameter: theme.onSurfaceVariant,
    operator: theme.onSurfaceVariant,
    punctuation: theme.onSurfaceVariant,
    tag: theme.primary,
    attribute: theme.secondary,
    label: theme.tertiary,
    invalid: theme.error,
  }

  const metrics: GpuixMetrics = {
    codeTextSize: typescale.bodyMedium.size,
    codeLineHeight: typescale.bodyMedium.lineHeight,
    diffTextSize: typescale.bodyMedium.size,
    diffLineHeight: typescale.bodyMedium.lineHeight,
    mdTextSize: typescale.bodyMedium.size,
    mdLineHeight: typescale.bodyMedium.lineHeight,
    mdBlockGap: theme.metrics.cardGap,
    mdHeadingSizes: [
      typescale.headlineMedium.size,
      typescale.headlineSmall.size,
      typescale.titleLarge.size,
      typescale.titleMedium.size,
    ],
    mdHeadingLineHeights: [
      typescale.headlineMedium.lineHeight,
      typescale.headlineSmall.lineHeight,
      typescale.titleLarge.lineHeight,
      typescale.titleMedium.lineHeight,
    ],
    mdInlineCodeRadius: shape.extraSmall,
    mdCodeRadius: shape.small,
    mdCodePaddingX: theme.metrics.cardGap,
    mdCodePaddingY: theme.metrics.controlGap,
  }

  return {
    appearance: theme.mode,
    bg: theme.surface,
    border: theme.outlineVariant,
    text: theme.onSurface,
    textMuted: theme.onSurfaceVariant,
    textFaint: theme.outline,
    textDim: theme.outlineVariant,
    accent: theme.primary,
    caret: theme.primary,
    codeText: theme.onSurface,
    codeWash: theme.surfaceContainerHighest,
    // `diffDel` is the one place a Material error role carries non-error
    // meaning: a removed line is destructive-by-definition in a diff.
    diffAdd: theme.tertiary,
    diffDel: theme.error,
    diffHunkBg: theme.surfaceContainer,
    fontSans: theme.fontSans,
    fontMono: theme.fontMono,
    ...overrides,
    syntax: { ...syntax, ...overrides.syntax },
    metrics: { ...metrics, ...overrides.metrics },
  }
}
