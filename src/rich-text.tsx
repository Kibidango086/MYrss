import React from "react"
import { openInBrowser } from "./browser.js"
import type { AppearanceMode, MaterialTheme } from "./theme.js"

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

export function RichText({ source, theme, mode, lineClamp }: {
  source: string
  theme: MaterialTheme
  mode: AppearanceMode
  lineClamp?: number
}) {
  return (
    <markdown
      source={htmlToMarkdown(source)}
      onLinkClick={(event) => {
        const url = String(event.value ?? "")
        if (url.startsWith("https://") || url.startsWith("http://")) openInBrowser(url)
      }}
      theme={{
        appearance: mode,
        bg: theme.surfaceContainerLow,
        border: theme.surfaceContainerLow,
        text: theme.onSurface,
        textMuted: theme.onSurfaceVariant,
        textFaint: theme.outline,
        accent: theme.primary,
        fontSans: theme.fontSans,
        fontMono: theme.fontMono,
      }}
      style={lineClamp ? { lineClamp } : undefined}
    />
  )
}
