import { WatermarkProps } from '@/components/common/watermark'

/**
 * 水印配置项
 */
export interface WatermarkOptions {
  /** 水印内容（支持多行） */
  content: string | string[]
  /** 字体大小 */
  fontSize?: number
  /** 字体颜色 */
  color?: string
  /** 旋转角度 */
  rotate?: number
  /** 横向间距 */
  gapX?: number
  /** 纵向间距 */
  gapY?: number
  /** 单个水印宽度 */
  width?: number
  /** 单个水印高度 */
  height?: number
  /** 透明度 */
  opacity?: number
}

/**
 * 水印默认配置
 */
export const DEFAULT_WATERMARK_OPTIONS: Required<WatermarkOptions> = {
  content: '',
  fontSize: 16,
  color: 'rgba(0,0,0,0.15)',
  rotate: -20,
  gapX: 200,
  gapY: 150,
  width: 300,
  height: 200,
  opacity: 1,
}

/**
 * 生成 canvas 水印 base64
 */
export function createWatermarkBase64({
  content,
  fontSize,
  color,
  rotate,
  width,
  height,
}: Required<
  Pick<
    WatermarkProps,
    'content' | 'fontSize' | 'color' | 'rotate' | 'width' | 'height'
  >
>) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  canvas.width = width
  canvas.height = height

  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = color
  ctx.font = `${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.translate(width / 2, height / 2)
  ctx.rotate((rotate * Math.PI) / 180)

  const contents = Array.isArray(content) ? content : [content]

  contents.forEach((text, index) => {
    ctx.fillText(text, 0, index * fontSize * 1.5)
  })

  return canvas.toDataURL()
}
