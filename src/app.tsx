import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "@gpuix/react"
import {
  MaterialProvider, useMaterialTheme, TopAppBar, Button, FilledTextField, IconButton,
  NavigationDrawer, Divider, LayoutShell, Snackbar, Switch, Badge,
} from "./material.js"
import { RichText, htmlToPlainText } from "./rich-text.js"
import { GlyphIcon, type MyIcon } from "./glyph-icons.js"
import { MaterialIcon, type MaterialSymbol } from "./icons.js"
import { fetchFeed, mergeFeed, hostLabel, type FeedData, type FeedItem } from "./feeds.js"
import { loadState, saveState, type StoredState } from "./storage.js"
import { formatFullDate, formatRelative } from "./format.js"
import { openInBrowser } from "./browser.js"
import { cacheRemoteImages, extractImageUrls } from "./media.js"

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
}

const DEFAULT_UI: UiState = {
  selection: ALL,
  openKey: null,
  dialog: null,
  pendingRemove: null,
  snackbar: null,
  refreshing: {},
  search: "",
}

function fontOf(scale: { size: number; weight: number; lineHeight: number }) {
  return { fontSize: scale.size, fontWeight: scale.weight, lineHeight: scale.lineHeight }
}
const MOTION_EASE: [number, number, number, number] = [0.2, 0, 0, 1]

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
    if (!q) return entriesForSelection
    return entriesForSelection.filter((e) =>
      (e.item.title ?? "").toLowerCase().includes(q) || (e.item.summary ?? "").toLowerCase().includes(q),
    )
  }, [entriesForSelection, ui.search])

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

  const toggleStar = useCallback((key: string) => {
    setState((prev) => {
      const starred = starSet.has(key)
        ? prev.starred.filter((id) => id !== key)
        : [...prev.starred, key]
      return { ...prev, starred }
    })
  }, [])

  const openArticle = useCallback((key: string) => {
    setUi((prev) => ({ ...prev, openKey: key }))
    markRead(key)
  }, [markRead])

  const refreshFeed = useCallback(
    async (url: string, silent = false) => {
      setUi((prev) => ({ ...prev, refreshing: { ...prev.refreshing, [url]: true } }))
      try {
        const incoming = await fetchFeed(url)
        setState((prev) => {
          const merged = mergeFeed(prev.feeds[url], incoming)
          return { ...prev, feeds: { ...prev.feeds, [url]: merged } }
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        showToast(`更新失败：${hostLabel(url)}（${message}）`)
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
    setState((prev) => ({ ...prev }))
    const urls = state.subscriptions
    await Promise.all(urls.map((url) => refreshFeed(url, true)))
    if (urls.length > 0) showToast("刷新完成")
  }, [state.subscriptions, refreshFeed, showToast])

  const addFeed = useCallback(
    async (rawUrl: string) => {
      const trimmed = rawUrl.trim()
      if (!trimmed) return
      let url = trimmed
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`
      setUi((prev) => {
        const next: UiState = { ...prev, dialog: null, selection: url, openKey: null }
        if (!state.subscriptions.includes(url)) {
          setState((s) => ({ ...s, subscriptions: [...s.subscriptions, url] }))
        }
        return next
      })
      setState((prev) => {
        if (prev.subscriptions.includes(url)) return prev
        return { ...prev, subscriptions: [...prev.subscriptions, url] }
      })
      showToast("正在添加订阅…")
      await refreshFeed(url)
      showToast(`已添加：${hostLabel(url)}`)
    },
    [refreshFeed, showToast, state.subscriptions],
  )

  const removeFeed = useCallback(
    (url: string) => {
      setState((prev) => {
        const feeds = { ...prev.feeds }
        delete feeds[url]
        return {
          ...prev,
          subscriptions: prev.subscriptions.filter((u) => u !== url),
          feeds,
          read: prev.read,
          starred: prev.starred,
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

  // Initial: refresh feeds that have no cached data yet
  useEffect(() => {
    for (const url of state.subscriptions) {
      if (!state.feeds[url]) void refreshFeed(url, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto refresh every 30 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      const urls = state.subscriptions
      for (const url of urls) void refreshFeed(url, true)
    }, 30 * 60 * 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.subscriptions])

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
    refreshFeed: (url: string, silent?: boolean) => Promise<void>
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

function EmptyState({ icon }: { icon: MyIcon }) {
  const theme = useMaterialTheme()
  return (
    <div style={{ width: "100%", flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <GlyphIcon name={icon} color={theme.outline} size={40} />
      <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodyMedium) }}>这里空空如也</text>
    </div>
  )
}

function Shell(props: ShellProps) {
  const theme = useMaterialTheme()
  const { state, ui, setUi, actions, readSet, starSet, openEntry, shownEntries } = props

  const select = (key: SelectionKey) => setUi((prev) => ({ ...prev, selection: key, openKey: null }))

  const sortedFeeds = state.subscriptions.map((url) => state.feeds[url]).filter((f): f is FeedData => Boolean(f))
  const feedRows = state.subscriptions.map((url, index) => {
    const feed = state.feeds[url]
    const title = feed?.title ?? hostLabel(url)
    const unread = props.unreadByFeed[url] ?? 0
    return (
      <div key={url} style={{ width: "100%" }}>
        <FeedRow title={title} active={ui.selection === url} unread={unread} onClick={() => select(url)} />
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
              <IconButton icon="refresh" onClick={() => void actions.refreshAll()} disabled={props.isSaving} />
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
            <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.titleMedium), fontWeight: 700 }}>订阅</text>
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
        <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", backgroundColor: theme.surfaceContainerLow, borderRightWidth: 1, borderRightColor: theme.outlineVariant }}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <text style={{ flexGrow: 1, color: theme.onSurface, ...fontOf(theme.typescale.titleMedium), fontWeight: 600, overflow: "hidden" }}>{props.selectedFeedInfo.title}</text>
              {props.shownEntries.length > 0 ? (
                <div onClick={actions.markAllReadVisible} style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: theme.shape.full, paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, cursor: "pointer", hover: { backgroundColor: `${theme.onSurface}14` } }}>
                  <MaterialIcon name="check" color={theme.primary} size={16} />
                  <text style={{ color: theme.primary, ...fontOf(theme.typescale.labelMedium) }}>全部已读</text>
                </div>
              ) : null}
            </div>
            <FilledTextField value={ui.search} onChange={(v) => setUi((prev) => ({ ...prev, search: v }))} placeholder="搜索文章" />
            <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>{`${props.shownEntries.length} 篇`}</text>
          </div>
          <div style={{ width: "100%", flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {props.shownEntries.length === 0 ? (
              <EmptyState icon="rss" />
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
  return (
    <div style={{ minWidth: 22, height: 20, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 7, paddingRight: 7, borderRadius: 10, backgroundColor: bg }}>
      <text style={{ color, ...fontOf({ size: 11, weight: 700, lineHeight: 16 }) }}>{text}</text>
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
  return (
    <div
      onClick={onClick}
      style={{
        width: "100%", minHeight: 46, display: "flex", flexDirection: "row", alignItems: "center",
        gap: 12, paddingLeft: 12, paddingRight: 12, borderRadius: theme.shape.full,
        backgroundColor: active ? theme.secondaryContainer : "transparent",
        cursor: "pointer",
        hover: { backgroundColor: active ? theme.secondaryContainer : `${fg}14` },
      }}
    >
      {icon(fg)}
      <text style={{ flexGrow: 1, minWidth: 0, color: fg, ...fontOf(theme.typescale.labelLarge) }}>{label}</text>
      {count > 0 ? <Pill text={String(count)} color={fg} bg={active ? `${theme.onSecondaryContainer}22` : `${fg}1f`} /> : null}
    </div>
  )
}

function TopGlyphButton({ icon, label, onClick }: { icon: MyIcon; label?: string; onClick?: () => void }) {
  const theme = useMaterialTheme()
  return (
    <div
      onClick={onClick}
      style={{
        height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: theme.shape.full,
        cursor: "pointer", paddingLeft: 8, paddingRight: 8,
        hover: { backgroundColor: `${theme.onSurface}14` },
      }}
    >
      <GlyphIcon name={icon} color={theme.onSurfaceVariant} size={20} />
      {label ? <text style={{ marginLeft: 6, color: theme.onSurfaceVariant, ...fontOf(theme.typescale.labelLarge) }}>{label}</text> : null}
    </div>
  )
}

function FeedRow({ title, active, unread, onClick }: {
  title: string
  active?: boolean
  unread: number
  onClick?: () => void
}) {
  const theme = useMaterialTheme()
  return (
    <div
      onClick={onClick}
      style={{
        width: "100%", minHeight: 44, display: "flex", flexDirection: "row", alignItems: "center", gap: 10,
        paddingLeft: 8, paddingRight: 8, borderRadius: theme.shape.medium, cursor: "pointer",
        backgroundColor: active ? theme.secondaryContainer : "transparent",
        hover: { backgroundColor: active ? theme.secondaryContainer : `${theme.onSurface}0f` },
      }}
    >
      <div style={{ width: 28, height: 28, borderRadius: theme.shape.small, backgroundColor: active ? theme.primaryContainer : theme.surfaceContainerHighest, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <GlyphIcon name="rss" color={active ? theme.onPrimaryContainer : theme.onSurfaceVariant} size={16} />
      </div>
      <text style={{ flexGrow: 1, minWidth: 0, color: active ? theme.onSecondaryContainer : theme.onSurface, overflow: "hidden", ...fontOf(theme.typescale.bodyMedium) }}>{title}</text>
      {unread > 0 ? <Pill text={unread > 99 ? "99+" : String(unread)} color={active ? theme.onSecondaryContainer : theme.onSurfaceVariant} bg={active ? `${theme.onSecondaryContainer}22` : `${theme.onSurface}1a`} /> : null}
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
  return (
    <div
      onClick={onClick}
      style={{
        width: "100%", display: "flex", flexDirection: "row", gap: 10, padding: 12, paddingLeft: 16,
        borderRadius: theme.shape.medium, cursor: "pointer",
        backgroundColor: active ? theme.secondaryContainer : "transparent",
        hover: { backgroundColor: active ? theme.secondaryContainer : `${theme.onSurface}14` },
      }}
    >
      <div style={{ width: 3, borderRadius: theme.shape.small, backgroundColor: unread ? theme.primary : "transparent", flexShrink: 0 }} />
      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
          <text style={{ flexGrow: 1, minWidth: 0, color: active ? theme.onSecondaryContainer : unread ? theme.onSurface : theme.onSurfaceVariant, overflow: "hidden", ...fontOf(theme.typescale.titleSmall), fontWeight: unread ? 600 : 400 }}>{title}</text>
          {starred ? <MaterialIcon name="favorite" color={theme.primary} size={16} /> : null}
        </div>
        {summary ? (
          <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall), lineClamp: 2, overflow: "hidden" }}>{summary}</text>
        ) : null}
        <text style={{ color: theme.outline, ...fontOf(theme.typescale.labelSmall) }}>{`${feedTitle} · ${formatRelative(time)}`}</text>
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
  const [images, setImages] = useState<Array<{ src: string; alt: string }>>([])

  useEffect(() => {
    setImages([])
    const key = entry?.key
    if (!key) return
    let cancelled = false
    const raw = (entry.item.content || entry.item.summary || "").toString()
    const urls = extractImageUrls(raw)
    if (entry.item.image && !urls.includes(entry.item.image)) urls.unshift(entry.item.image)
    cacheRemoteImages(urls.slice(0, 12)).then((map) => {
      if (cancelled) return
      setImages(urls.filter((url) => map[url]).map((url) => ({ src: map[url] as string, alt: "" })))
    })
    return () => {
      cancelled = true
    }
  }, [entry?.key])

  if (!entry) {
    return (
      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: theme.surface }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <GlyphIcon name="rss" color={theme.outline} size={44} />
          <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodyLarge) }}>选择一篇文章开始阅读</text>
        </div>
      </div>
    )
  }

  const { item } = entry
  const starred = starSet.has(entry.key)
  const source = item.content || item.summary || "（该文章没有可显示的正文）"

  return (
    <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", backgroundColor: theme.surface }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 20, paddingBottom: 0 }}>
        <text style={{ flexGrow: 1, minWidth: 0, color: theme.onSurface, overflow: "hidden", ...fontOf(theme.typescale.headlineSmall) }}>{item.title}</text>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
          <StarButton starred={starred} onClick={onStar} />
          {item.link ? <IconButton icon="open_in_new" onClick={() => openInBrowser(item.link!)} /> : null}
        </div>
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 8, padding: 20, paddingTop: 8, paddingBottom: 8, flexWrap: "wrap" }}>
        <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>{entry.feedTitle}</text>
        {item.author ? <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>· {item.author}</text> : null}
        {item.published ? <text style={{ color: theme.onSurfaceVariant, ...fontOf(theme.typescale.bodySmall) }}>· {formatFullDate(item.published)}</text> : null}
      </div>

      <div style={{ flexGrow: 1, minHeight: 0, overflowY: "scroll", backgroundColor: theme.surface, padding: 20, paddingTop: 8 }}>
        {images.slice(0, 1).map((image) => (
          <div key={image.src} style={{ width: "100%", marginBottom: 16 }}>
            <img src={image.src} alt={image.alt} objectFit="contain" style={{ width: "100%", height: 320, borderRadius: theme.shape.large }} />
          </div>
        ))}
        <RichText source={source} theme={theme} mode={theme.mode} />
        {images.length > 1 ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {images.slice(1).map((image) => (
              <img key={image.src} src={image.src} alt={image.alt} objectFit="contain" style={{ width: "100%", height: 220, borderRadius: theme.shape.large }} />
            ))}
          </div>
        ) : null}
      </div>

      {!readSet.has(entry.key) ? (
        <div style={{ width: "100%", padding: 8, paddingLeft: 20, paddingRight: 20 }}>
          <Button variant="text" icon="check" onClick={onMarkUnread}>标为未读</Button>
        </div>
      ) : null}
    </div>
  )
}

function StarButton({ starred, onClick }: { starred: boolean; onClick: () => void }) {
  const theme = useMaterialTheme()
  const color = starred ? theme.primary : theme.onSurfaceVariant
  return (
    <div
      onClick={onClick}
      style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: theme.shape.full, cursor: "pointer", hover: { backgroundColor: `${theme.onSurface}14` } }}
    >
      {starred ? (
        <MaterialIcon name="favorite" color={color} size={22} />
      ) : (
        <GlyphIcon name="star_outline" color={color} size={22} />
      )}
    </div>
  )
}

// ─── Modal base + dialogs ─────────────────────────────────────────────────────

function Modal({ open, title, width = 440, children, footer }: {
  open: boolean
  title: string
  width?: number
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const theme = useMaterialTheme()
  if (!open) return null
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: theme.scrim, pointerEvents: "auto" }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, ease: MOTION_EASE }} style={{ width, maxWidth: "95%", padding: 24, borderRadius: theme.shape.extraLarge, backgroundColor: theme.surfaceContainerHigh, display: "flex", flexDirection: "column" }}>
        <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.headlineSmall) }}>{title}</text>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
        {footer ? (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>{footer}</div>
        ) : null}
      </motion.div>
    </div>
  )
}

const ACCENT_PRESETS = ["#006a6a", "#6750a4", "#e53935", "#1e88e5", "#43a047", "#fb8c00", "#d81b60", "#000000"]

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

  const applyAccent = () => {
    const hex = accent.trim()
    if (!hex) {
      setState((prev) => ({ ...prev, settings: { ...prev.settings, accentColor: undefined } }))
      return
    }
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return
    setState((prev) => ({ ...prev, settings: { ...prev.settings, accentColor: hex } }))
  }

  return (
    <Modal
      open={open}
      title="设置"
      width={520}
      footer={<Button variant="text" onClick={onClose}>完成</Button>}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
        <text style={{ flexGrow: 1, color: theme.onSurface, ...fontOf(theme.typescale.bodyLarge) }}>深色模式</text>
        <Switch checked={state.settings.mode === "dark"} onChange={(v) => setState((prev) => ({ ...prev, settings: { ...prev.settings, mode: v ? "dark" : "light" } }))} />
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
        <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.bodyLarge) }}>强调色</text>
        <div style={{ width: "100%", display: "flex", flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {ACCENT_PRESETS.map((color) => (
            <div
              key={color}
              onClick={() => setState((prev) => ({ ...prev, settings: { ...prev.settings, accentColor: color } }))}
              style={{ width: 32, height: 32, borderRadius: theme.shape.full, backgroundColor: color, cursor: "pointer", borderWidth: color === state.settings.accentColor ? 3 : 1, borderColor: color === state.settings.accentColor ? theme.onSurface : theme.outlineVariant }}
            />
          ))}
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flexGrow: 1 }}>
            <FilledTextField label="自定义颜色" value={accent} placeholder="#6750a4" onChange={setAccent} />
          </div>
          <Button variant="tonal" onClick={applyAccent}>应用</Button>
          <Button variant="text" onClick={() => { setAccent(""); setState((prev) => ({ ...prev, settings: { ...prev.settings, accentColor: undefined } })) }}>重置</Button>
        </div>
      </div>

      <Divider />
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
        <text style={{ color: theme.onSurface, ...fontOf(theme.typescale.titleMedium) }}>管理订阅</text>
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
