// Behavioural check: the real MYrss app tree mounts AND reacts through GPUIX
// 0.10.0's React reconciler.
//
//   bun run test
//
// No GPU, no window: the reconciler runs against a stub mutation host that
// records every op, and `handleGpuixEvent` feeds real clicks back into the
// app's registered handlers. The assertions replay that op stream into the
// *current* state of the UI — live labels, live text, and the final child
// order — because a raw op scan would "find" a value that has since been
// replaced or removed.

import React from "react"
import os from "node:os"
import path from "node:path"
import { mkdtempSync, writeFileSync } from "node:fs"
import { createRoot, flushSync, handleGpuixEvent } from "@gpuix/react"
import { createMaterialTheme } from "../src/theme.js"
import { dispatchWindowKey } from "../src/shortcuts.js"

// A seeded state file puts the app in a realistic "one feed, one unread
// article" state without touching the real ~/.config, ~/.cache or the network.
const sandbox = mkdtempSync(path.join(os.tmpdir(), "myrss-check-"))
const statePath = path.join(sandbox, "state.json")
process.env.MYRSS_STATE = statePath
process.env.XDG_CONFIG_HOME = sandbox
process.env.XDG_CACHE_HOME = sandbox

// Images must actually download for inline placement to be observable, and the
// feed request must fail so failure surfacing has something to show.
const TINY_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
])
const fetched: string[] = []
globalThis.fetch = ((input: RequestInfo | URL) => {
  const url = String(input)
  fetched.push(url)
  if (/\.png$/i.test(url)) {
    return Promise.resolve(new Response(TINY_PNG, { status: 200, headers: { "content-type": "image/png" } }))
  }
  // Offline: this is the failure that has to survive on the feed row.
  return Promise.reject(new Error("offline"))
}) as unknown as typeof fetch

const FEED_URL = "https://example.com/feed.xml"
const ARTICLE = "Seeded article"
const ARTICLE_BODY = [
  "<p>First paragraph.</p>",
  '<img src="https://example.com/one.png" alt="One">',
  "<p>Second paragraph.</p>",
  '<img src="https://example.com/two.png" alt="Two">',
  "<p>Third paragraph.</p>",
].join("")

function seed(refreshOnStart: boolean) {
  writeFileSync(statePath, `${JSON.stringify({
    version: 1,
    subscriptions: [FEED_URL],
    feeds: {
      [FEED_URL]: {
        url: FEED_URL,
        title: "Example Feed",
        description: "Seeded by the check",
        fetchedAt: Date.now(),
        items: [{
          id: "item-1",
          title: ARTICLE,
          link: "https://example.com/article",
          summary: "A seeded summary line.",
          content: ARTICLE_BODY,
          published: Date.now() - 60_000,
        }],
      },
    },
    read: [],
    starred: [],
    settings: { mode: "dark", refreshOnStart, autoRefreshMinutes: 30 },
  }, null, 2)}\n`)
}
seed(true)

type Op = [string, ...unknown[]]
const batches: Op[][] = []
const renderer = {
  applyBatch(json: string): number[] {
    batches.push(JSON.parse(json) as Op[])
    return []
  },
  getWindowSize: () => ({ width: 1200, height: 800 }),
  // Pressed bounds, so the app's own ripple wiring can be exercised.
  getElementBounds: () => ({ x: 0, y: 0, width: 200, height: 40 }),
  scrollTo: () => { },
  scrollToItem: () => { },
  focusElement: () => { },
  blur: () => { },
}

const ops = () => batches.flat()
const all = () => JSON.stringify(batches)

/** Drain React's concurrent commits plus the presence/effect follow-ups. */
async function drain() {
  for (let i = 0; i < 12; i++) {
    flushSync()
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

/** Replay the op stream into the current custom-prop value of every live element. */
function liveProp(key: string): Map<number, string> {
  const values = new Map<number, string>()
  for (const op of ops()) {
    const id = op[1]
    if (typeof id !== "number") continue
    if (op[0] === "destroyElement") {
      values.delete(id)
    } else if (op[0] === "setCustomProp" && op[2] === key) {
      if (op[3] === undefined || op[3] === null) values.delete(id)
      else values.set(id, String(op[3]))
    }
  }
  return values
}

/** Current text of every live `<text>` node. */
function liveText(): Map<number, string> {
  const texts = new Map<number, string>()
  for (const op of ops()) {
    const id = op[1]
    if (typeof id !== "number") continue
    if (op[0] === "destroyElement") texts.delete(id)
    else if (op[0] === "setText") texts.set(id, String(op[2]))
  }
  return texts
}

/** The final child order and element types of the retained tree. */
function liveTree(): { types: Map<number, string>; children: Map<number, number[]> } {
  const types = new Map<number, string>()
  const children = new Map<number, number[]>()
  for (const op of ops()) {
    if (op[0] === "createElement" && typeof op[1] === "number") {
      types.set(op[1], String(op[2]))
      children.set(op[1], [])
    } else if (op[0] === "appendChild") {
      children.get(op[1] as number)?.push(op[2] as number)
    } else if (op[0] === "insertBefore") {
      const list = children.get(op[1] as number)
      if (!list) continue
      const at = list.indexOf(op[3] as number)
      if (at === -1) list.push(op[2] as number)
      else list.splice(at, 0, op[2] as number)
    } else if (op[0] === "removeChild") {
      const list = children.get(op[1] as number)
      if (list) {
        const at = list.indexOf(op[2] as number)
        if (at !== -1) list.splice(at, 1)
      }
    } else if (op[0] === "destroyElement" && typeof op[1] === "number") {
      types.delete(op[1])
      children.delete(op[1])
      for (const list of children.values()) {
        const at = list.indexOf(op[1])
        if (at !== -1) list.splice(at, 1)
      }
    }
  }
  return { types, children }
}

function idForLabel(label: string): number | undefined {
  for (const [id, value] of liveProp("aria-label")) if (value === label) return id
  return undefined
}
const hasLabel = (label: string) => idForLabel(label) !== undefined
const hasText = (value: string) => [...liveText().values()].includes(value)

const e = React.createElement as (
  type: unknown,
  props?: Record<string, unknown> | null,
  ...children: React.ReactNode[]
) => React.ReactElement

/** Dispatch a real primary click at the element carrying `label`. */
async function click(label: string): Promise<boolean> {
  const elementId = idForLabel(label)
  if (elementId === undefined) return false
  handleGpuixEvent({ elementId, eventType: "click", button: 0 } as never, renderer as never)
  await drain()
  return true
}

function idForLabelContaining(text: string): number | undefined {
  for (const [id, value] of liveProp("aria-label")) if (value.includes(text)) return id
  return undefined
}

/**
 * Dispatch a real primary press and report whether MYrss grew a splash.
 *
 * The app draws its own top bar, feed rows and article rows; the library only
 * ripples its own components, so this is what proves the app-local ones are
 * wired too.
 */
async function press(label: string): Promise<boolean> {
  const elementId = idForLabelContaining(label)
  if (elementId === undefined) return false
  const before = ops().length
  handleGpuixEvent({ elementId, eventType: "mouseDown", x: 0, y: 0, button: 0 } as never, renderer as never)
  await drain()
  return ops().slice(before).some(op => op[0] === "setCustomProp" && op[2] === "motion"
    && (op[3] as Record<string, unknown>)?.animate !== undefined
    && (op[3] as Record<string, any>).animate.opacity === 0.12
    && (op[3] as Record<string, any>).animate.width > 1)
}

function exitTweenIn(list: Op[]): boolean {
  return list.some(op => {
    if (op[0] !== "setCustomProp" || op[2] !== "motion") return false
    const motion = op[3]
    return typeof motion === "object" && motion !== null && (motion as Record<string, unknown>).isExit === true
  })
}

const { App } = await import("../src/app.js")
let root = createRoot(renderer as never)

const failures: string[] = []
const checks: string[] = []
function check(name: string, ok: boolean) {
  checks.push(`${ok ? "PASS" : "FAIL"}  ${name}`)
  if (!ok) failures.push(name)
}

// ── Material 3 tokens ───────────────────────────────────────────────────────
const dark = createMaterialTheme("dark")
const light = createMaterialTheme("light")
check("the M3 scrim overlay is black at 32%, not opaque", dark.scrimOverlay === "#00000052" && dark.scrim === "#000000")
check("dark surface is neutral tone 6 and distinct from surfaceContainerLow", dark.surface !== dark.surfaceContainerLow)
check("light surface is distinct from surfaceContainerLow", light.surface !== light.surfaceContainerLow)
check("the whole dark surface ramp is distinct", new Set([
  dark.surface, dark.surfaceContainerLowest, dark.surfaceContainerLow,
  dark.surfaceContainer, dark.surfaceContainerHigh, dark.surfaceContainerHighest,
]).size === 6)

// ── Mount ───────────────────────────────────────────────────────────────────
root.render(e(App, {}))
await drain()

check("MYrss mounts through the GPUIX 0.10.0 reconciler", ops().length > 0 && all().includes('"setRoot"'))
check("the seeded article is listed", hasLabel(`${ARTICLE}, unread`))
check("list rows carry aria-selected", ops().some(op => op[0] === "setCustomProp" && op[2] === "aria-selected"))
check("icon-only buttons get accessible names", hasLabel("刷新全部") && hasLabel("设置"))

// ── Ink ripple reaches the app's own controls ───────────────────────────────
// The library ripples its components; MYrss draws its app bar, quick rows, feed
// rows and article rows itself, so each of those has to be wired too.
check("the app bar's own button ripples", await press("添加订阅"))
check("a quick row ripples", await press("全部文章"))
check("a feed row ripples", await press("Example Feed"))
check("an article row ripples", await press(ARTICLE))

// ── Startup auto-refresh ────────────────────────────────────────────────────
check("startup refreshes subscriptions when the setting is on", fetched.includes(FEED_URL))
check("a failed refresh is kept on the feed row, not just toasted",
  [...liveProp("aria-label").values()].some(label => label.includes("Example Feed") && label.includes("更新失败")))
check("a failed response cannot rename a cached feed",
  (await import("../src/feeds.js")).mergeFeed(
    { url: FEED_URL, title: "Example Feed", fetchedAt: 1, items: [] },
    { url: FEED_URL, title: FEED_URL, fetchedAt: 2, error: "offline", items: [] },
  ).title === "Example Feed")

// ── Reading an article ──────────────────────────────────────────────────────
check("clicking an article opens the reader", await click(`${ARTICLE}, unread`))
check("opening marks it read, so 'mark unread' becomes reachable", hasLabel("标为未读"))
// The star lives in the reader, so it only exists once an article is open.
check("the star control ripples", await press("Star this article"))
check("the reader offers an accessible name for the browser link", hasLabel("在浏览器中打开"))

// Inline placement. The old code converted the whole body (dropping every
// <img>) and appended the cached pictures after the text, so the reader's
// children were markdown, img, img. The fix interleaves them.
const { types, children } = liveTree()
const subtreeHas = (id: number, type: string): boolean =>
  types.get(id) === type || (children.get(id) ?? []).some(child => subtreeHas(child, type))
// The reader's scroll container is the element holding the article's text
// blocks; document order is what the reader actually sees.
const containers = [...children.entries()]
  .filter(([, kids]) => kids.some(id => types.get(id) === "markdown"))
  .sort((a, b) => b[1].length - a[1].length)
const articleOrder = (containers[0]?.[1] ?? []).map(id =>
  types.get(id) === "markdown" ? "markdown" : subtreeHas(id, "img") ? "img" : types.get(id) ?? "?")
check("the reader places each picture where the author put it",
  articleOrder.join(",") === "markdown,img,markdown,img,markdown")

// ── Star toggle ─────────────────────────────────────────────────────────────
check("the star control starts unstarred", await click("Star this article"))
check("a second click un-stars it (no stale-closure duplicate)", await click("Remove star") && hasLabel("Star this article"))

// ── Unread-only filter ──────────────────────────────────────────────────────
check("the unread filter empties the list", await click("只看未读") && hasText("0 篇"))
check("the empty state explains the filter instead of looking broken", hasText("没有未读文章"))
check("turning the filter off brings the article back", await click("只看未读") && hasText("1 篇"))

// ── Dialog: scrim, role, Escape, exit tween ─────────────────────────────────
check("the add-feed dialog opens", await click("添加订阅"))
const dialogHostId = [...liveProp("role").entries()].find(([, role]) => role === "dialog")?.[0]
check("the dialog exposes role=dialog labelled by its title",
  dialogHostId !== undefined && liveProp("aria-label").get(dialogHostId) === "添加订阅")
check("the dialog scrim is the M3 32% wash, never opaque black",
  ops().some(op => op[0] === "setStyle" && typeof op[2] === "object" && op[2] !== null
    && (op[2] as Record<string, unknown>).backgroundColor === "#00000052")
  && !all().includes('"backgroundColor":"#000000"'))

const beforeEscape = batches.length
const escapeConsumed = dispatchWindowKey({ key: "escape", eventType: "keyDown", elementId: 0 } as never)
await drain()
check("Escape is consumed by the dialog shortcut", escapeConsumed)
check("Escape closes the dialog", exitTweenIn(batches.slice(beforeEscape).flat()))
check("Escape is not consumed once no dialog is open",
  !dispatchWindowKey({ key: "escape", eventType: "keyDown", elementId: 0 } as never))

check("the dialog re-opens", await click("添加订阅"))
const beforeCancel = batches.length
check("the cancel button closes it", await click("取消"))
check("closing plays an exit tween instead of vanishing", exitTweenIn(batches.slice(beforeCancel).flat()))
check("the leaving dialog stays mounted for the tween",
  batches.slice(beforeCancel).flat().every(op => op[0] !== "destroyElement"))

// ── Settings persistence and migration ──────────────────────────────────────
const { loadState, emptyState } = await import("../src/storage.js")
check("defaults turn startup refresh on", emptyState().settings.refreshOnStart === true)
check("a legacy state file still gets the refresh defaults", (() => {
  const legacyPath = path.join(sandbox, "legacy.json")
  writeFileSync(legacyPath, JSON.stringify({
    version: 1, settings: { mode: "light" }, subscriptions: [], feeds: {}, read: [], starred: [],
  }))
  const previous = process.env.MYRSS_STATE
  process.env.MYRSS_STATE = legacyPath
  const loaded = loadState()
  process.env.MYRSS_STATE = previous
  return loaded.settings.refreshOnStart === true && loaded.settings.autoRefreshMinutes === 30
})())

// ── The setting is honoured on the next launch ──────────────────────────────
// A GPUIX root cannot re-render after unmount and a renderer takes one mounted
// root at a time, so the second scenario gets a fresh root.
root.unmount()
fetched.length = 0
seed(false)
root = createRoot(renderer as never)
root.render(e(App, {}))
await drain()
check("refreshOnStart=false skips the refresh for a feed that already has data", !fetched.includes(FEED_URL))

root.unmount()

for (const line of checks) console.log(line)
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed`)
if (failures.length > 0) {
  console.log("\nFailures:\n" + failures.map(f => `  - ${f}`).join("\n"))
  process.exit(1)
}
