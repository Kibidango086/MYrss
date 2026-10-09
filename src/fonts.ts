// Host font resolution and user-level font installation.
//
// Flutter ships Roboto inside every application, so a Flutter Material app
// renders in the same face on every machine. GPUIX has no font-embedding API:
// upstream `renderer.rs` only forwards `style.font_family` as a *name* for the
// operating system's font database. A component library therefore cannot bundle
// a typeface the way Flutter does.
//
// Two things are possible, and this module does both:
//
//   * `resolveFontFamily` picks the closest family the host already has, so an
//     app renders in a deliberate face instead of an unnamed default when Roboto
//     is missing.
//   * `installFontFiles` installs font files the *application* ships into the
//     per-user font directory, which is how a distributed app reaches Flutter's
//     position on Linux, macOS and Windows without asking the user to do it.
//
// Everything platform-specific is a pure function so it can be tested on one
// operating system for all of them.

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import { spawnSync } from "node:child_process"
import os from "node:os"
import path from "node:path"

/**
 * Families tried, in order, for UI text. Roboto first because that is what
 * Material 3 is drawn for; the rest are the closest widely-installed
 * neo-grotesques, one per platform.
 */
export const SANS_PREFERENCE = [
  "Roboto",
  "Inter",
  "Noto Sans",
  "Helvetica Neue",
  "Segoe UI",
  "DejaVu Sans",
  "Liberation Sans",
] as const

/** Families tried, in order, for code and monospaced text. */
export const MONO_PREFERENCE = [
  "Roboto Mono",
  "JetBrains Mono",
  "SF Mono",
  "Menlo",
  "Consolas",
  "Noto Sans Mono",
  "Source Code Pro",
  "Fira Code",
  "DejaVu Sans Mono",
  "Liberation Mono",
] as const

const FONT_EXTENSIONS = /\.(ttf|otf|ttc|otc|woff2?)$/i

/** Path rules for the *target* platform, so these helpers are testable off it. */
function pathFor(platform: NodeJS.Platform) {
  return platform === "win32" ? path.win32 : path.posix
}

/** Where a font *file* may live, by platform. Pure so it can be unit-tested. */
export function fontDirectoriesFor(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>,
  home: string,
): string[] {
  const join = pathFor(platform).join
  if (platform === "darwin") {
    return [
      join(home, "Library", "Fonts"),
      "/Library/Fonts",
      "/System/Library/Fonts",
      "/System/Library/Fonts/Supplemental",
    ]
  }
  if (platform === "win32") {
    const windows = env.WINDIR ?? "C:\\Windows"
    const localAppData = env.LOCALAPPDATA ?? join(home, "AppData", "Local")
    return [
      join(localAppData, "Microsoft", "Windows", "Fonts"),
      join(windows, "Fonts"),
    ]
  }
  const dataHome = env.XDG_DATA_HOME ?? join(home, ".local", "share")
  return [
    join(dataHome, "fonts"),
    "/usr/share/fonts",
    "/usr/local/share/fonts",
    "/run/host/fonts",
  ]
}

/**
 * The per-user directory `installFontFiles` writes to.
 *
 * User-level on purpose: a distributed app cannot assume write access to the
 * system font directory, and every one of these is picked up without elevation.
 */
export function userFontDirectory(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>,
  home: string,
): string {
  const join = pathFor(platform).join
  if (platform === "darwin") return join(home, "Library", "Fonts")
  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA ?? join(home, "AppData", "Local")
    return join(localAppData, "Microsoft", "Windows", "Fonts")
  }
  return join(env.XDG_DATA_HOME ?? join(home, ".local", "share"), "fonts")
}

/**
 * Family name implied by a font file name, normalised (lowercase, no spaces).
 *
 * A file name is the only portable signal available without parsing font
 * tables: `Roboto-Regular.ttf` → `roboto`, `NotoSans_Condensed-Bold.otf` →
 * `notosans`, `Roboto[wdth,wght].ttf` → `roboto`,
 * `RobotoMono-VariableFont_wght.ttf` → `robotomono`.
 */
export function familyFromFilename(fileName: string): string | undefined {
  if (!FONT_EXTENSIONS.test(fileName)) return undefined
  const stem = path.basename(fileName).replace(FONT_EXTENSIONS, "")
  const family = stem.split(/[-_.[]/)[0]
  return family ? family.replace(/\s+/g, "").toLowerCase() : undefined
}

function* walk(directory: string, depth: number): Generator<string> {
  let entries
  try {
    entries = readdirSync(directory, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (depth > 0) yield* walk(full, depth - 1)
    } else if (FONT_EXTENSIONS.test(entry.name)) {
      yield full
    }
  }
}

let cachedFamilies: Set<string> | null = null

/** Installed family names for this host, normalised. Scanned once per process. */
export function installedFontFamilies(): Set<string> {
  if (cachedFamilies) return cachedFamilies
  const families = new Set<string>()
  for (const directory of fontDirectoriesFor(process.platform, process.env, os.homedir())) {
    if (!existsSync(directory)) continue
    for (const file of walk(directory, 3)) {
      const family = familyFromFilename(file)
      if (family) families.add(family)
    }
  }
  cachedFamilies = families
  return families
}

/** Forget the cached scan, e.g. after installing fonts in the same process. */
export function resetFontCache(): void {
  cachedFamilies = null
  resolvedSans = null
  resolvedMono = null
}

/** Whether this host has a family installed. */
export function hasFontFamily(family: string): boolean {
  return installedFontFamilies().has(family.replace(/\s+/g, "").toLowerCase())
}

/**
 * The first preferred family the host has, or `fallback`.
 *
 * `fallback` defaults to the first preference rather than a generic CSS name:
 * an unknown family is safe — GPUI falls back to its own default — whereas
 * `"sans-serif"` is only meaningful where the platform font database
 * understands generic aliases.
 */
export function resolveFontFamily(preferred: readonly string[], fallback?: string): string {
  for (const family of preferred) {
    if (hasFontFamily(family)) return family
  }
  return fallback ?? preferred[0] ?? "Roboto"
}

let resolvedSans: string | null = null
let resolvedMono: string | null = null

/** UI font for this host, resolved once. */
export function defaultFontSans(): string {
  return resolvedSans ??= resolveFontFamily(SANS_PREFERENCE)
}

/** Monospaced font for this host, resolved once. */
export function defaultFontMono(): string {
  return resolvedMono ??= resolveFontFamily(MONO_PREFERENCE)
}

/** True when Roboto is installed, i.e. when rendering can match Flutter exactly. */
export function hasRoboto(): boolean {
  return hasFontFamily("Roboto")
}

export interface InstallFontsResult {
  /** Absolute paths that were copied. */
  installed: string[]
  /** Directory they were copied into. */
  directory: string
  /** Whether the platform's font cache had to be, and was, refreshed. */
  cacheRefreshed: boolean
}

/**
 * Install font files into the current user's font directory.
 *
 * This is how a *distributed* app reaches Flutter's position: ship the faces
 * (Roboto is Apache-2.0 and redistributable) and call this on first run. It
 * never needs elevation and never writes outside the user's profile.
 *
 * Platform notes:
 *  - Linux: copies into `~/.local/share/fonts` and runs `fc-cache -f` when
 *    fontconfig is present. Files are picked up on the next run regardless.
 *  - macOS: copies into `~/Library/Fonts`; there is no cache step.
 *  - Windows: copies into `%LOCALAPPDATA%\Microsoft\Windows\Fonts` and adds a
 *    `HKCU` registration per file, the per-user equivalent of dropping it in
 *    `C:\Windows\Fonts`.
 *
 * A face already mapped by a running process cannot be replaced, and GPUI loads
 * fonts when the window is created — so a first run that installs should
 * restart before expecting the new face.
 */
export function installFontFiles(files: readonly string[], options: { directory?: string } = {}): InstallFontsResult {
  const platform = process.platform
  const directory = options.directory ?? userFontDirectory(platform, process.env, os.homedir())
  const installed: string[] = []

  mkdirSync(directory, { recursive: true })
  for (const file of files) {
    if (!FONT_EXTENSIONS.test(file) || !existsSync(file)) continue
    const destination = path.join(directory, path.basename(file))
    if (path.resolve(file) !== path.resolve(destination)) copyFileSync(file, destination)
    if (platform === "win32") registerWindowsFont(destination)
    installed.push(destination)
  }

  const cacheRefreshed = platform === "linux" && installed.length > 0
    ? spawnSync("fc-cache", ["-f", directory], { stdio: "ignore" }).status === 0
    : false

  resetFontCache()
  return { installed, directory, cacheRefreshed }
}

/**
 * Per-user font registration on Windows.
 *
 * Dropping a file into the user font directory is not enough for DirectWrite to
 * see it; the name must also be listed under `HKCU`. A failure here is not
 * fatal — the file is on disk and a later run can register it.
 */
function registerWindowsFont(file: string): void {
  const key = "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts"
  const value = `${path.basename(file, path.extname(file))} (TrueType)`
  try {
    spawnSync("reg", ["add", key, "/v", value, "/t", "REG_SZ", "/d", file, "/f"], { stdio: "ignore" })
  } catch {
    // Best effort.
  }
}
