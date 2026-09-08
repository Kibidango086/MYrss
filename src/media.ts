// Remote image caching for GPUIX `<img>` (which needs a local file or data URI,
// not an arbitrary https URL) — same pattern as misskey-client.

import { existsSync } from "node:fs"
import { mkdir, rename, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const mediaDirectory = path.join(
  process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"),
  "myrss",
  "media",
)

const inFlight = new Map<string, Promise<string | undefined>>()

function extensionFor(url: URL, contentType: string): string {
  const pathname = url.pathname.toLowerCase()
  for (const ext of [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]) {
    if (pathname.endsWith(ext)) return ext
  }
  if (contentType.includes("png")) return ".png"
  if (contentType.includes("webp")) return ".webp"
  if (contentType.includes("gif")) return ".gif"
  if (contentType.includes("svg")) return ".svg"
  if (contentType.includes("avif")) return ".avif"
  if (contentType.includes("jpeg")) return ".jpg"
  return ".jpg"
}

async function fileName(url: URL, ext: string): Promise<string> {
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url.href))),
  )
    .slice(0, 10)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
  return `${digest}${ext}`
}

async function download(imgUrl: string): Promise<string | undefined> {
  try {
    const url = new URL(imgUrl)
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined
    const response = await fetch(url, { redirect: "follow" })
    if (!response.ok) return undefined
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength === 0) return undefined
    const destination = path.join(
      mediaDirectory,
      await fileName(url, extensionFor(url, response.headers.get("content-type") ?? "")),
    )
    if (!existsSync(destination)) {
      await mkdir(mediaDirectory, { recursive: true })
      const temporary = `${destination}.${process.pid}.tmp`
      await writeFile(temporary, bytes)
      await rename(temporary, destination)
    }
    return destination
  } catch {
    return undefined
  } finally {
    inFlight.delete(imgUrl)
  }
}

async function cacheImage(imgUrl: string): Promise<string | undefined> {
  const pending = inFlight.get(imgUrl)
  if (pending) return pending
  const task = download(imgUrl)
  inFlight.set(imgUrl, task)
  return task
}

/** Download and cache remote images; returns a map of original URL → local file path. */
export async function cacheRemoteImages(urls: Array<string | undefined>): Promise<Record<string, string>> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url))))]
  const results = await Promise.all(unique.map(async (url) => [url, await cacheImage(url)] as const))
  return Object.fromEntries(results.filter((entry): entry is [string, string] => Boolean(entry[1])))
}

/** Pull ordered image URLs out of an HTML article body. */
export function extractImageUrls(html: string): string[] {
  const urls: string[] = []
  const regex = /<img\b[^>]*src=["']([^"'"\s>]+)["']/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const src = match[1]?.trim()
    if (src && /^https?:\/\//i.test(src)) urls.push(src)
  }
  return urls
}
