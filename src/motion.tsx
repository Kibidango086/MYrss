import React, { useEffect, useState } from "react"
import { motion, useGpuixRequired } from "@gpuix/react"

export const MOTION_EASE = {
  standard: [0.2, 0, 0, 1] as [number, number, number, number],
  decelerate: [0.05, 0.7, 0.1, 1] as [number, number, number, number],
  accelerate: [0.3, 0, 0.8, 0.15] as [number, number, number, number],
}

export const MOTION_DURATION = {
  short: 0.14,
  medium: 0.26,
  large: 0.34,
}

export function FadeSlideIn({ children, delay = 0, offset = 18 }: {
  children: React.ReactNode
  delay?: number
  offset?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, left: offset }}
      animate={{ opacity: 1, left: 0 }}
      transition={{ duration: MOTION_DURATION.large, delay, ease: MOTION_EASE.decelerate }}
      style={{ position: "relative" }}
    >
      {children}
    </motion.div>
  )
}

export function RiseIn({ children, delay = 0, offset = 22 }: {
  children: React.ReactNode
  delay?: number
  offset?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, top: offset }}
      animate={{ opacity: 1, top: 0 }}
      transition={{ duration: MOTION_DURATION.large, delay, ease: MOTION_EASE.decelerate }}
      style={{ position: "relative" }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ index, children, step = .035 }: {
  index: number
  children: React.ReactNode
  step?: number
}) {
  return (
    <RiseIn delay={Math.min(index * step, .24)} offset={16}>
      {children}
    </RiseIn>
  )
}

export function Collapse({ open, height, children }: {
  open: boolean
  height: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={false}
      animate={{
        height: open ? height : 0,
        opacity: open ? 1 : 0,
        left: open ? 0 : -10,
        borderRadius: open ? 12 : 20,
      }}
      transition={{
        duration: open ? MOTION_DURATION.large : MOTION_DURATION.short,
        ease: open ? MOTION_EASE.decelerate : MOTION_EASE.accelerate,
      }}
      style={{ overflow: "hidden" }}
    >
      <div style={{ width: "100%", height }}>{children}</div>
    </motion.div>
  )
}

interface NativeWindowSize {
  width: number
  height: number
}

export function useResponsiveWindowSize(pollInterval = 250): NativeWindowSize {
  const renderer = useGpuixRequired()
  const [size, setSize] = useState<NativeWindowSize>({ width: 1180, height: 760 })

  useEffect(() => {
    let active = true
    const readSize = () => {
      try {
        const next = renderer.getWindowSize?.()
        if (active && next && (next.width !== size.width || next.height !== size.height)) {
          setSize({ width: next.width, height: next.height })
        }
      } catch {
      }
    }
    readSize()
    const timer = setInterval(readSize, pollInterval)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [pollInterval, renderer, size.height, size.width])

  return size
}
