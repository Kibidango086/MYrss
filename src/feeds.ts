// Fetch and parse RSS 2.0, Atom 1.0 and JSON Feed subscriptions.

import { decodeEntities, findChildren, findFirst, innerHtml, nodeText, parseXml, type XmlNode } from "./xml.js"

export interface FeedItem {
  id: string
  title: string
  link?: string
  author?: string
  /** Unix epoch milliseconds. */
  published?: number
  /** Plain-text summary shown in list rows. */
  summary?: string
  /** Article body (HTML) shown in the reader. */
  content?: string
  /** Leading image (enclosure / media / image field). */
  image?: string
}

export interface FeedData {
  url: string
  siteUrl?: string
  title?: string
  description?: string
  icon?: string
  fetchedAt: number
  error?: string
  items: FeedItem[]
}

const USER_AGENT = "MYrss/0.1 (RSS reader built with GPUIX)"

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script\s*>/gi, " ")
      .replace(/<style[\s\S]*?<\/style\s*>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
}

function parseDate(value: string | undefined): number | undefined {
  if (!value) return undefined
  const ms = Date.parse(value.trim())
  return Number.isFinite(ms) ? ms : undefined
}

// ---- Atom 1.0 --------------------------------------------------------------

function firstLink(node: XmlNode): string | undefined {
  const links = findChildren(node, "link")
  for (const link of links) {
    const rel = link.attrs["rel"]
    if (!rel || rel === "alternate") return link.attrs["href"]
  }
  return links[0]?.attrs["href"]
}

function parseAtom(root: XmlNode, url: string): FeedData {
  const siteUrl = firstLink(root)
  const iconNode = findFirst(root, "icon") || findFirst(root, "logo")
  const icon = iconNode ? nodeText(iconNode).trim() || undefined : undefined
  const subs = findFirst(root, "subtitle")
  const entries = findChildren(root, "entry")

  const items: FeedItem[] = entries.map((entry): FeedItem => {
    const link = firstLink(entry)
    const id = nodeText(findFirst(entry, "id") ?? { tag: "id", attrs: {}, children: [], text: link ?? "", parent: null }).trim() || link || url
    const contentNode = findFirst(entry, "content")
    const summaryNode = findFirst(entry, "summary")
    const content = contentNode ? innerHtml(contentNode).trim() : undefined
    const summary = content
      ? stripTags(innerHtml(summaryNode ?? { tag: "summary", attrs: {}, children: [], text: "", parent: null })).trim()
      : contentNode
        ? stripTags(content ?? "")
        : summaryNode
          ? nodeText(summaryNode).trim()
          : undefined
    const authorNode = findFirst(entry, "author")
    const author = authorNode ? nodeText(findFirst(authorNode, "name") ?? authorNode).trim() : undefined

    return {
      id,
      title: nodeText(findFirst(entry, "title") ?? entry).trim(),
      link,
      author,
      published: parseDate(nodeText(findFirst(entry, "published") ?? { tag: "published", attrs: {}, children: [], text: "", parent: null })) ?? parseDate(nodeText(findFirst(entry, "updated") ?? { tag: "updated", attrs: {}, children: [], text: "", parent: null })),
      summary: summary || undefined,
      content,
    }
  })

  return {
    url,
    siteUrl,
    title: nodeText(findFirst(root, "title") ?? { tag: "title", attrs: {}, children: [], text: url, parent: null }).trim() || url,
    description: nodeText(subs ?? { tag: "subtitle", attrs: {}, children: [], text: "", parent: null }).trim() || undefined,
    icon,
    fetchedAt: Date.now(),
    items,
  }
}

// ---- RSS 2.0 ---------------------------------------------------------------

function parseRss(root: XmlNode, url: string): FeedData {
  const channel = root.tag === "rss" ? findFirst(root, "channel") ?? root : root
  const imageNode = findFirst(channel, "image")
  const image = imageNode ? nodeText(findFirst(imageNode, "url") ?? imageNode).trim() : undefined
  const items = findChildren(channel, "item")

  const parsed: FeedItem[] = items.map((item): FeedItem => {
    const link = nodeText(findFirst(item, "link") ?? { tag: "link", attrs: {}, children: [], text: "", parent: null }).trim() || undefined
    const guidNode = findFirst(item, "guid")
    const id = nodeText(guidNode ?? { tag: "guid", attrs: {}, children: [], text: "", parent: null }).trim() || link || ""
    const contentNode = findFirst(item, "content:encoded") ?? findFirst(item, "encoded") ?? findFirst(item, "description")
    const content = contentNode ? contentNode.text.trim() || innerHtml(contentNode).trim() : undefined

    const descNode = findFirst(item, "description")
    const summary = content
      ? stripTags(content)
      : descNode
        ? stripTags(innerHtml(descNode))
        : undefined

    const authorNode = findFirst(item, "author") ?? findFirst(item, "dc:creator") ?? findFirst(item, "creator")
    let author: string | undefined
    if (authorNode) {
      const raw = nodeText(authorNode).trim()
      const bracket = raw.match(/\(([^()]*)\)/)
      const email = raw.match(/<([^>]+)>/)
      const name = (raw.split(",")[0] ?? "").trim()
      author = (bracket?.[1] ?? email?.[1] ?? name).trim() || undefined
    }

    // enclosure image (RSS) or media:content (Media RSS)
    let image: string | undefined
    const enclosure = findFirst(item, "enclosure")
    if (enclosure && (enclosure.attrs["type"]?.startsWith("image/") || /^(image|photo)/i.test(enclosure.attrs["type"] ?? ""))) {
      image = enclosure.attrs["url"]
    }
    if (!image) {
      const media = findFirst(item, "media:content") ?? findFirst(item, "media:thumbnail")
      if (media?.attrs["url"]) image = media.attrs["url"]
    }

    return {
      id,
      title: nodeText(findFirst(item, "title") ?? { tag: "title", attrs: {}, children: [], text: "", parent: null }).trim() || "(无标题)",
      link,
      author,
      published: parseDate(nodeText(findFirst(item, "pubDate") ?? findFirst(item, "dc:date") ?? { tag: "", attrs: {}, children: [], text: "", parent: null })),
      summary,
      content,
      image,
    }
  })

  return {
    url,
    siteUrl: nodeText(findFirst(channel, "link") ?? { tag: "link", attrs: {}, children: [], text: "", parent: null }).trim() || undefined,
    title: nodeText(findFirst(channel, "title") ?? { tag: "title", attrs: {}, children: [], text: url, parent: null }).trim() || url,
    description: nodeText(findFirst(channel, "description") ?? { tag: "description", attrs: {}, children: [], text: "", parent: null }).trim() || undefined,
    icon: image,
    fetchedAt: Date.now(),
    items: parsed,
  }
}

// ---- JSON Feed -------------------------------------------------------------

function parseJsonFeed(doc: unknown, url: string): FeedData {
  const feed = (doc ?? {}) as {
    title?: string
    home_page_url?: string
    feed_url?: string
    description?: string
    icon?: string
    items?: Array<{
      id?: string
      url?: string
      title?: string
      content_html?: string
      content_text?: string
      summary?: string
      date_published?: string
      date_modified?: string
      author?: { name?: string } | { name?: string }[]
      image?: string
      banner_image?: string
    }>
  }

  const items: FeedItem[] = (feed.items ?? [])
    .filter((item) => item && (item.title || item.content_html || item.content_text))
    .map((item): FeedItem => ({
      id: item.id ?? item.url ?? "",
      title: item.title ?? (stripTags(item.content_text ?? item.summary ?? "").slice(0, 120) || "(无标题)"),
      link: item.url,
      author: Array.isArray(item.author) ? item.author[0]?.name : item.author?.name,
      published: parseDate(item.date_published ?? item.date_modified),
      summary: (item.summary ?? item.content_text ?? "").trim() || undefined,
      content: item.content_html || undefined,
      image: item.image ?? item.banner_image,
    }))

  return {
    url,
    siteUrl: feed.home_page_url || url,
    title: feed.title ?? url,
    description: feed.description,
    icon: feed.icon,
    fetchedAt: Date.now(),
    items,
  }
}

// ---- Entry point -----------------------------------------------------------

async function fetchFeedText(url: string): Promise<{ text: string; contentType: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "application/atom+xml, application/rss+xml, application/feed+json, application/json, application/xml, text/xml, */*",
      },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim())
    const text = await response.text()
    const contentType = response.headers.get("content-type") ?? ""
    return { text, contentType }
  } finally {
    clearTimeout(timer)
  }
}

export function parseFeedText(text: string, url: string, contentType = ""): FeedData {
  const trimmed = text.trimStart()
  // JSON Feed
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return parseJsonFeed(JSON.parse(trimmed), url)
    } catch {
      return { url, title: url, fetchedAt: Date.now(), error: "无法解析 Feed 内容", items: [] }
    }
  }

  const root = parseXml(text)
  if (!root) {
    return { url, title: url, fetchedAt: Date.now(), error: "无法解析 Feed 内容", items: [] }
  }

  if (root.tag === "feed") return parseAtom(root, url)
  if (root.tag === "rss" || root.tag === "rdf") return parseRss(root, url)
  // Some feeds wrap <channel> at the root (broken but common)
  if (root.tag === "channel") return parseRss(root, url)

  return { url, title: url, fetchedAt: Date.now(), error: `${contentType ? contentType + " " : ""}不是支持的 Feed 格式`, items: [] }
}

export async function fetchFeed(url: string): Promise<FeedData> {
  const { text, contentType } = await fetchFeedText(url)
  return parseFeedText(text, url, contentType)
}

/** Merge a fetched feed over the existing cache, de-duplicating items by id. */
export function mergeFeed(existing: FeedData | undefined, incoming: FeedData): FeedData {
  const seen = new Set<string>()
  const items: FeedItem[] = []
  const push = (item: FeedItem) => {
    if (!item.id) return
    if (seen.has(item.id)) return
    seen.add(item.id)
    items.push(item)
  }
  if (existing) {
    for (const item of existing.items) push(item)
  }
  for (const item of incoming.items) push(item)
  items.sort((a, b) => (b.published ?? 0) - (a.published ?? 0))
  return {
    ...incoming,
    title: incoming.title || existing?.title,
    siteUrl: incoming.siteUrl || existing?.siteUrl,
    description: incoming.description || existing?.description,
    icon: incoming.icon || existing?.icon,
    items,
  }
}

/** Derive a feed label from a URL (scheme + trailing credentials stripped). */
export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}
