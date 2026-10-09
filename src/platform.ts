// Desktop capabilities GPUIX exposes on the live renderer, wrapped as hooks.
//
// These are the parts of the GPUIX 0.7–0.10 platform that are not visual
// primitives: OS file dialogs, native window controls, host-ref scrolling and
// live `<img>` uploads. They are desktop-only — the browser renderer omits the
// optional methods, so every hook degrades to a no-op / `null` there.

import { useCallback, useMemo, useState } from "react"
import { useGpuixRequired, type ImgInstance, type PathPromptOptions, type PublicInstance } from "@gpuix/react"

export type { PathPromptOptions }

/** Options for `useFilePicker().pickFiles`. */
export interface FilePickerOptions extends PathPromptOptions {
  /** Select files. Defaults to true unless `directories` is true. */
  files?: boolean
  /** Select directories. Defaults to false. */
  directories?: boolean
  /** Allow several paths. Defaults to false. */
  multiple?: boolean
  /** Label for the picker confirmation button. */
  prompt?: string
}

export interface FilePicker {
  /** True when this renderer can open an OS file dialog. */
  available: boolean
  /**
   * Open the operating system's file picker. Resolves with absolute paths,
   * or `null` when the user cancels.
   */
  pickFiles: (options?: FilePickerOptions) => Promise<string[] | null>
}

/**
 * Open the OS file picker (GPUIX 0.10.0).
 *
 * ```tsx
 * const { pickFiles } = useFilePicker()
 * const paths = await pickFiles({ multiple: true, prompt: "Attach" })
 * ```
 */
export function useFilePicker(): FilePicker {
  const renderer = useGpuixRequired()
  const available = typeof renderer.promptForPaths === "function"
  const pickFiles = useCallback(async (options?: FilePickerOptions) => {
    if (typeof renderer.promptForPaths !== "function") return null
    try {
      return await renderer.promptForPaths(options)
    } catch {
      // Invalid option combinations and platform failures reject; a cancelled
      // dialog already resolves with `null`.
      return null
    }
  }, [renderer])
  return useMemo(() => ({ available, pickFiles }), [available, pickFiles])
}

export interface WindowControls {
  /** Minimise the window. No-op when the platform renderer lacks the method. */
  minimize: () => void
  /** Zoom / maximise the window. */
  zoom: () => void
  /** Toggle fullscreen. */
  toggleFullscreen: () => void
  /** Set the native window title. */
  setTitle: (title: string) => void
  /** Reveal and focus a window opened with `show: false` / `focus: false`. */
  activate: () => void
}

/**
 * Native desktop window controls (GPUIX 0.10.0).
 *
 * They forward to GPUI's platform window on macOS, Windows, Linux and FreeBSD
 * and are absent in the browser renderer, where each call is a no-op.
 */
export function useWindowControls(): WindowControls {
  const renderer = useGpuixRequired()
  return useMemo(() => ({
    minimize: () => renderer.minimizeWindow?.(),
    zoom: () => renderer.zoomWindow?.(),
    toggleFullscreen: () => renderer.toggleFullscreen?.(),
    setTitle: (title: string) => renderer.setWindowTitle?.(title),
    activate: () => renderer.activateWindow?.(),
  }), [renderer])
}

/**
 * Scroll a host ref into view (GPUIX 0.10.0).
 *
 * Every host ref has `scrollIntoView()`, which scrolls the nearest overflow
 * parent — or `<virtual-list>` — until that node is visible. A windowed list
 * uses the logical item index, not the mounted child index.
 *
 * ```tsx
 * const row = useRef<PublicInstance>(null)
 * <ListItem ref={row} ... />
 * scrollIntoView(row.current)
 * ```
 */
export function scrollIntoView(instance: PublicInstance | null | undefined): void {
  instance?.scrollIntoView?.()
}

export interface LiveImage {
  /** Attach to `<img ref={...}>`. */
  ref: React.RefObject<ImgInstance | null>
  /** Push encoded PNG/JPEG/WebP/GIF/SVG/BMP/TIFF/ICO/Netpbm bytes. */
  setImage: (bytes: Uint8Array) => void
  /** Push packed straight-alpha RGBA pixels — preferred for live frames. */
  setImagePixels: (width: number, height: number, pixels: Uint8Array) => void
}

/**
 * Drive an `<img>` from memory without a data URL or a `src` round-trip
 * (GPUIX 0.10.0): generated buffers, waveforms, video frames.
 *
 * Upload a 2x bitmap into a 1x layout box on a retina display; alpha is
 * straight, not premultiplied. A later React `src` change overwrites the
 * pixels.
 */
export function useLiveImage(): LiveImage {
  const [ref] = useState<React.RefObject<ImgInstance | null>>(() => ({ current: null }))
  return useMemo(() => ({
    ref,
    setImage: (bytes: Uint8Array) => ref.current?.setImage(bytes),
    setImagePixels: (width: number, height: number, pixels: Uint8Array) =>
      ref.current?.setImagePixels(width, height, pixels),
  }), [ref])
}
