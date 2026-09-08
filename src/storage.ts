// Persistence for subscriptions, cached feed data, read/star state and settings.

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import type { AppearanceMode } from "./theme.js"
import type { FeedData } from "./feeds.js"

export interface AppSettings {
  mode: AppearanceMode
  accentColor?: string
}

export interface StoredState {
  version: number
  subscriptions: string[]
  feeds: Record<string, FeedData>
  read: string[]
  starred: string[]
  settings: AppSettings
}

export const DEFAULT_SETTINGS: AppSettings = { mode: "dark" }

export function emptyState(): StoredState {
  return {
    version: 1,
    subscriptions: [],
    feeds: {},
    read: [],
    starred: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

function statePath(): string {
  if (process.env.MYRSS_STATE) return process.env.MYRSS_STATE
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config")
  return path.join(base, "myrss", "state.json")
}

export function loadState(): StoredState {
  const destination = statePath()
  try {
    if (!existsSync(destination)) return emptyState()
    const raw = JSON.parse(readFileSync(destination, "utf8")) as Partial<StoredState>
    const settings = raw.settings ?? emptyState().settings
    return {
      version: 1,
      subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : [],
      feeds: raw.feeds && typeof raw.feeds === "object" ? raw.feeds : {},
      read: Array.isArray(raw.read) ? raw.read : [],
      starred: Array.isArray(raw.starred) ? raw.starred : [],
      settings: {
        mode: settings.mode === "light" ? "light" : "dark",
        accentColor: typeof settings.accentColor === "string" ? settings.accentColor : undefined,
      },
    }
  } catch (error) {
    console.warn("Could not read MYrss state:", error)
    return emptyState()
  }
}

export async function saveState(state: StoredState): Promise<void> {
  const destination = statePath()
  try {
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  } catch (error) {
    console.warn("Could not write MYrss state:", error)
  }
}

export function ensureConfigDir(): void {
  try {
    mkdirSync(path.dirname(statePath()), { recursive: true })
  } catch {
    // best-effort
  }
}
