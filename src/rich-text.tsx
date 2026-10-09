import React from "react"
import { openInBrowser } from "./browser.js"
import { nativeTheme, type AppearanceMode, type MaterialTheme } from "./theme.js"

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", hellip: "…",
  mdash: "—", ndash: "–", copy: "©", reg: "®", trade: "™",
}

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, value: string) => {
    if (value.startsWith("#x") || value.startsWith("#X")) {
      const code = Number.parseInt(value.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity
    }
    if (value.startsWith("#")) {
      const code = Number.parseInt(value.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity
    }
    return ENTITIES[value.toLowerCase()] ?? entity
  })
}

export function mfmToMarkdown(input: string): string {
  let output = input
  for (let depth = 0; depth < 6; depth += 1) {
    const next = output.replace(/\$\[([a-z0-9_.-]+)\s+([^\[\]]*)\]/gi, "$2")
    if (next === output) break
    output = next
  }
  return output.replace(/:([a-z0-9_+-]+):/gi, (match, name: string) => name.length <= 48 ? match : match)
}

export function htmlToMarkdown(input: string): string {
  let output = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<pre([^>]*)>[\s\S]*?<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre\s*>/gi, (_match, _preAttributes, _codeAttributes, content: string) => `\n\n\`\`\`\n${content}\n\`\`\`\n\n`)
    .replace(/<pre([^>]*)>([\s\S]*?)<\/pre\s*>/gi, (_match, _attributes, content: string) => `\n\n\`\`\`\n${content}\n\`\`\`\n\n`)
    .replace(/<code([^>]*)>([\s\S]*?)<\/code\s*>/gi, (_match, _attributes, content: string) => `\`${content}\``)
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi, (_match, href: string, content: string) => `[${content}](${href})`)
    .replace(/<(br|hr)\s*\/?>/gi, "\n\n")
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi, (_match, level: string, content: string) => `\n\n${"#".repeat(Number(level))} ${content}\n\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi, "\n- $1")
    .replace(/<(p|div|section|article|header|footer|blockquote|ul|ol|table|tr|center|plain)\b[^>]*>/gi, "\n\n")
    .replace(/<\/(p|div|section|article|header|footer|blockquote|ul|ol|table|tr|center|plain)>/gi, "\n\n")
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, "**$2**")
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, "_$2_")
    .replace(/<(del|s|strike)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, "~~$2~~")
    .replace(/<\/?[a-z][^>]*>/gi, "")

  output = decodeEntities(mfmToMarkdown(output))
  return output.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

export function htmlToPlainText(input: string): string {
  const withoutCode = input
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|blockquote|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
  return decodeEntities(mfmToMarkdown(withoutCode))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
}

/** One piece of an article body, in document order. */
export type ContentBlock =
  | { kind: "text"; markdown: string }
  | { kind: "image"; url: string; alt: string }

const IMAGE_TAG = /<img\b[^>]*>/gi

function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))
  return match?.[1]?.trim() || undefined
}

/**
 * Split an HTML article body into ordered text and image blocks.
 *
 * `htmlToMarkdown` drops `<img>` — GPUIX's native `<markdown>` renderer has no
 * image support — so a caller that just converts the whole body has no way to
 * place pictures and is reduced to stacking them after the text. Splitting the
 * body keeps each picture where the author put it.
 *
 * Lazy-loading feeds put the real source in `data-src` / `data-original`, so
 * those are accepted when `src` is a placeholder. Non-http(s) sources, repeats
 * of an already emitted URL, and anything past `maxImages` are skipped.
 */
export function splitHtmlImages(html: string, maxImages = 12): ContentBlock[] {
  const blocks: ContentBlock[] = []
  const seen = new Set<string>()
  let cursor = 0
  let images = 0

  const pushText = (chunk: string) => {
    const markdown = htmlToMarkdown(chunk)
    if (markdown) blocks.push({ kind: "text", markdown })
  }

  IMAGE_TAG.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = IMAGE_TAG.exec(html)) !== null) {
    const tag = match[0]
    const url = attribute(tag, "src") ?? attribute(tag, "data-src") ?? attribute(tag, "data-original")
    const usable = Boolean(url && /^https?:\/\//i.test(url) && !seen.has(url) && images < maxImages)
    if (!usable) continue
    pushText(html.slice(cursor, match.index))
    cursor = match.index + tag.length
    seen.add(url as string)
    images += 1
    blocks.push({ kind: "image", url: url as string, alt: attribute(tag, "alt") ?? "" })
  }
  pushText(html.slice(cursor))
  return blocks
}

/**
 * Render an already-converted markdown string with the Material palette.
 *
 * Use this — not `RichText` — for the pieces `splitHtmlImages` returns:
 * converting twice would run `decodeEntities` over text that is already
 * decoded, so a literal `<` in the article would then be stripped as a tag.
 */
export function RichMarkdown({ markdown, theme, mode, lineClamp }: {
  markdown: string
  theme: MaterialTheme
  mode: AppearanceMode
  lineClamp?: number
}) {
  return (
    <markdown
      source={markdown}
      onLinkClick={(event) => {
        const url = String(event.value ?? "")
        if (url.startsWith("https://") || url.startsWith("http://")) openInBrowser(url)
      }}
      // GPUIX paints markdown in Rust, so the Material palette and typescale
      // have to reach it through the native theme, not through React styles.
      theme={nativeTheme(theme, { appearance: mode, bg: theme.surfaceContainerLow, border: theme.surfaceContainerLow })}
      style={lineClamp ? { lineClamp } : undefined}
    />
  )
}

export function RichText({ source, theme, mode, lineClamp }: {
  source: string
  theme: MaterialTheme
  mode: AppearanceMode
  lineClamp?: number
}) {
  return (
    <RichMarkdown
      markdown={htmlToMarkdown(source)}
      theme={theme}
      mode={mode}
      lineClamp={lineClamp}
    />
  )
}
