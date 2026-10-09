// GPUIX intrinsic-element types, shared by the JSX runtime and the JSX dev runtime.
//
// These are re-exported straight from the installed `@gpuix/react`, so this
// library is always typed against the exact prop surface of the GPUIX version
// it runs on. That is what brings the newer platform features into the library
// without hand-maintaining a copy of the host contract:
//
//   * `role` and the `aria-*` accessibility props (GPUIX 0.8.0)
//   * `onFileDrop` (GPUIX 0.8.0)
//   * `textDecoration`, `overflowX` / `overflowY`, per-corner radii (GPUIX 0.8.0)
//   * two-stop `background` gradients (GPUIX 0.7.0)
//   * `<img>` data-URL and http(s) sources (GPUIX 0.7.0 / 0.8.0)
//   * `motion.div` `exit` targets, driven by `AnimatePresence` (GPUIX 0.10.0)
//   * `<code>`, `<diff>`, `<markdown>`, `<canvas>` and `<svg>` host elements
//
// `key` is declared on the GPUIX prop types, not on `IntrinsicAttributes`:
// TypeScript 5 ignores `IntrinsicAttributes` for intrinsic elements.

import type {
  AnchoredProps,
  CodeProps,
  DiffProps,
  ImgProps,
  InputProps,
  MarkdownProps,
  Props,
  SvgProps,
  TextareaProps,
  VirtualListProps,
} from "@gpuix/react"

export type { EventPayload } from "@gpuix/react"
/** GPUIX's style declaration object, exported under this library's historical name. */
export type { StyleDesc as Style } from "@gpuix/react"

/**
 * Accessibility props GPUIX maps onto AccessKit.
 *
 * A node reaches the platform accessibility tree only when it has both an id
 * (always set) and a `role`. `"none"` / `"presentation"` produce no node.
 */
export interface A11yProps {
  /** ARIA role token, e.g. `"button"`, `"tab"`, `"heading"`, `"dialog"`. */
  role?: string
  /** Accessible name. Maps to AccessKit's label / UIA Name. */
  ariaLabel?: string
  /** Extra description announced after name, role and value. */
  ariaDescription?: string
  /** Author id exposed as `AXIdentifier` / UIA AutomationId. */
  ariaId?: string
  /** Whether the control is expanded — disclosure, combobox, menu. */
  ariaExpanded?: boolean
  /** Whether the control is selected — tab, chip, nav item, list option. */
  ariaSelected?: boolean
  /** String value reported to assistive technology, e.g. `"45%"`. */
  ariaValueText?: string
  /** Heading level, 1-based. */
  ariaLevel?: number
}

/** The subset of host props an `A11yProps` value expands into. */
export interface A11yHostProps {
  role?: string
  "aria-label"?: string
  "aria-description"?: string
  "aria-id"?: string
  "aria-expanded"?: boolean
  "aria-selected"?: boolean
  "aria-valuetext"?: string
  "aria-level"?: number
}

/**
 * Expand this library's camelCase accessibility props into GPUIX's `aria-*`
 * host prop names. Undefined entries are omitted so a host prop is only ever
 * sent when it was actually declared.
 *
 * `fallbackLabel` supplies the accessible name from a visible label, and
 * `fallbackRole` the role a component has by default.
 */
export function a11y(props: A11yProps, fallbackLabel?: string, fallbackRole?: string): A11yHostProps {
  const out: A11yHostProps = {}
  const role = props.role ?? fallbackRole
  const label = props.ariaLabel ?? fallbackLabel
  if (role !== undefined) out.role = role
  if (label !== undefined) out["aria-label"] = label
  if (props.ariaDescription !== undefined) out["aria-description"] = props.ariaDescription
  if (props.ariaId !== undefined) out["aria-id"] = props.ariaId
  if (props.ariaExpanded !== undefined) out["aria-expanded"] = props.ariaExpanded
  if (props.ariaSelected !== undefined) out["aria-selected"] = props.ariaSelected
  if (props.ariaValueText !== undefined) out["aria-valuetext"] = props.ariaValueText
  if (props.ariaLevel !== undefined) out["aria-level"] = props.ariaLevel
  return out
}

/**
 * Host elements take GPUIX's own prop names — including the kebab-case
 * `"aria-label"` / `"aria-id"` spellings. Library components accept the
 * `A11yProps` names instead and expand them with `a11y()`.
 */
export interface IntrinsicElements {
  div: Props
  text: Props
  img: ImgProps
  svg: SvgProps
  canvas: Props
  input: InputProps
  textarea: TextareaProps
  anchored: AnchoredProps
  code: CodeProps
  diff: DiffProps
  markdown: MarkdownProps
  "virtual-list": VirtualListProps
}
