import React from "react"
import { render } from "@gpuix/react"
import { App } from "./app.js"
import { dispatchWindowKey } from "./shortcuts.js"

render(<App />, {
  title: "MYrss",
  width: 1200,
  height: 800,
  minWidth: 900,
  minHeight: 600,
  // Shortcuts that must fire wherever focus is (Escape closing a dialog) are
  // registered by the app and routed from here; GPUIX key events do not bubble.
  onKeyDown: (event) => dispatchWindowKey(event),
})
