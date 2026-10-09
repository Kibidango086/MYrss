// GPUIX JSX runtime for material-you-gpuix.
//
// `tsconfig.json` sets `jsxImportSource: "./jsx"`, and `src/material/jsx` is a
// symlink to this folder so the relative specifier resolves from every
// component file. The intrinsic prop types come from the installed
// `@gpuix/react` — see `./intrinsics.js` for the list of platform features that
// buys this library.

import type * as React from "react"
import type { IntrinsicElements as GpuixIntrinsicElements } from "./intrinsics.js"

export { Fragment, jsx, jsxs } from "@gpuix/react/jsx-runtime"
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
