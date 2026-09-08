import { spawn } from "node:child_process"

export function openInBrowser(url: string): void {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"
  const args = process.platform === "win32" ? ["", url] : [url]
  try {
    spawn(command, args, { detached: true, stdio: "ignore" }).unref()
  } catch {
    console.log("Please open this URL manually:", url)
  }
}
