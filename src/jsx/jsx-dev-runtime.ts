import type { Key, ReactNode } from "react"

export { Fragment, jsxDEV, jsxDEV as jsx, jsxDEV as jsxs } from "react/jsx-dev-runtime"

type DevCommonProps = {
  key?: Key | undefined
  style?: Record<string, unknown> | undefined
  children?: ReactNode | undefined
  onClick?: ((event: { value?: unknown }) => void) | undefined
  ref?: React.Ref<{ id: number } | null> | undefined
  onMouseDown?: ((event: { value?: unknown }) => void) | undefined
  onMouseUp?: ((event: { value?: unknown }) => void) | undefined
  onMouseEnter?: ((event: { hovered?: boolean }) => void) | undefined
  onMouseLeave?: ((event: { hovered?: boolean }) => void) | undefined
}

type AnchoredProps = DevCommonProps & {
  position?: { x: number; y: number }
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  anchor?: "topLeft" | "topCenter" | "topRight" | "rightCenter" | "bottomRight" | "bottomCenter" | "bottomLeft" | "leftCenter"
  gap?: number
  offset?: { x: number; y: number }
  fit?: "switch" | "snap"
  snapMargin?: number
  deferred?: boolean
  priority?: number
  occlude?: boolean
}

export namespace JSX {
  export type Element = React.JSX.Element
  export type ElementType = React.JSX.ElementType

  export interface IntrinsicElements {
    div: DevCommonProps
    text: DevCommonProps
    img: DevCommonProps & { src?: string; alt?: string; objectFit?: string }
    svg: DevCommonProps & { src?: string }
    input: DevCommonProps & { value?: string; placeholder?: string; onChange?: (event: { value?: string }) => void }
    textarea: DevCommonProps & InputExtra
    markdown: DevCommonProps & { source?: string; theme?: Record<string, unknown>; onLinkClick?: (event: { value?: string }) => void }
    anchored: AnchoredProps
    "virtual-list": DevCommonProps & { alignment?: "top" | "bottom"; estimatedItemHeight?: number; overdraw?: number }
  }
}

interface InputExtra {
  value?: string
  placeholder?: string
  minRows?: number
  maxRows?: number
  theme?: Record<string, string>
  onChange?: (event: { value?: string }) => void
  onFocus?: () => void
  onBlur?: () => void
}
