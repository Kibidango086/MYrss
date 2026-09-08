// Minimal, tolerant XML parser for RSS/Atom feeds.
// No DOM / browser APIs are available in GPUIX, so we parse with a small scanner.

export interface XmlNode {
  tag: string
  attrs: Record<string, string>
  children: XmlNode[]
  /** Text directly inside this node (decoded, excludes children). */
  text: string
  parent: XmlNode | null
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: "\u00a0",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  ensp: "\u2002",
  emsp: "\u2003",
  rsquo: "\u2019",
  lsquo: "\u2018",
  ldquo: "\u201c",
  rdquo: "\u201d",
  bull: "•",
  middot: "·",
}

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, value: string) => {
    if (value[0] === "#") {
      let code: number
      if (value[1] === "x" || value[1] === "X") {
        code = Number.parseInt(value.slice(2), 16)
      } else {
        code = Number.parseInt(value.slice(1), 10)
      }
      if (Number.isFinite(code) && code > 0) {
        try {
          return String.fromCodePoint(code)
        } catch {
          return entity
        }
      }
      return entity
    }
    return NAMED_ENTITIES[value.toLowerCase()] ?? entity
  })
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    const value = match[2] ?? match[3] ?? match[4] ?? ""
    attrs[match[1]!.toLowerCase()] = decodeEntities(value)
  }
  return attrs
}

export function parseXml(source: string): XmlNode | null {
  const stack: XmlNode[] = []
  let root: XmlNode | null = null
  let index = 0

  const pushText = (text: string) => {
    if (text.length === 0) return
    const decoded = decodeEntities(text)
    if (stack.length > 0) {
      stack[stack.length - 1]!.text += decoded
    }
  }

  while (index < source.length) {
    const lt = source.indexOf("<", index)
    if (lt === -1) {
      pushText(source.slice(index))
      break
    }
    if (lt > index) pushText(source.slice(index, lt))

    if (source.startsWith("<!--", lt)) {
      const end = source.indexOf("-->", lt)
      index = end === -1 ? source.length : end + 3
      continue
    }
    if (source.startsWith("<![CDATA[", lt)) {
      const end = source.indexOf("]]>", lt)
      const content = end === -1 ? source.slice(lt + 9) : source.slice(lt + 9, end)
      pushText(content)
      index = end === -1 ? source.length : end + 3
      continue
    }
    if (source.startsWith("<![", lt) || source.startsWith("<!DOCTYPE", lt) || source.startsWith("<!doctype", lt)) {
      const end = source.indexOf(">", lt)
      index = end === -1 ? source.length : end + 1
      continue
    }
    if (source.startsWith("<?", lt)) {
      const end = source.indexOf("?>", lt)
      index = end === -1 ? source.length : end + 2
      continue
    }

    const gt = indexOfTagEnd(source, lt)
    if (gt === -1) {
      pushText(source.slice(lt))
      break
    }
    const raw = source.slice(lt + 1, gt).trim()
    index = gt + 1

    if (raw.length === 0) continue
    if (raw.startsWith("!")) continue

    if (raw.startsWith("/")) {
      const name = raw.slice(1).trim().toLowerCase().split(/\s/)[0] ?? ""
      // pop until matching tag (tolerant of minor mismatches)
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        const top = stack[i]
        stack.pop()
        if (top?.tag === name) break
      }
      continue
    }

    const selfClose = raw.endsWith("/")
    const inner = selfClose ? raw.slice(0, -1).trim() : raw
    const space = inner.search(/[\s]/)
    let tagName: string
    let attrPart: string
    if (space === -1) {
      tagName = inner
      attrPart = ""
    } else {
      tagName = inner.slice(0, space)
      attrPart = inner.slice(space + 1)
    }

    const node: XmlNode = {
      tag: tagName.toLowerCase(),
      attrs: parseAttrs(attrPart),
      children: [],
      text: "",
      parent: stack.length > 0 ? (stack[stack.length - 1] ?? null) : null,
    }
    if (stack.length > 0) {
      stack[stack.length - 1]!.children.push(node)
    } else if (root === null) {
      root = node
    }
    if (!selfClose) {
      stack.push(node)
    }
  }

  return root
}

function indexOfTagEnd(source: string, lt: number): number {
  let inQuote: string | null = null
  for (let i = lt; i < source.length; i += 1) {
    const ch = source[i]
    if (inQuote) {
      if (ch === inQuote) inQuote = null
    } else if (ch === "\"" || ch === "'") {
      inQuote = ch
    } else if (ch === ">") {
      return i
    }
  }
  return -1
}

export function findChildren(node: XmlNode, tag: string): XmlNode[] {
  const wanted = tag.toLowerCase()
  return node.children.filter((child) => child.tag === wanted)
}

export function findFirst(node: XmlNode, tag: string): XmlNode | null {
  const wanted = tag.toLowerCase()
  for (const child of node.children) {
    if (child.tag === wanted) return child
  }
  return null
}

/** Recursively concatenated text of a node (title, author, plain summary). */
export function nodeText(node: XmlNode): string {
  let out = node.text
  for (const child of node.children) {
    out += nodeText(child)
  }
  return out
}

/** Re-serialize a node's elements back to HTML (used for article content). */
export function innerHtml(node: XmlNode): string {
  let out = node.text
  for (const child of node.children) {
    out += serializeElement(child)
  }
  return out
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
}

function serializeElement(node: XmlNode): string {
  const attrList = Object.entries(node.attrs)
    .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
    .join("")
  if (node.children.length === 0 && node.text.length === 0) {
    return `<${node.tag}${attrList} />`
  }
  if (node.children.length === 0) {
    return `<${node.tag}${attrList}>${node.text}</${node.tag}>`
  }
  let body = node.text
  for (const child of node.children) {
    body += serializeElement(child)
  }
  return `<${node.tag}${attrList}>${body}</${node.tag}>`
}
