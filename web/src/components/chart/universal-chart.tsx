'use client'

import ReactECharts from 'echarts-for-react/lib/core'
import type { ECElementEvent } from 'echarts/core'
import * as echarts from 'echarts/core'
import { saveAs } from 'file-saver'
import { Check, Code2, Copy, Download, Maximize } from 'lucide-react'
import { useTheme } from 'next-themes'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import type { EChartsOption } from 'echarts'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DatasetComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { darkTheme, lightTheme } from '@/lib/echarts/echarts-theme'
import { cn } from '@/lib/utils'
import { EChartsInstance } from 'echarts-for-react'
import { LegacyGridContainLabel } from 'echarts/features'
import { stringify } from 'javascript-stringify'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  atomOneDark,
  atomOneLight,
} from 'react-syntax-highlighter/dist/cjs/styles/hljs'
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json'

// echarts 模块注册
echarts.use([
  CanvasRenderer,
  LegacyGridContainLabel,
  DatasetComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
])

// 代码高亮注册
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('javascript', javascript)

interface UniversalChartProps {
  /** ECharts 配置项 */
  option: EChartsOption
  /** 容器类名 */
  className?: string
  /** 图表高度 */
  height?: string | number
  /** 卡片标题区域 */
  title?: React.ReactNode
  /** 卡片Description区域 */
  description?: React.ReactNode
  /** 卡片底部区域 */
  footer?: React.ReactNode
  /** 工具箱-查看配置 */
  toolCode?: boolean
  /** 工具箱-全屏 */
  toolFullscreen?: boolean
  /** 点击事件回调 */
  onChartClick?: (params: ECElementEvent) => void
  /** 图表加载完成 */
  onChartReady?: (instance: EChartsInstance) => void
  /** 是否显示加载动画 */
  loading?: boolean
}

export default function UniversalChart({
  option,
  className,
  height = '100%',
  title,
  description,
  footer,
  toolCode = false,
  toolFullscreen = true,
  onChartClick,
  onChartReady,
  loading = false,
}: UniversalChartProps) {
  const { resolvedTheme } = useTheme() // 获取当前主题 (light/dark)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // 代码高亮主题
  const codeStyle = resolvedTheme === 'dark' ? atomOneDark : atomOneLight

  // 控制当前预览的是 JSON 还是 JS
  const [codeType, setCodeType] = useState<'json' | 'js'>('json')

  // 根据主题设置 ECharts 主题
  const [echartsTheme, setEchartsTheme] = useState({})
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const base = resolvedTheme === 'dark' ? darkTheme() : lightTheme()
      setEchartsTheme(base)
    })

    return () => cancelAnimationFrame(id)
  }, [resolvedTheme])

  // 事件绑定 Memoization
  const onEvents = useMemo(
    () => ({
      click: (params: ECElementEvent) => {
        if (onChartClick) onChartClick(params)
      },
    }),
    [onChartClick],
  )

  // 生成代码字符串
  const getCodeString = useCallback(() => {
    if (codeType === 'json') {
      return JSON.stringify(option, null, 2)
    } else {
      // 生成 JS 对象格式，缩进2空格
      const jsObj = stringify(option, null, 2) || ''
      return `option = ${jsObj};`
    }
  }, [option, codeType])

  // 复制 JSON 功能
  const handleCopyCode = useCallback(async () => {
    try {
      const text = getCodeString()
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [getCodeString])

  // 下载 JSON 功能
  const handleDownloadCode = useCallback(() => {
    const text = getCodeString()
    const mimeType =
      codeType === 'json' ? 'application/json' : 'text/javascript'
    const fileName =
      codeType === 'json' ? 'chart-config.json' : 'chart-config.js'

    const blob = new Blob([text], { type: mimeType })
    saveAs(blob, fileName)
  }, [getCodeString, codeType])

  // 核心渲染器 (复用逻辑)
  const renderChartBody = (h: string | number) => (
    <ReactECharts
      echarts={echarts}
      option={option}
      theme={echartsTheme}
      style={{ height: h, width: '100%' }}
      showLoading={loading}
      onEvents={onEvents}
      onChartReady={onChartReady}
      notMerge={true}
      lazyUpdate={true}
    />
  )

  return (
    <>
      {/* Chart */}
      <Card
        className={cn(
          'flex w-full flex-col',
          height === '100%' ? 'h-full' : '',
          className,
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {(toolCode || toolFullscreen) && (
            <div className="flex items-center gap-1">
              {toolCode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowCode(true)}
                >
                  <Code2 className="text-muted-foreground h-4 w-4" />
                </Button>
              )}
              {toolFullscreen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullScreen(true)}
                >
                  <Maximize className="text-muted-foreground h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="relative min-h-0 w-full flex-1 p-4">
          {renderChartBody(height)}
        </CardContent>
        {footer && <CardFooter>{footer}</CardFooter>}
      </Card>

      {/* 全屏模态框 */}
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="flex h-[90vh] max-h-[90vh] w-full max-w-[90vw] flex-col gap-0 overflow-y-auto border-none p-0 shadow-none md:max-w-3xl lg:max-w-5xl">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-6 py-4">
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </div>
            {/* 关闭自带的 Close 触发 */}
          </DialogHeader>
          <div className="h-full w-full flex-1 overflow-hidden p-4">
            {renderChartBody('100%')}
          </div>
        </DialogContent>
      </Dialog>

      {/* 代码预览 */}
      <Dialog open={showCode} onOpenChange={setShowCode}>
        <DialogContent className="flex h-[90vh] max-h-[90vh] w-full max-w-[90vw] flex-col gap-0 overflow-y-auto border-none p-0 shadow-none md:max-w-3xl lg:max-w-5xl">
          {/* Tabs容器 */}
          <Tabs
            value={codeType}
            onValueChange={(v) => setCodeType(v as 'json' | 'js')}
            className="flex h-full w-full flex-col"
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b px-6 py-3">
              <div className="flex items-center gap-4">
                <DialogTitle>Config Preview</DialogTitle>
                {/* Tab 切换按钮 */}
                <TabsList>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                  <TabsTrigger value="js">JavaScript</TabsTrigger>
                </TabsList>
              </div>

              {/* 功能按钮 */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-8 gap-2"
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCode}
                  className="h-8 gap-2"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <ScrollArea className="bg-muted/50 flex-1">
              <div className="p-0">
                {/* JSON View */}
                <TabsContent value="json" className="mt-0 border-0 p-0">
                  <CodeViewer
                    code={getCodeString()}
                    language="json"
                    style={codeStyle as never}
                  />
                </TabsContent>

                {/* JS View */}
                <TabsContent value="js" className="mt-0 border-0 p-0">
                  <CodeViewer
                    code={getCodeString()}
                    language="javascript"
                    style={codeStyle as never}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

// 代码高亮组件
function CodeViewer({
  code,
  language,
  style,
}: {
  code: string
  language: string
  style: never
}) {
  return (
    <SyntaxHighlighter
      language={language}
      style={style}
      showLineNumbers={true}
      lineNumberStyle={{
        minWidth: '2.5em',
        paddingRight: '1em',
        color: '#a1a1aa',
        textAlign: 'right',
        opacity: 0.6,
        userSelect: 'none',
      }}
      customStyle={{
        margin: 0,
        padding: '1.5rem',
        borderRadius: 0, // 移除圆角以贴合 Tab
        backgroundColor: 'transparent',
        fontSize: '0.875rem',
        lineHeight: '1.6',
      }}
      showInlineLineNumbers={true} // 显示内联行号
      wrapLongLines={true} // 自动换行
    >
      {code}
    </SyntaxHighlighter>
  )
}
