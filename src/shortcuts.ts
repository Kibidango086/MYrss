// Window-level keyboard shortcuts.
//
// GPUIX delivers a key to the focused element first and only then to the
// renderer-level callback — and it does not bubble through ancestors. A
// shortcut that has to work wherever focus happens to be (Escape closing a
// dialog) therefore cannot live on an element; it has to be registered at the
// window. `render()` wires `dispatchWindowKey` to that callback in `main.tsx`.

import type { EventPayload } from "@gpuix/react"

/** Return true to mark the key handled, which stops later subscribers. */
export type WindowKeyHandler = (event: EventPayload) => boolean

const handlers = new Set<WindowKeyHandler>()

/** Subscribe to window-level key presses. Returns an unsubscribe function. */
export function onWindowKey(handler: WindowKeyHandler): () => void {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

/** Key name normalised the way GPUIX reports it (lowercase, no modifiers). */
export function keyName(event: EventPayload): string {
  return (event.key ?? "").toLowerCase()
}

/**
 * Entry point for `render(<App />, { onKeyDown })`.
 *
 * Returns whether a subscriber consumed the key, which is what makes the
 * wiring testable without a window.
 */
export function dispatchWindowKey(event: EventPayload): boolean {
  if (!keyName(event)) return false
  // Copy first: a handler may unsubscribe while we iterate.
  for (const handler of [...handlers]) {
    if (handler(event)) return true
  }
  return false
}
