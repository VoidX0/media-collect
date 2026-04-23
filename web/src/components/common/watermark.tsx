'use client'

import { createWatermarkBase64, WatermarkOptions } from '@/lib/watermark'
import { useEffect, useRef } from 'react'

export interface WatermarkProps extends WatermarkOptions {
  /** 层级 */
  zIndex?: number
  /** 挂载容器（局部水印用） */
  container?: HTMLElement | null
  /** 是否防删除 */
  preventRemoval?: boolean
}

export default function Watermark(props: WatermarkProps) {
  const observerRef = useRef<MutationObserver | null>(null)

  useEffect(() => {
    const {
      content,
      fontSize = 16,
      color = 'rgba(0,0,0,0.15)',
      rotate = -20,
      gapX = 200,
      gapY = 150,
      width = 300,
      height = 200,
      opacity = 1,
      zIndex = 9999,
      container,
      preventRemoval = true,
    } = props

    const id = 'custom-watermark'

    const base64 = createWatermarkBase64({
      content,
      fontSize,
      color,
      rotate,
      width,
      height,
    })

    const getParent = () => container ?? document.body

    const createLayer = () => {
      const parent = getParent()

      let div = parent.querySelector(`#${id}`) as HTMLDivElement | null

      if (!div) {
        div = document.createElement('div')
        div.id = id
        parent.appendChild(div)
      }

      Object.assign(div.style, {
        position: container ? 'absolute' : 'fixed',
        inset: '0',
        pointerEvents: 'none',
        backgroundImage: `url(${base64})`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${gapX}px ${gapY}px`,
        opacity: `${opacity}`,
        zIndex: `${zIndex}`,
      })
    }

    createLayer()

    // ===== 防删除逻辑 =====
    observerRef.current?.disconnect()

    if (preventRemoval) {
      const observer = new MutationObserver(() => {
        const parent = getParent()
        const wm = parent.querySelector(`#${id}`)

        if (!wm) {
          createLayer()
        }
      })

      observer.observe(getParent(), {
        childList: true,
        subtree: true,
      })

      observerRef.current = observer
    }

    return () => {
      observerRef.current?.disconnect()
      const parent = getParent()
      const wm = parent.querySelector(`#${id}`)
      wm?.remove()
    }
  }, [props])

  return null
}
