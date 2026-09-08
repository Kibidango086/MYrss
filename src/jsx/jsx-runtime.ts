import type { Key, ReactNode } from "react"

export { Fragment, jsx, jsxs } from "@gpuix/react/jsx-runtime"

export type EventPayload = {
  value?: unknown
}

type CommonProps = {
  key?: Key | undefined
  style?: Style
  children?: ReactNode
  onClick?: (event: EventPayload) => void
  ref?: React.Ref<{ id: number } | null>
  onMouseDown?: (event: EventPayload) => void
  onMouseUp?: (event: EventPayload) => void
  onMouseEnter?: (event: { hovered?: boolean }) => void
  onMouseLeave?: (event: { hovered?: boolean }) => void
  testId?: string
  tabIndex?: number
  autoFocus?: boolean
}

type AnchoredProps = CommonProps & {
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

export interface Style {
  display?: "flex" | "grid" | string
  flexDirection?: "row" | "column" | string
  flexWrap?: "wrap" | string
  flexGrow?: number
  flexShrink?: number
  alignItems?: string
  alignSelf?: string
  justifyContent?: string
  gap?: number
  rowGap?: number
  columnGap?: number
  width?: number | string
  height?: number | string
  minWidth?: number | string
  minHeight?: number | string
  maxWidth?: number | string
  maxHeight?: number | string
  padding?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  margin?: number
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number
  position?: "relative" | "absolute" | "fixed"
  top?: number
  right?: number
  bottom?: number
  left?: number
  backgroundColor?: string
  color?: string
  opacity?: number
  borderWidth?: number
  borderColor?: string
  borderBottomWidth?: number
  borderBottomColor?: string
  borderTopWidth?: number
  borderTopColor?: string
  borderRightWidth?: number
  borderRightColor?: string
  borderLeftWidth?: number
  borderLeftColor?: string
  borderRadius?: number
  fontSize?: number
  fontFamily?: string
  fontWeight?: string | number
  textAlign?: "left" | "center" | "right"
  lineHeight?: number
  letterSpacing?: number
  whiteSpace?: "normal" | "nowrap"
  textOverflow?: "ellipsis"
  lineClamp?: number
  overflow?: "hidden" | "scroll"
  overflowX?: "hidden" | "scroll"
  overflowY?: "hidden" | "scroll"
  gridTemplateColumns?: number
  gridColumnMin?: "zero" | "min-content" | "max-content"
  cursor?: "default" | "pointer"
  pointerEvents?: "auto" | "none"
  hover?: Partial<Omit<Style, "hover">>
  active?: Partial<Omit<Style, "active">>
}

interface InputProps extends CommonProps {
  value?: string
  placeholder?: string
  readOnly?: boolean
  theme?: Record<string, string>
  onChange?: (event: { value?: string }) => void
  onSubmit?: (event: { value?: string }) => void
  onFocus?: () => void
  onBlur?: () => void
}

interface ImageProps extends CommonProps {
  src?: string
  alt?: string
  objectFit?: "fill" | "contain" | "cover" | "scaleDown" | "none"
}

export namespace JSX {
  export type Element = React.JSX.Element
  export type ElementType = React.JSX.ElementType

  export interface IntrinsicElements {
    div: CommonProps
    text: CommonProps
    img: ImageProps
    svg: ImageProps
    input: InputProps
    textarea: InputProps & { minRows?: number; maxRows?: number }
    markdown: CommonProps & { source?: string; theme?: Record<string, unknown>; onLinkClick?: (event: { value?: string }) => void }
    section: CommonProps
    anchored: AnchoredProps
    "virtual-list": CommonProps & {
      alignment?: "top" | "bottom"
      followTail?: boolean
      estimatedItemHeight?: number
      overdraw?: number
    }
  }
}
