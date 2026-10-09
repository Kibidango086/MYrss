import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  MaterialProvider, useMaterialTheme, TopAppBar, Button, FilledTextField, FilterChip,
  IconButton, NavigationDrawer, Divider, LayoutShell, SegmentedButton, Snackbar, Switch,
  useRipple,
} from "./material.js"
import { AnimatePresence, PresenceMotion, useResponsiveWindowSize } from "./motion.js"
import { a11y } from "./jsx/intrinsics.js"
import { stateLayer } from "./theme.js"
import { RichMarkdown, splitHtmlImages } from "./rich-text.js"
import { GlyphIcon, type MyIcon } from "./glyph-icons.js"
import { MaterialIcon, type MaterialSymbol } from "./icons.js"
import { fetchFeed, mergeFeed, hostLabel, type FeedData, type FeedItem } from "./feeds.js"
import { AUTO_REFRESH_CHOICES, DEFAULT_SETTINGS, loadState, saveState, type StoredState } from "./storage.js"
import { onWindowKey } from "./shortcuts.js"
import { formatFullDate, formatRelative } from "./format.js"
import { openInBrowser } from "./browser.js"
import { cacheRemoteImages } from "./media.js"

type SelectionKey = string
const ALL: SelectionKey = "__all__"
const STARRED: SelectionKey = "__starred__"

// A bottom-left scrim for a feed being refreshed, and toast state
interface UiState {
  selection: SelectionKey
  openKey: string | null
  dialog: null | "add" | "settings" | "remove"
  pendingRemove: string | null
  snackbar: string | null
  refreshing: Record<string, boolean>
  search: string
  /** Show only unread articles in the list. */
  unreadOnly: boolean
}

const DEFAULT_UI: UiState = {
  selection: ALL,
  openKey: null,
  dialog: null,
  pendingRemove: null,
  snackbar: null,
  refreshing: {},
  search: "",
  unreadOnly: false,
}

function fontOf(scale: { size: number; weight: number; lineHeight: number }) {
  return { fontSize: scale.size, fontWeight: scale.weight, lineHeight: scale.lineHeight }
}

/**
 * Compose an MD3 state layer over a colour as `#rrggbbaa`.
 *
 * GPUIX parses 8-digit hex (csscolorparser 0.8.3), so the alpha stays a named
 * token instead of being sprinkled through the file as ad-hoc byte suffixes.
 */
function overlay(color: string, alpha: number) {
  return `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`
}

export function App() {
  const [state, setState] = useState<StoredState>(() => loadState())
  const [ui, setUi] = useState<UiState>(DEFAULT_UI)

  const showToast = useCallback((message: string) => {
    setUi((prev) => ({ ...prev, snackbar: message }))
    setTimeout(() => setUi((prev) => (prev.snackbar === message ? { ...prev, snackbar: null } : prev)), 2600)
  }, [])

  // Debounced persistence
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void saveState(state)
    }, 350)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state])

  const readSet = useMemo(() => new Set(state.read), [state.read])
  const starSet = useMemo(() => new Set(state.starred), [state.starred])

  const feedEntries = useMemo(() => {
    const entries: Array<{ key: string; item: FeedItem; feedUrl: string; feedTitle: string }> = []
    for (const url of state.subscriptions) {
      const feed = state.feeds[url]
      if (!feed) continue
      for (const item of feed.items) {
        entries.push({ key: `${url}\u0000${item.id}`, item, feedUrl: url, feedTitle: feed.title ?? hostLabel(url) })
      }
    }
    entries.sort((a, b) => (b.item.published ?? 0) - (a.item.published ?? 0))
    return entries
  }, [state.feeds, state.subscriptions])

  const unreadEntries = useMemo(() => feedEntries.filter((e) => !readSet.has(e.key)), [feedEntries, readSet])
  const starredEntries = useMemo(() => feedEntries.filter((e) => starSet.has(e.key)), [feedEntries, starSet])

  const totalUnread = unreadEntries.length

  const unreadByFeed = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of unreadEntries) counts[e.feedUrl] = (counts[e.feedUrl] ?? 0) + 1
    return counts
  }, [unreadEntries])

  const entriesForSelection = useMemo(() => {
    if (ui.selection === ALL) return feedEntries
    if (ui.selection === STARRED) return starredEntries
    return feedEntries.filter((e) => e.feedUrl === ui.selection)
  }, [feedEntries, starredEntries, ui.selection])

  const shownEntries = useMemo(() => {
    const q = ui.search.trim().toLowerCase()
    const base = ui.unreadOnly
      ? entriesForSelection.filter((entry) => !readSet.has(entry.key))
      : entriesForSelection
    if (!q) return base
    return base.filter((entry) =>
      (entry.item.title ?? "").toLowerCase().includes(q) || (entry.item.summary ?? "").toLowerCase().includes(q),
    )
  }, [entriesForSelection, ui.search, ui.unreadOnly, readSet])

  // Selected feed metadata (for headers / empty states)
  const selectedFeedInfo = useMemo(() => {
    if (ui.selection === ALL) return { title: "全部", subtitle: `${feedEntries.length} 篇文章` }
    if (ui.selection === STARRED) return { title: "星标", subtitle: `${starredEntries.length} 篇文章` }
    const feed = state.feeds[ui.selection]
    if (!feed) return { title: hostLabel(ui.selection), subtitle: "" }
    return { title: feed.title ?? hostLabel(feed.url), subtitle: (feed.description ?? "").slice(0, 160) }
  }, [ui.selection, state.feeds, feedEntries.length, starredEntries.length])

  const openEntry = useMemo(() => {
    if (!ui.openKey) return undefined
    return feedEntries.find((e) => e.key === ui.openKey)
  }, [ui.openKey, feedEntries])

  // ---- mutations -------------------------------------------------------------

  const markRead = useCallback((key: string) => {
    setState((prev) => (prev.read.includes(key) ? prev : { ...prev, read: [...prev.read, key] }))
  }, [])

  const markUnread = useCallback((key: string) => {
    setState((prev) => ({ ...prev, read: prev.read.filter((id) => id !== key) }))
  }, [])

  // Reads `prev`, never the render-scoped `starSet`: with a stale set a second
  // click appended a duplicate instead of removing the star, so a newly
  // starred article could never be un-starred.
  const toggleStar = useCallback((key: string) => {
    setState((prev) => ({
      ...prev,
      starred: prev.starred.includes(key)
        ? prev.starred.filter((id) => id !== key)
        : [...prev.starred, key],
    }))
  }, [])

  const openArticle = useCallback((key: string) => {
    setUi((prev) => ({ ...prev, openKey: key }))
    markRead(key)
  }, [markRead])

  /**
   * `silent` suppresses the failure toast. Background work (startup, the
   * 30-minute timer) stays quiet so it never interrupts; anything the user
   * pressed reports back. Resolves to whether the feed now has fresh data.
   */
  const refreshFeed = useCallback(
    async (url: string, silent = false): Promise<boolean> => {
      setUi((prev) => ({ ...prev, refreshing: { ...prev.refreshing, [url]: true } }))
      try {
        const incoming = await fetchFeed(url)
        setState((prev) => {
          const merged = mergeFeed(prev.feeds[url], incoming)
          return { ...prev, feeds: { ...prev.feeds, [url]: merged } }
        })
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        // Keep the failure on the feed so the drawer can show it, instead of
        // only flashing a toast that is gone three seconds later.
        setState((prev) => {
          const existing = prev.feeds[url]
          const failed: FeedData = existing
            ? { ...existing, error: message }
            : { url, title: hostLabel(url), fetchedAt: Date.now(), error: message, items: [] }
          return { ...prev, feeds: { ...prev.feeds, [url]: failed } }
        })
        if (!silent) showToast(`更新失败：${hostLabel(url)}（${message}）`)
        return false
      } finally {
        setUi((prev) => {
          const refreshing = { ...prev.refreshing }
          delete refreshing[url]
          return { ...prev, refreshing }
        })
      }
    },
    [showToast],
  )

  const refreshAll = useCallback(async () => {
    const urls = state.subscriptions
    if (urls.length === 0) return
    const results = await Promise.all(urls.map((url) => refreshFeed(url)))
    const failed = results.filter((ok) => !ok).length
    if (failed === 0) showToast(`刷新完成（${urls.length} 个来源）`)
    else if (failed < urls.length) showToast(`${urls.length - failed} 个来源已更新，${failed} 个失败`)
    // Everything failed: refreshFeed already surfaced each error.
  }, [state.subscriptions, refreshFeed, showToast])

  const addFeed = useCallback(
    async (rawUrl: string) => {
      const trimmed = rawUrl.trim()
      if (!trimmed) return
      let url = trimmed
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`
      setUi((prev) => ({ ...prev, dialog: null, selection: url, openKey: null }))
      setState((prev) => (
        prev.subscriptions.includes(url)
          ? prev
          : { ...prev, subscriptions: [...prev.subscriptions, url] }
      ))
      const ok = await refreshFeed(url, true)
      // Report the real outcome: the old code always claimed success, even when
      // the feed could not be parsed. A failed add stays subscribed so the
      // user can retry with the refresh button.
      showToast(ok ? `已添加：${hostLabel(url)}` : `已添加，但暂时读不到内容：${hostLabel(url)}`)
    },
    [refreshFeed, showToast],
  )

  const removeFeed = useCallback(
    (url: string) => {
      const prefix = `${url}\u0000`
      setState((prev) => {
        const feeds = { ...prev.feeds }
        delete feeds[url]
        // The confirmation dialog promises the read and starred records go too,
        // and leaving them behind grows the state file forever.
        return {
          ...prev,
          subscriptions: prev.subscriptions.filter((u) => u !== url),
          feeds,
          read: prev.read.filter((key) => !key.startsWith(prefix)),
          starred: prev.starred.filter((key) => !key.startsWith(prefix)),
        }
      })
      setUi((prev) => ({
        ...prev,
        dialog: null,
        pendingRemove: null,
        selection: prev.selection === url ? ALL : prev.selection,
        openKey: prev.openKey && prev.openKey.startsWith(`${url}\u0000`) ? null : prev.openKey,
      }))
      showToast("已删除订阅")
    },
    [showToast],
  )

  const markAllReadVisible = useCallback(() => {
    setState((prev) => {
      const keys = shownEntries.map((e) => e.key)
      const read = [...prev.read]
      let changed = false
      for (const key of keys) {
        if (!read.includes(key)) {
          read.push(key)
          changed = true
        }
      }
      return changed ? { ...prev, read } : prev
    })
    showToast("已全部标为已读")
  }, [shownEntries, showToast])

  // Startup: refresh everything when the user asked for it, and otherwise just
  // fill in feeds that have never been fetched. Reads the initial state, which
  // is already the persisted one.
  useEffect(() => {
    for (const url of state.subscriptions) {
      if (state.settings.refreshOnStart || !state.feeds[url]) void refreshFeed(url, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Background refresh on the configured period; 0 turns it off.
  useEffect(() => {
    const minutes = state.settings.autoRefreshMinutes
    if (!minutes || minutes <= 0) return
    const timer = setInterval(() => {
      for (const url of state.subscriptions) void refreshFeed(url, true)
    }, minutes * 60 * 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.subscriptions, state.settings.autoRefreshMinutes])

  // Escape closes whichever dialog is open. GPUIX key events do not bubble, so
  // this is a window-level shortcut rather than a handler on the dialog.
  const openDialog = ui.dialog
  const dialogRef = useRef(openDialog)
  dialogRef.current = openDialog
  useEffect(() => onWindowKey((event) => {
    if ((event.key ?? "").toLowerCase() !== "escape") return false
    if (dialogRef.current === null) return false
    setUi((prev) => ({ ...prev, dialog: null, pendingRemove: null }))
    return true
  }), [])

  const isSaving = Object.values(ui.refreshing).some(Boolean)

  return (
    <MaterialProvider mode={state.settings.mode} accentColor={state.settings.accentColor}>
      <Shell
        state={state}
        setState={setState}
        ui={ui}
        setUi={setUi}
        readSet={readSet}
        starSet={starSet}
        totalUnread={totalUnread}
        unreadByFeed={unreadByFeed}
        shownEntries={shownEntries}
        openEntry={openEntry}
        selectedFeedInfo={selectedFeedInfo}
        isSaving={isSaving}
        actions={{
          refreshFeed,
          refreshAll,
          markAllReadVisible,
          openArticle,
          toggleStar,
          markRead,
          markUnread,
          addFeed,
          removeFeed,
        }}
      />
    </MaterialProvider>
  )
}

// ─── Shell ─────────────────────────────────────────────────────────────────────

interface ShellProps {
  state: StoredState
  setState: React.Dispatch<React.SetStateAction<StoredState>>
  ui: UiState
  setUi: React.Dispatch<React.SetStateAction<UiState>>
  readSet: Set<string>
  starSet: Set<string>
  totalUnread: number
  unreadByFeed: Record<string, number>
  shownEntries: Array<{ key: string; item: FeedItem; feedUrl: string; feedTitle: string }>
  openEntry?: { key: string; item: FeedItem; feedUrl: string; feedTitle: string }
  selectedFeedInfo: { title: string; subtitle: string }
  isSaving: boolean
  actions: {
    refreshFeed: (url: string, silent?: boolean) => Promise<boolean>
    refreshAll: () => Promise<void>
    markAllReadVisible: () => void
    openArticle: (key: string) => void
    toggleStar: (key: string) => void
    markRead: (key: string) => void
    markUnread: (key: string) => void
    addFeed: (url: string) => Promise<void>
    removeFeed: (url: string) => void
  }
}

function EmptyState({ icon, title, hint }: {
  icon: { glyph: MyIcon } | { symbol: MaterialSymbol }
  title: string
  hint?: string
}) {
  const theme = useMaterialTheme()
  const color = theme.onSurfaceVariant
  return (
    <div style={{ width: "100%", flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 24 }}>
      {"glyph" in icon
        ? <GlyphIcon name={icon.glyph} color={color} size={40} />
        : <MaterialIcon name={icon.symbol} color={color} size={40} />}
      <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.titleMedium), textAlign: "center" }}>{title}</text>
      {hint ? <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodyMedium), textAlign: "center", lineClamp: 3 }}>{hint}</text> : null}
    </div>
  )
}

function Shell(props: ShellProps) {
  const theme = useMaterialTheme()
  const { state, ui, setUi, actions, readSet, starSet, openEntry, shownEntries } = props

  const select = (key: SelectionKey) => setUi((prev) => ({ ...prev, selection: key, openKey: null }))

  // A fixed 360px list column squeezed the reader to roughly 250px at the
  // 900px minimum window, so the split follows the window instead.
  const windowSize = useResponsiveWindowSize()
  const listWidth = Math.max(260, Math.min(360, Math.round(windowSize.width * 0.3)))

  const feedRows = state.subscriptions.map((url) => {
    const feed = state.feeds[url]
    const title = feed?.title ?? hostLabel(url)
    const unread = props.unreadByFeed[url] ?? 0
    return (
      <div key={url} style={{ width: "100%" }}>
        <FeedRow title={title} active={ui.selection === url} unread={unread} error={feed?.error} onClick={() => select(url)} />
      </div>
    )
  })

  return (
    <LayoutShell
      appBar={
        <TopAppBar
          title="MYrss"
          actions={
            <>
              <TopGlyphButton icon="add" label="添加订阅" onClick={() => setUi((prev) => ({ ...prev, dialog: "add" }))} />
              <IconButton icon="refresh" label="刷新全部" onClick={() => void actions.refreshAll()} disabled={props.isSaving} />
              <TopGlyphButton icon="settings" label="设置" onClick={() => setUi((prev) => ({ ...prev, dialog: "settings" }))} />
            </>
          }
        />
      }
      overlays={
        <>
          <AddFeedDialog open={ui.dialog === "add"} onClose={() => setUi((prev) => ({ ...prev, dialog: null }))} onSubmit={(u) => void actions.addFeed(u)} />
          <SettingsDialog
            open={ui.dialog === "settings"}
            onClose={() => setUi((prev) => ({ ...prev, dialog: null }))}
            state={state}
            setState={props.setState}
            onRemoveFeed={(url) => setUi((prev) => ({ ...prev, dialog: "remove", pendingRemove: url }))}
          />
          <RemoveFeedDialog
            open={ui.dialog === "remove"}
            feedUrl={ui.pendingRemove}
            onClose={() => setUi((prev) => ({ ...prev, dialog: null, pendingRemove: null }))}
            onConfirm={() => ui.pendingRemove && actions.removeFeed(ui.pendingRemove)}
          />
          <Snackbar open={Boolean(ui.snackbar)} message={ui.snackbar ?? ""} />
        </>
      }
    >
      <NavigationDrawer
        header={
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
            <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.titleSmall) }}>订阅</text>
            <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>{`${state.subscriptions.length} 个来源 · ${props.totalUnread} 篇未读`}</text>
          </div>
        }
        footer={
          <Button variant="tonal"  onClick={() => setUi((prev) => ({ ...prev, dialog: "add" }))}>
            添加订阅
          </Button>
        }
      >
        <QuickRow label="全部文章" count={props.totalUnread} active={ui.selection === ALL} onClick={() => select(ALL)} icon={(c) => <GlyphIcon name="inbox" color={c} size={20} />} />
        <QuickRow label="星标" count={props.starSet.size} active={ui.selection === STARRED} onClick={() => select(STARRED)} icon={(c) => <MaterialIcon name="favorite" color={c} size={20} />} />
        <Divider />
        <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.labelMedium), marginTop: 4 }}>来源</text>
        <div style={{ width: "100%", flexGrow: 1, minHeight: 0, overflowY: "scroll", overflowX: "hidden" }}>
          {feedRows.length === 0 ? (
            <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall), paddingTop: 8 }}>还没有订阅，点击上方按钮添加</text>
          ) : (
            feedRows
          )}
        </div>
      </NavigationDrawer>

      {/* Right column: article list + reader */}
      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "row" }}>
        <div style={{ width: listWidth, flexShrink: 0, display: "flex", flexDirection: "column", backgroundColor: theme.surfaceContainerLow }}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <text style={{ flexGrow: 1, minWidth: 0, color: theme.onSurface, overflow: "hidden", lineClamp: 1, ...fontOf(theme.typescale.titleMedium) }}>{props.selectedFeedInfo.title}</text>
              {props.shownEntries.length > 0 ? (
                <Button variant="text" icon="check" onClick={actions.markAllReadVisible}>全部已读</Button>
              ) : null}
            </div>
            <FilledTextField label="搜索" value={ui.search} onChange={(v) => setUi((prev) => ({ ...prev, search: v }))} placeholder="按标题或摘要筛选" />
            <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <FilterChip
                label="只看未读"
                selected={ui.unreadOnly}
                onClick={() => setUi((prev) => ({ ...prev, unreadOnly: !prev.unreadOnly }))}
              />
              <text style={{ flexGrow: 1, textAlign: "right", color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>{`${props.shownEntries.length} 篇`}</text>
            </div>
          </div>
          <div style={{ width: "100%", flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {props.shownEntries.length === 0 ? (
              ui.search.trim() ? (
                <EmptyState
                  icon={{ symbol: "search" }}
                  title="没有匹配的文章"
                  hint={`“${ui.search.trim()}”在「${props.selectedFeedInfo.title}」里没有结果`}
                />
              ) : ui.unreadOnly ? (
                <EmptyState
                  icon={{ glyph: "done_all" }}
                  title="没有未读文章"
                  hint={`「${props.selectedFeedInfo.title}」已经全部读完，关掉「只看未读」可以回看历史`}
                />
              ) : state.subscriptions.length === 0 ? (
                <EmptyState icon={{ glyph: "rss" }} title="还没有订阅" hint="点右上角「添加订阅」，粘贴 RSS、Atom 或 JSON Feed 地址" />
              ) : (
                <EmptyState icon={{ glyph: "rss" }} title="这里还没有文章" hint="点右上角的刷新按钮拉取最新内容" />
              )
            ) : (
              <virtual-list alignment="top" estimatedItemHeight={84} overdraw={480} style={{ width: "100%", flexGrow: 1, minHeight: 0 }}>
                {props.shownEntries.map((entry) => (
                  <div key={entry.key} style={{ width: "100%" }}>
                  <ArticleRow
                    title={entry.item.title || "(无标题)"}
                    summary={entry.item.summary}
                    feedTitle={entry.feedTitle}
                    time={entry.item.published}
                    unread={!readSet.has(entry.key)}
                    starred={starSet.has(entry.key)}
                    active={openEntry?.key === entry.key}
                    onClick={() => props.actions.openArticle(entry.key)}
                  />
                  </div>
                ))}
              </virtual-list>
            )}
          </div>
        </div>

        <ReaderPane
          entry={openEntry}
          readSet={readSet}
          starSet={starSet}
          onStar={() => openEntry && props.actions.toggleStar(openEntry.key)}
          onMarkUnread={() => openEntry && props.actions.markUnread(openEntry.key)}
        />
      </div>
    </LayoutShell>
  )
}

// ─── Small building blocks ────────────────────────────────────────────────────

function Pill({ text, color, bg }: { text: string; color: string; bg: string }) {
  const theme = useMaterialTheme()
  return (
    <div style={{ minWidth: 22, height: 20, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 7, paddingRight: 7, borderRadius: theme.shape.full, backgroundColor: bg }}>
      <text style={{ color, ...fontOf(theme.typescale.labelSmall) }}>{text}</text>
    </div>
  )
}

function QuickRow({ label, count, active, onClick, icon }: {
  label: string
  count: number
  active?: boolean
  onClick?: () => void
  icon: (color: string) => React.ReactNode
}) {
  const theme = useMaterialTheme()
  const fg = active ? theme.onSecondaryContainer : theme.onSurfaceVariant
  const ripple = useRipple({ color: fg, radius: theme.shape.full })
  return (
    <div
      ref={ripple.ref}
      onClick={onClick}
      onMouseDown={ripple.onMouseDown}
      role="button"
      aria-label={`${label}, ${count} unread`}
      aria-selected={active === true}
      style={{
        width: "100%", minHeight: 46, display: "flex", flexDirection: "row", alignItems: "center",
        gap: 12, paddingLeft: 12, paddingRight: 12, borderRadius: theme.shape.full,
        backgroundColor: active ? theme.secondaryContainer : "transparent",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        hover: { backgroundColor: active ? theme.secondaryContainer : overlay(fg, stateLayer.hover) },
      }}
    >
      {ripple.layer}
      {icon(fg)}
      <text style={{ flexGrow: 1, minWidth: 0, color: fg, ...fontOf(theme.typescale.labelLarge), lineClamp: 1, overflow: "hidden" }}>{label}</text>
      {count > 0 ? <Pill text={String(count)} color={fg} bg={active ? overlay(theme.onSecondaryContainer, stateLayer.press) : overlay(fg, stateLayer.press)} /> : null}
    </div>
  )
}

function TopGlyphButton({ icon, label, onClick }: { icon: MyIcon; label?: string; onClick?: () => void }) {
  const theme = useMaterialTheme()
  const ripple = useRipple({ color: theme.onSurfaceVariant, radius: theme.shape.full })
  return (
    <div
      ref={ripple.ref}
      onClick={onClick}
      onMouseDown={ripple.onMouseDown}
      role="button"
      aria-label={label ?? icon}
      style={{
        height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: theme.shape.full,
        cursor: "pointer", paddingLeft: 8, paddingRight: 8,
        position: "relative", overflow: "hidden",
        hover: { backgroundColor: overlay(theme.onSurface, stateLayer.hover) },
      }}
    >
      {ripple.layer}
      <GlyphIcon name={icon} color={theme.onSurfaceVariant} size={20} />
      {label ? <text style={{ marginLeft: 6, color: theme.onSurfaceVariant, ...fontOf(theme.typescale.labelLarge), lineClamp: 1 }}>{label}</text> : null}
    </div>
  )
}

function FeedRow({ title, active, unread, error, onClick }: {
  title: string
  active?: boolean
  unread: number
  /** Last refresh failure. A feed that cannot be read is shown as broken
   *  rather than as an ordinary empty source. */
  error?: string
  onClick?: () => void
}) {
  const theme = useMaterialTheme()
  const iconColor = active ? theme.onSecondaryContainer : error ? theme.error : theme.onSurfaceVariant
  const ripple = useRipple({ color: iconColor, radius: theme.shape.full })
  return (
    <div
      ref={ripple.ref}
      onClick={onClick}
      onMouseDown={ripple.onMouseDown}
      role="button"
      aria-label={`${title}${unread > 0 ? `, ${unread} 篇未读` : ""}${error ? `, 更新失败：${error}` : ""}`}
      aria-selected={active === true}
      style={{
        width: "100%", minHeight: 44, display: "flex", flexDirection: "row", alignItems: "center", gap: 10,
        paddingLeft: 8, paddingRight: 8, borderRadius: theme.shape.full, cursor: "pointer",
        backgroundColor: active ? theme.secondaryContainer : "transparent",
        position: "relative", overflow: "hidden",
        hover: { backgroundColor: active ? theme.secondaryContainer : overlay(theme.onSurface, stateLayer.hover) },
      }}
    >
      {ripple.layer}
      {/* The row already carries the selection colour, so the leading chip stays
          neutral instead of stacking a second container role inside it. */}
      <div style={{ width: 28, height: 28, borderRadius: theme.shape.full, backgroundColor: active ? "transparent" : error ? overlay(theme.error, stateLayer.press) : theme.surfaceContainerHighest, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <GlyphIcon name="rss" color={iconColor} size={16} />
      </div>
      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <text style={{ color: active ? theme.onSecondaryContainer : theme.onSurface, overflow: "hidden", lineClamp: 1, ...fontOf(theme.typescale.bodyMedium) }}>{title}</text>
        {error ? <text style={{ color: theme.error, overflow: "hidden", lineClamp: 1, ...fontOf(theme.typescale.labelSmall) }}>{error}</text> : null}
      </div>
      {unread > 0 ? <Pill text={unread > 99 ? "99+" : String(unread)} color={active ? theme.onSecondaryContainer : theme.onSurfaceVariant} bg={active ? overlay(theme.onSecondaryContainer, stateLayer.press) : overlay(theme.onSurface, stateLayer.press)} /> : null}
    </div>
  )
}

function ArticleRow({ title, summary, feedTitle, time, unread, starred, active, onClick }: {
  title: string
  summary?: string
  feedTitle: string
  time?: number
  unread: boolean
  starred: boolean
  active?: boolean
  onClick?: () => void
}) {
  const theme = useMaterialTheme()
  const ripple = useRipple({ color: active ? theme.onSecondaryContainer : theme.onSurface, radius: theme.shape.medium })
  return (
    <div
      ref={ripple.ref}
      onClick={onClick}
      onMouseDown={ripple.onMouseDown}
      role="button"
      aria-label={unread ? `${title}, unread` : title}
      aria-selected={active === true}
      style={{
        width: "100%", display: "flex", flexDirection: "row", gap: 10, padding: 12, paddingLeft: 16,
        borderRadius: theme.shape.medium, cursor: "pointer",
        backgroundColor: active ? theme.secondaryContainer : "transparent",
        position: "relative", overflow: "hidden",
        hover: { backgroundColor: active ? theme.secondaryContainer : overlay(theme.onSurface, stateLayer.hover) },
      }}
    >
      {ripple.layer}
      <div style={{ width: 3, borderRadius: theme.shape.full, backgroundColor: unread ? theme.primary : "transparent", flexShrink: 0 }} />
      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
          <text style={{ flexGrow: 1, minWidth: 0, color: active ? theme.onSecondaryContainer : unread ? theme.onSurface : theme.onSurfaceVariant, overflow: "hidden", lineClamp: 1, ...fontOf(theme.typescale.titleSmall), fontWeight: unread ? 500 : 400 }}>{title}</text>
          {starred ? <MaterialIcon name="favorite" color={active ? theme.onSecondaryContainer : theme.primary} size={16} /> : null}
        </div>
        {summary ? (
          <text style={{ color: active ? theme.onSecondaryContainer : theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall), lineClamp: 2, overflow: "hidden" }}>{summary}</text>
        ) : null}
        <text style={{ color: active ? theme.onSecondaryContainer : theme.onSurfaceVariant, ...fontOf(theme.typescale.labelSmall), lineClamp: 1, overflow: "hidden" }}>{`${feedTitle} · ${formatRelative(time)}`}</text>
      </div>
    </div>
  )
}

// ─── Reader ───────────────────────────────────────────────────────────────────

function ReaderPane({ entry, readSet, starSet, onStar, onMarkUnread }: {
  entry?: { key: string; item: FeedItem; feedUrl: string; feedTitle: string }
  readSet: Set<string>
  starSet: Set<string>
  onStar: () => void
  onMarkUnread: () => void
}) {
  const theme = useMaterialTheme()
  const [imageMap, setImageMap] = useState<Record<string, string>>({})
  const [imagesReady, setImagesReady] = useState(false)

  const source = entry ? entry.item.content || entry.item.summary || "" : ""
  // Pictures are split out in document order so each one stays where the author
  // put it instead of being dumped after the text.
  const blocks = useMemo(() => splitHtmlImages(source, 12), [source])
  const lead = entry?.item.image && /^https?:\/\//i.test(entry.item.image) ? entry.item.image : undefined

  useEffect(() => {
    setImageMap({})
    setImagesReady(false)
    const inline = blocks.filter((block) => block.kind === "image").map((block) => block.url)
    const urls = lead && !inline.includes(lead) ? [lead, ...inline] : inline
    if (!entry || urls.length === 0) {
      setImagesReady(true)
      return
    }
    let cancelled = false
    void cacheRemoteImages(urls.slice(0, 12)).then((map) => {
      if (cancelled) return
      setImageMap(map)
      setImagesReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [entry?.key, blocks, lead])

  if (!entry) {
    return (
      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: theme.surface }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <GlyphIcon name="rss" color={theme.onSurfaceVariant} size={44} />
          <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodyLarge) }}>选择一篇文章开始阅读</text>
        </div>
      </div>
    )
  }

  const { item } = entry
  const starred = starSet.has(entry.key)
  const leadSrc = lead ? imageMap[lead] : undefined
  const hasBody = blocks.some((block) => block.kind === "text") || blocks.some((block) => block.kind === "image")

  return (
    <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", backgroundColor: theme.surface }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 20, paddingBottom: 0 }}>
        <text style={{ flexGrow: 1, minWidth: 0, color: theme.onSurface, overflow: "hidden", lineClamp: 3, ...fontOf(theme.typescale.headlineSmall) }}>{item.title}</text>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
          <StarButton starred={starred} onClick={onStar} />
          {item.link ? <IconButton icon="open_in_new" label="在浏览器中打开" onClick={() => openInBrowser(item.link!)} /> : null}
        </div>
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 8, padding: 20, paddingTop: 8, paddingBottom: 8, flexWrap: "wrap" }}>
        <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>{entry.feedTitle}</text>
        {item.author ? <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>· {item.author}</text> : null}
        {item.published ? <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>· {formatFullDate(item.published)}</text> : null}
      </div>

      <div style={{ flexGrow: 1, minHeight: 0, overflowY: "scroll", backgroundColor: theme.surface, padding: 20, paddingTop: 8 }}>
        {leadSrc ? (
          <div style={{ width: "100%", marginBottom: 16 }}>
            {/* The enclosure image is a banner, so it fills its frame rather than
                letterboxing a portrait photo into a fixed box. */}
            <img src={leadSrc} alt="" objectFit="cover" style={{ width: "100%", height: 320, borderRadius: theme.shape.large }} />
          </div>
        ) : null}

        {!hasBody ? (
          <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodyMedium) }}>（该文章没有可显示的正文）</text>
        ) : null}

        {blocks.map((block, index) => block.kind === "text" ? (
          <RichMarkdown key={index} markdown={block.markdown} theme={theme} mode={theme.mode} />
        ) : imageMap[block.url] ? (
          <div key={index} style={{ width: "100%", marginTop: 12, marginBottom: 12 }}>
            {/* Inline figures are never cropped — a cut-off diagram is worse
                than a little letterboxing. */}
            <img src={imageMap[block.url] as string} alt={block.alt} objectFit="contain" style={{ width: "100%", height: 260, borderRadius: theme.shape.large }} />
          </div>
        ) : imagesReady ? null : (
          // Reserve the box while the download is in flight so the article does
          // not jump under the reader when the picture lands.
          <div key={index} style={{ width: "100%", height: 260, marginTop: 12, marginBottom: 12, borderRadius: theme.shape.large, backgroundColor: theme.surfaceContainerHighest }} />
        ))}
      </div>

      {readSet.has(entry.key) ? (
        <div style={{ width: "100%", padding: 8, paddingLeft: 20, paddingRight: 20 }}>
          <Button variant="text" onClick={onMarkUnread}>标为未读</Button>
        </div>
      ) : null}
    </div>
  )
}

function StarButton({ starred, onClick }: { starred: boolean; onClick: () => void }) {
  const theme = useMaterialTheme()
  const color = starred ? theme.primary : theme.onSurfaceVariant
  const ripple = useRipple({ color: theme.primary, radius: theme.shape.full })
  return (
    <div
      ref={ripple.ref}
      onClick={onClick}
      onMouseDown={ripple.onMouseDown}
      role="button"
      aria-label={starred ? "Remove star" : "Star this article"}
      aria-selected={starred}
      style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: theme.shape.full, cursor: "pointer", position: "relative", overflow: "hidden", hover: { backgroundColor: overlay(theme.onSurface, stateLayer.hover) } }}
    >
      {ripple.layer}
      {starred ? (
        <MaterialIcon name="favorite" color={color} size={22} />
      ) : (
        <GlyphIcon name="star_outline" color={color} size={22} />
      )}
    </div>
  )
}

// ─── Modal base + dialogs ─────────────────────────────────────────────────────

function Modal({ open, title, width = 440, onDismiss, children, footer }: {
  open: boolean
  title: string
  width?: number
  /** Called when the user dismisses the dialog by clicking the scrim. */
  onDismiss?: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const theme = useMaterialTheme()
  // `scrimOverlay` is the M3 scrim at 32%; the raw `scrim` role is opaque and
  // blacked the whole window out behind every dialog.
  return (
    <AnimatePresence>
      {open ? (
        <PresenceMotion
          key="modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          enterDuration={.2}
          exitDuration={.16}
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: theme.scrimOverlay, pointerEvents: "auto" }}
        >
          <PresenceMotion
            {...a11y({ role: "dialog" }, title)}
            onMouseDownOutside={onDismiss}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            enterDuration={.2}
            exitDuration={.16}
            style={{ width, maxWidth: "95%", padding: 24, borderRadius: theme.shape.extraLarge, backgroundColor: theme.surfaceContainerHigh, display: "flex", flexDirection: "column" }}
          >
            <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.headlineSmall), lineClamp: 2 }}>{title}</text>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
            {footer ? (
              <div style={{ marginTop: 24, display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>{footer}</div>
            ) : null}
          </PresenceMotion>
        </PresenceMotion>
      ) : null}
    </AnimatePresence>
  )
}

const ACCENT_PRESETS = ["#006a6a", "#6750a4", "#e53935", "#1e88e5", "#43a047", "#fb8c00", "#d81b60", "#000000"]

function ColorSwatch({ color, selected, onSelect }: { color: string; selected: boolean; onSelect: () => void }) {
  const theme = useMaterialTheme()
  const ripple = useRipple({ color: theme.onSurface, radius: theme.shape.full })
  return (
    <div
      ref={ripple.ref}
      onClick={onSelect}
      onMouseDown={ripple.onMouseDown}
      {...a11y({ role: "radio", ariaLabel: color, ariaSelected: selected })}
      style={{ width: 32, height: 32, borderRadius: theme.shape.full, backgroundColor: color, cursor: "pointer", position: "relative", overflow: "hidden", borderWidth: selected ? 3 : 1, borderColor: selected ? theme.onSurface : theme.outlineVariant }}
    >
      {ripple.layer}
    </div>
  )
}

function AddFeedDialog({ open, onClose, onSubmit }: {
  open: boolean
  onClose: () => void
  onSubmit: (url: string) => void
}) {
  const theme = useMaterialTheme()
  const [url, setUrl] = useState("")
  useEffect(() => {
    if (open) setUrl("")
  }, [open])
  const submit = () => {
    if (!url.trim()) return
    onSubmit(url.trim())
  }
  return (
    <Modal
      open={open}
      title="添加订阅"
      width={460}
      onDismiss={onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose}>取消</Button>
          <Button variant="filled" disabled={!url.trim()} onClick={submit}>添加</Button>
        </>
      }
    >
      <FilledTextField label="Feed 地址" value={url} placeholder="https://example.com/feed.xml" autoFocus onChange={setUrl} onSubmit={() => submit()} />
      <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>支持 RSS 2.0、Atom 与 JSON Feed，也可直接粘贴网站首页地址自动探测。</text>
    </Modal>
  )
}

function SettingsDialog({ open, onClose, state, setState, onRemoveFeed }: {
  open: boolean
  onClose: () => void
  state: StoredState
  setState: React.Dispatch<React.SetStateAction<StoredState>>
  onRemoveFeed: (url: string) => void
}) {
  const theme = useMaterialTheme()
  const [accent, setAccent] = useState(state.settings.accentColor ?? "")
  useEffect(() => {
    if (open) setAccent(state.settings.accentColor ?? "")
  }, [open])

  const accentInput = accent.trim()
  const accentInvalid = accentInput.length > 0 && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accentInput)

  const applyAccent = () => {
    if (accentInvalid) return
    setState((prev) => ({ ...prev, settings: { ...prev.settings, accentColor: accentInput || undefined } }))
  }

  return (
    <Modal
      open={open}
      title="设置"
      width={520}
      onDismiss={onClose}
      footer={<Button variant="text" onClick={onClose}>完成</Button>}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
        <text style={{ flexGrow: 1, color: theme.onSurface, ...fontOf(theme.typescale.bodyLarge) }}>深色模式</text>
        <Switch checked={state.settings.mode === "dark"} ariaLabel="深色模式" onChange={(v) => setState((prev) => ({ ...prev, settings: { ...prev.settings, mode: v ? "dark" : "light" } }))} />
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
        <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.bodyLarge) }}>启动时自动更新</text>
          <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>打开应用后立刻拉取所有订阅</text>
        </div>
        <Switch
          checked={state.settings.refreshOnStart}
          ariaLabel="启动时自动更新"
          onChange={(v) => setState((prev) => ({ ...prev, settings: { ...prev.settings, refreshOnStart: v } }))}
        />
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.bodyLarge) }}>后台自动更新</text>
          <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>应用运行期间按间隔刷新，失败不会打扰你</text>
        </div>
        <SegmentedButton
          items={AUTO_REFRESH_CHOICES.map((minutes) => ({ label: minutes === 0 ? "关闭" : `${minutes} 分钟` }))}
          selectedIndex={Math.max(0, (AUTO_REFRESH_CHOICES as readonly number[]).indexOf(state.settings.autoRefreshMinutes))}
          onSelectionChange={(index) => setState((prev) => ({ ...prev, settings: { ...prev.settings, autoRefreshMinutes: AUTO_REFRESH_CHOICES[index] ?? DEFAULT_SETTINGS.autoRefreshMinutes } }))}
        />
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
        <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.bodyLarge) }}>强调色</text>
        <div style={{ width: "100%", display: "flex", flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {ACCENT_PRESETS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              selected={color === state.settings.accentColor}
              onSelect={() => setState((prev) => ({ ...prev, settings: { ...prev.settings, accentColor: color } }))}
            />
          ))}
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flexGrow: 1 }}>
            <FilledTextField label="自定义颜色" value={accent} placeholder="#6750a4" onChange={setAccent} />
          </div>
          <Button variant="tonal" disabled={accentInvalid} onClick={applyAccent}>应用</Button>
          <Button variant="text" onClick={() => { setAccent(""); setState((prev) => ({ ...prev, settings: { ...prev.settings, accentColor: undefined } })) }}>重置</Button>
        </div>
        {accentInvalid ? (
          <text style={{ color: theme.error, ...fontOf(theme.typescale.bodySmall) }}>请输入 #RGB 或 #RRGGBB 形式的颜色</text>
        ) : null}
      </div>

      <Divider />
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
        <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.titleSmall) }}>管理订阅</text>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", maxHeight: 240, overflowY: "scroll", gap: 4 }}>
          {state.subscriptions.length === 0 ? (
            <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall), paddingTop: 4 }}>还没有订阅。</text>
          ) : (
            state.subscriptions.map((url) => {
              const feed = state.feeds[url]
              const title = feed?.title ?? hostLabel(url)
              return (
                <div key={url} style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40, borderRadius: theme.shape.medium, paddingLeft: 8, paddingRight: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: theme.shape.small, backgroundColor: theme.surfaceContainerHighest, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <GlyphIcon name="rss" color={theme.onSurfaceVariant} size={14} />
                  </div>
                  <text style={{ flexGrow: 1, minWidth: 0, color: theme.onSurface, overflow: "hidden", ...fontOf(theme.typescale.bodyMedium) }}>{title}</text>
                  <Button variant="text" icon="delete" onClick={() => onRemoveFeed(url)}>删除</Button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}

function RemoveFeedDialog({ open, feedUrl, onClose, onConfirm }: {
  open: boolean
  feedUrl: string | null
  onClose: () => void
  onConfirm: () => void
}) {
  const theme = useMaterialTheme()
  const label = feedUrl ? hostLabel(feedUrl) : ""
  return (
    <Modal
      open={open}
      title="删除订阅"
      width={420}
      onDismiss={onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose}>取消</Button>
          <Button variant="danger" onClick={onConfirm}>删除</Button>
        </>
      }
    >
      <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodyMedium) }}>确定要删除订阅「{label}」吗？该来源的文章和已读记录会被移除。</text>
    </Modal>
  )
}
