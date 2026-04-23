import { createWatermarkBase64, WatermarkOptions } from '@/lib/watermark'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

/**
 * PDF 边距定义（单位：mm）
 */
interface PdfMargin {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * 默认 block 边距
 */
const DEFAULT_BLOCK_MARGIN: PdfMargin = {
  top: 2,
  right: 3,
  bottom: 2,
  left: 3,
}

/**
 * 公共打印参数
 */
interface BasePrintProps {
  /** 输出文件名 */
  fileName: string
  /** PDF 页面宽度，默认 A4 纸宽 210mm */
  pdfWidth?: number
  /** PDF 页面高度，默认 A4 纸高 297mm */
  pdfHeight?: number
  /** PDF上方留白，单位mm 默认0 */
  pdfTopMargin?: number
  /** 强制浅色模式打印 */
  forceLightMode?: boolean
  /** 压缩pdf */
  compress?: boolean
  /** 打印水印 */
  watermark?: WatermarkOptions
  /** 输出模式 */
  outputMode?: 'download' | 'print'
  /** 开始回调 */
  onStart?: () => void
  /** 完成回调 */
  onComplete?: () => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

/**
 * 整体打印（整页截图）
 */
export interface PrintHtmlProps extends BasePrintProps {
  element: HTMLDivElement
}

/**
 * 分 block 打印
 */
export interface PrintHtmlByBlocksProps extends BasePrintProps {
  container: HTMLDivElement
  /** 首页忽略顶部留白（适用于首页有特殊设计的情况） */
  firstPageIgnoreTopMargin?: boolean
}

// region 工具函数

/**
 * 切换浅色模式（用于打印）
 */
function toggleLightMode(force: boolean): () => void {
  const html = document.documentElement
  const needRestore = force && html.classList.contains('dark')

  if (needRestore) {
    html.classList.remove('dark')
  }

  return () => {
    if (needRestore) {
      html.classList.add('dark')
    }
  }
}

/**
 * 解析 block margin
 */
function parseBlockMargin(el: HTMLElement): PdfMargin {
  const raw = el.dataset.printMargin
  if (!raw) return DEFAULT_BLOCK_MARGIN

  const parts = raw.split(',').map((v) => Number(v.trim()))
  if (parts.length === 2) {
    const [horizontal, vertical] = parts
    return {
      // @ts-expect-error 类型断言
      top: vertical,
      // @ts-expect-error 类型断言
      right: horizontal,
      // @ts-expect-error 类型断言
      bottom: vertical,
      // @ts-expect-error 类型断言
      left: horizontal,
    }
  } else if (parts.length === 4) {
    const [top, right, bottom, left] = parts
    // @ts-expect-error 类型断言
    return { top, right, bottom, left }
  } else {
    return DEFAULT_BLOCK_MARGIN
  }
}

/**
 * DOM → PNG（带水印）
 */
async function elementToPngWithWatermark(
  el: HTMLElement,
  watermark?: WatermarkOptions,
): Promise<string> {
  if (!watermark) {
    return toPng(el, {
      cacheBust: true,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    })
  }

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
  } = watermark

  // 生成水印
  const base64 = createWatermarkBase64({
    content,
    fontSize,
    color,
    rotate,
    width,
    height,
  })

  // 创建水印层
  const watermarkEl = document.createElement('div')

  Object.assign(watermarkEl.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    backgroundImage: `url(${base64})`,
    backgroundRepeat: 'repeat',
    backgroundSize: `${gapX}px ${gapY}px`,
    opacity: `${opacity}`,
    zIndex: '9999',
  })

  // 保存原状态
  const prevPosition = el.style.position
  const needSetRelative = !prevPosition || prevPosition === 'static'

  if (needSetRelative) {
    el.style.position = 'relative'
  }

  el.appendChild(watermarkEl)

  try {
    return await toPng(el, {
      cacheBust: true,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    })
  } finally {
    // 清理现场（必须）
    watermarkEl.remove()

    if (needSetRelative) {
      el.style.position = prevPosition
    }
  }
}

// endregion

/**
 * 整页导出 PDF
 */
export async function printHtml({
  element,
  fileName,
  pdfWidth = 210,
  pdfHeight = 297,
  pdfTopMargin = 0,
  forceLightMode = false,
  compress = true,
  watermark,
  outputMode = 'download',
  onStart,
  onComplete,
  onError,
}: PrintHtmlProps): Promise<void> {
  if (!element) {
    onError?.(new Error('element is empty'))
    return
  }

  onStart?.()
  const restoreTheme = toggleLightMode(forceLightMode)

  try {
    const dataUrl = await elementToPngWithWatermark(element, watermark)

    const contentWidth = element.offsetWidth
    const contentHeight = element.offsetHeight

    const imgHeight = (pdfWidth / contentWidth) * contentHeight

    const pdf = new jsPDF('p', 'mm', 'a4', compress)

    let position = pdfTopMargin // 默认top留白
    let remainingHeight = imgHeight

    pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight)
    remainingHeight -= pdfHeight
    position -= pdfHeight

    while (remainingHeight > 0) {
      pdf.addPage()
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight)
      remainingHeight -= pdfHeight
      position -= pdfHeight
    }

    if (outputMode === 'download') pdf.save(fileName)
    else if (outputMode === 'print') {
      pdf.autoPrint()
      window.open(pdf.output('bloburl'))
    }
    onComplete?.()
  } catch (err) {
    onError?.(err as Error)
  } finally {
    restoreTheme()
  }
}

/**
 * 按 data-print-block 分页导出
 */
export async function printHtmlByBlocks({
  container,
  firstPageIgnoreTopMargin = false,
  fileName,
  pdfWidth = 210,
  pdfHeight = 297,
  pdfTopMargin = 0,
  forceLightMode = false,
  compress = true,
  watermark,
  outputMode = 'download',
  onStart,
  onComplete,
  onError,
}: PrintHtmlByBlocksProps): Promise<void> {
  if (!container) {
    onError?.(new Error('container is empty'))
    return
  }

  onStart?.()
  const restoreTheme = toggleLightMode(forceLightMode)

  try {
    // 等待 layout 稳定
    await new Promise((r) => setTimeout(r, 300))

    const blocks = Array.from(
      container.querySelectorAll<HTMLElement>('[data-print-block]'),
    )

    if (!blocks.length) {
      throw new Error('No printable blocks found')
    }

    const pdf = new jsPDF('p', 'mm', 'a4', compress)
    let currentY = firstPageIgnoreTopMargin ? 0 : pdfTopMargin // 首页默认top留白
    let isFirstPage = true

    for (const block of blocks) {
      const margin = parseBlockMargin(block)

      const dataUrl = await elementToPngWithWatermark(block, watermark)

      const blockWidthPx = block.offsetWidth
      const blockHeightPx = block.offsetHeight

      const usableWidth = pdfWidth - margin.left - margin.right
      const blockHeightMm = (usableWidth / blockWidthPx) * blockHeightPx

      const totalHeight = margin.top + blockHeightMm + margin.bottom

      // 当前页放不下 → 新页
      if (!isFirstPage && currentY + totalHeight > pdfHeight) {
        pdf.addPage()
        currentY = pdfTopMargin // 新页默认top留白
      }

      if (isFirstPage) {
        isFirstPage = false
      }

      currentY += margin.top

      pdf.addImage(
        dataUrl,
        'PNG',
        margin.left,
        currentY,
        usableWidth,
        blockHeightMm,
      )

      currentY += blockHeightMm + margin.bottom
    }

    if (outputMode === 'download') pdf.save(fileName)
    else if (outputMode === 'print') {
      pdf.autoPrint()
      window.open(pdf.output('bloburl'))
    }
    onComplete?.()
  } catch (err) {
    onError?.(err as Error)
  } finally {
    restoreTheme()
  }
}
