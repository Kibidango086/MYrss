// GPUIX JSX dev runtime for material-you-gpuix.
//
// Bun and other bundlers resolve `jsxImportSource` to `jsx-dev-runtime` in
// development. The element factory comes from React, but the intrinsic prop
// types must match `jsx-runtime.ts` exactly, or `role` / `aria-*`,
// `onFileDrop`, `textDecoration` and `exit` would type only in production
// builds.

import type * as React from "react"
import type { IntrinsicElements as GpuixIntrinsicElements } from "./intrinsics.js"

export { Fragment, jsxDEV, jsxDEV as jsx, jsxDEV as jsxs } from "react/jsx-dev-runtime"
export type { EventPayload, Style } from "./intrinsics.js"

export namespace JSX {
  export type Element = React.JSX.Element
  export type ElementType = React.JSX.ElementType
  export type ElementClass = React.JSX.ElementClass
  export type ElementAttributesProperty = React.JSX.ElementAttributesProperty
  export type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute
  export type IntrinsicAttributes = React.JSX.IntrinsicAttributes
  export type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>

  export interface IntrinsicElements extends GpuixIntrinsicElements {}
}
