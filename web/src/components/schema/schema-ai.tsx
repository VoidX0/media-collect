'use client'

import UniversalChart from '@/components/chart/universal-chart'
import {
  ChatMessage,
  ChatMessageItem,
} from '@/components/schema/chat-message-item'
import { SchemaType } from '@/components/schema/schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { streamChatToText } from '@/lib/stream-chat'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import CodeMirror from '@uiw/react-codemirror'
import type { EChartsOption } from 'echarts'
import * as allCharts from 'echarts/charts'
import * as allComponents from 'echarts/components'
import * as echarts from 'echarts/core'
import { saveAs } from 'file-saver'
import {
  BarChart3,
  Bot,
  CornerDownLeft,
  Download,
  FileCode,
  FileJson,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Send,
  StopCircle,
  Upload,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import Error from 'next/error'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  atomOneDark,
  atomOneLight,
} from 'react-syntax-highlighter/dist/cjs/styles/hljs'
import { toast } from 'sonner'

// 注册所有图表类型、组件
echarts.use([...Object.values(allCharts), ...Object.values(allComponents)])

/** 组件接口定义 */
interface SchemaAiProps<T> {
  /** Dialog 控制 */
  open: boolean
  /** Dialog 状态变化回调 */
  onOpenChange: (open: boolean) => void
  /** 输入数据 */
  data: T[]
  /** 数据类型结构 */
  fieldMap: SchemaType
  /** 可选标题 */
  title?: string
}

/** 导出/导入的会话数据结构 */
interface AiSessionData {
  version: string
  timestamp: number
  typeName: string
  messages: ChatMessage[]
  configCode: string
  transformCode: string
}

/** 默认数据转换函数 */
const DEFAULT_TRANSFORM = `/**
 * Default Transformer
 * Returns raw data as a 2D array (Headers + Rows).
 * AI will modify this function to aggregate or filter data.
 */
function transform(data) {
  if (!data || data.length === 0) return [];
  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(key => item[key]));
  return [headers, ...rows];
}`

/** 默认图表配置 */
const DEFAULT_OPTION: EChartsOption = {
  xAxis: { show: false },
  yAxis: { show: false },
  grid: { top: 0, bottom: 0, left: 0, right: 0 },
  // 核心动效配置
  graphic: [
    {
      // 1. 背景呼吸圆环
      type: 'circle',
      left: 'center',
      top: 'center',
      shape: {
        r: 50, // 半径
      },
      style: {
        fill: 'transparent',
        stroke: 'rgba(156, 163, 175, 0.3)', // 边框
        lineWidth: 2,
      },
      // 关键帧动画：放大并渐隐
      keyframeAnimation: {
        duration: 3000,
        loop: true,
        keyframes: [
          {
            percent: 0,
            scaleX: 0.5,
            scaleY: 0.5,
            style: { opacity: 1 },
          },
          {
            percent: 1,
            scaleX: 1.5,
            scaleY: 1.5,
            style: { opacity: 0 },
          },
        ],
      },
    },
    {
      // 2. 中心实心圆点
      type: 'circle',
      left: 'center',
      top: 'center',
      shape: {
        r: 8,
      },
      style: {
        fill: '#9ca3af', // 实心
      },
      keyframeAnimation: {
        duration: 1500,
        loop: true,
        keyframes: [
          { percent: 0, scaleX: 1, scaleY: 1, style: { opacity: 0.5 } },
          { percent: 0.5, scaleX: 1.5, scaleY: 1.5, style: { opacity: 1 } },
          { percent: 1, scaleX: 1, scaleY: 1, style: { opacity: 0.5 } },
        ],
      },
    },
    {
      // 3. 提示文字
      type: 'text',
      left: 'center',
      top: '55%', // 放在中心偏下位置
      style: {
        text: 'AI Analyst Ready\nTell me what to visualize...',
        fill: '#9ca3af',
        fontSize: 14,
        fontFamily: 'sans-serif',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: ECharts type definition missing textAlign for graphic style
        textAlign: 'center',
        lineHeight: 20,
      },
      keyframeAnimation: {
        duration: 2000,
        loop: true,
        keyframes: [
          { percent: 0, y: 0, style: { opacity: 0.7 } },
          { percent: 0.5, y: 5, style: { opacity: 1 } }, // 向下浮动
          { percent: 1, y: 0, style: { opacity: 0.7 } },
        ],
      },
    },
  ],
  // 保留 dataset 和 series 结构
  dataset: { source: [] },
  series: [],
}

/**
 * 安全解析配置字符串
 */
const safeParseOption = (code: string) => {
  const trimmed = code.trim()
  try {
    return JSON.parse(trimmed)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    try {
      const fn = new Function('return ' + trimmed)
      return fn()
    } catch (e2) {
      throw e2
    }
  }
}

/**
 * 提取代码块逻辑
 */
function extractCodeBlocks(text: string) {
  // 先移除思考过程，只从正式回答中提取代码
  const cleanText = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '')
  const result = {
    json: null as unknown,
    js: null as string | null,
    rawJsonString: '',
  }

  // A. 提取 JS
  const jsMatch = cleanText.match(/```(?:javascript|js)\s*([\s\S]*?)```/)
  if (jsMatch && jsMatch[1]) {
    result.js = jsMatch[1].trim()
  }

  // B. 提取 JSON
  const jsonMatch = cleanText.match(/```json\s*([\s\S]*?)```/)
  if (jsonMatch && jsonMatch[1]) {
    const jsonStr = jsonMatch[1].trim()
    result.rawJsonString = jsonStr

    try {
      result.json = safeParseOption(jsonStr)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      try {
        const cleanStr = jsonStr
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/,(\s*[}\]])/g, '$1')
        result.json = safeParseOption(cleanStr)
      } catch (e2) {
        console.warn('Parse failed', e2)
      }
    }
  }

  return result
}

/** 主组件 */
export function SchemaAi<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  data,
  fieldMap,
  title,
}: SchemaAiProps<T>) {
  const t = useTranslations('Schema')
  const { resolvedTheme } = useTheme()

  // 代码主题
  const codeStyle = resolvedTheme === 'dark' ? atomOneDark : atomOneLight
  const editorTheme = resolvedTheme === 'dark' ? githubDark : githubLight
  const typeName = String(title || 'DefaultSchema')
  // 消息记录
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: t('aiDefaultAssistantMsg'),
    },
  ])
  // 输入内容
  const [input, setInput] = useState('')
  // 加载状态
  const [isLoading, setIsLoading] = useState(false)
  // 移动端视图状态: chat | preview
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat')
  // 中止控制器
  const abortControllerRef = useRef<AbortController | null>(null)
  // 滚动区域引用
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  // 隐藏的文件输入框引用
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 配置部分代码
  const [configCode, setConfigCode] = useState<string>(
    JSON.stringify(DEFAULT_OPTION, null, 2),
  )
  // 转换部分代码
  const [transformCode, setTransformCode] = useState<string>(DEFAULT_TRANSFORM)
  // 活动标签
  const [activeTab, setActiveTab] = useState('config')
  // 转换后数据
  const [transformedData, setTransformedData] = useState<unknown[]>(data)
  // 最终图表配置
  const [finalOption, setFinalOption] = useState<EChartsOption>(DEFAULT_OPTION)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollViewportRef.current) {
      const viewport = scrollViewportRef.current.querySelector(
        '[data-radix-scroll-area-viewport]',
      ) as HTMLElement
      if (viewport) viewport.scrollTop = viewport.scrollHeight
    }
  }, [messages])

  // 核心逻辑: 数据转换
  const runTransformation = useCallback(
    (code: string, rawData: T[], silent = true) => {
      try {
        const executor = new Function(
          'rawData',
          `
        try {
          ${code}
          if (typeof transform === 'function') { return transform(rawData); }
          return [];
        } catch (e) { console.error("User JS Error:", e); return null; }
      `,
        )
        const result = executor(rawData)
        // 验证结果
        if (Array.isArray(result)) {
          setTransformedData(result)
          return true
        } else {
          if (!silent) toast.error(t('msgTransformFailed'))
          return false
        }
      } catch (err) {
        if (!silent) {
          console.error(err)
          toast.error(t('msgJsSyntaxError'))
        }
        return false
      }
    },
    [t],
  )

  // 核心逻辑: 配置合并
  const mergeConfigAndData = (
    cfgCode: string,
    data: unknown[],
    notifyError = false,
  ) => {
    try {
      const baseOption = safeParseOption(cfgCode)
      const option = { ...baseOption }

      if (!option.dataset) option.dataset = {}
      if (Array.isArray(option.dataset)) {
        option.dataset[0] = { ...option.dataset[0], source: data }
        if (option.dataset[0].dimensions) delete option.dataset[0].dimensions
      } else {
        option.dataset.source = data
        if (option.dataset.dimensions) delete option.dataset.dimensions
      }

      setFinalOption(option)
      return true
    } catch (e) {
      console.warn('Config merge error:', e)
      if (notifyError) {
        toast.error(t('msgConfigError'))
      }
      return false
    }
  }

  // 监听转换代码变化自动运行转换
  useEffect(() => {
    const timer = setTimeout(() => {
      // 只有当代码非空且与上次不同时才运行
      if (transformCode && transformCode !== DEFAULT_TRANSFORM) {
        runTransformation(transformCode, data) // 运行转换并更新 transformedData
      }
    }, 500) // 防抖，给用户打字的时间

    return () => clearTimeout(timer)
  }, [transformCode, data, runTransformation])

  // 监听配置代码或转换后数据变化自动合并
  useEffect(() => {
    if (configCode && transformedData) {
      mergeConfigAndData(configCode, transformedData, false)
    }
  }, [configCode, transformedData])

  // 从文本中应用配置（供点击历史消息使用）
  const applyConfiguration = (text: string) => {
    const extracted = extractCodeBlocks(text)
    let applied = false

    if (extracted.js) {
      setTransformCode(extracted.js)
      runTransformation(extracted.js, data) // 立即运行转换
      applied = true
    }

    if (extracted.json) {
      const codeToSet =
        extracted.rawJsonString || JSON.stringify(extracted.json, null, 2)
      setConfigCode(codeToSet)
      applied = true
    }

    if (applied) {
      toast.success(t('msgConfigRestored'))
      // 如果是在移动端，切换到预览查看结果
      setMobileView('preview')
    } else {
      toast.info(t('msgNoCodeFound'))
    }
  }

  // AI 交互逻辑
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    // 发送时自动切到 Chat 视图 (移动端)
    setMobileView('chat')
    // 添加用户消息
    const userMsg: ChatMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    // 准备 Schema 信息
    const fieldsInfo = Object.entries(fieldMap).map(([key, val]) => {
      const fieldDef = val as {
        type: string
        description?: string
        format?: string
      }
      return {
        name: key,
        type: fieldDef.type,
        description: fieldDef.description || '',
      }
    })
    // 拼接 schema 信息
    const schemaInfo = {
      typeName,
      fields: fieldsInfo,
      sampleData: data ? data.slice(0, 3) : [],
    }
    // 发起请求
    const controller = new AbortController()
    abortControllerRef.current = controller
    try {
      const historyMessages = messages.map((msg) => ({
        role: msg.role,
        // 使用正则去除 <think> 标签及其内容
        content: msg.content
          .replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '')
          .trim(),
      }))
      const response = await fetch('/api/Ai/SchemaChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: schemaInfo,
          messages: [...historyMessages, userMsg],
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        // @ts-expect-error 直接使用后端返回的错误信息
        throw new Error(response.statusText)
      }
      // 处理流式响应
      let fullText = ''
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      await streamChatToText(
        '/api/Ai/SchemaChat',
        {
          schema: schemaInfo,
          messages: [...historyMessages, userMsg],
        },
        (text) => {
          fullText = text
          setMessages((prev) => {
            const arr = [...prev]
            arr[arr.length - 1]!.content = text
            return arr
          })
        },
        controller.signal,
      )
      // 自动应用生成的代码
      applyConfiguration(fullText)
    } catch (error) {
      // @ts-expect-error 只有非用户主动中止才提示错误
      if ((error as unknown).name !== 'AbortError')
        toast.error(t('msgGenerationFailed'))
    } finally {
      // 清理状态
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  // 停止处理
  const handleStop = () => {
    abortControllerRef.current?.abort()
    setIsLoading(false)
  }

  /** 导出当前会话 */
  const handleExport = () => {
    const sessionData: AiSessionData = {
      version: '1.0',
      timestamp: Date.now(),
      typeName: String(typeName),
      messages,
      configCode,
      transformCode,
    }

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
      type: 'application/json;charset=utf-8',
    })

    // 文件名格式: SchemaName_Analysis_时间戳.json
    saveAs(blob, `${String(typeName)}_Analysis_${Date.now()}.json`)
    toast.success(t('msgExportSuccess'))
  }

  /** 触发导入点击 */
  const triggerImport = () => {
    fileInputRef.current?.click()
  }

  /** 处理文件导入 */
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const sessionData = JSON.parse(content) as AiSessionData

        // 简单的格式校验
        if (
          !sessionData.messages ||
          !sessionData.configCode ||
          !sessionData.transformCode
        ) {
          // @ts-expect-error 直接使用后端返回的错误信息
          throw new Error('Invalid session file format')
        }

        // 恢复状态
        setMessages(sessionData.messages)
        setConfigCode(sessionData.configCode)
        setTransformCode(sessionData.transformCode)

        // 立即运行转换
        runTransformation(sessionData.transformCode, data)
        // useEffect 会自动监听 configCode 变化并合并数据
        toast.success(t('msgImportSuccess'))
      } catch (err) {
        console.error(err)
        toast.error(t('msgImportError'))
      } finally {
        // 清空 input，允许重复选择同一个文件
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  // 计算最后一条 User 和 Assistant 消息的索引，用于默认展开
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user')
  const lastAssistantIndex = messages
    .map((m) => m.role)
    .lastIndexOf('assistant')

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleStop()
        onOpenChange(v)
      }}
    >
      {/* 适配移动端全屏，MD 以上恢复标准弹窗尺寸 */}
      <DialogContent className="flex h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden border-none p-0 shadow-none sm:h-[90vh] sm:max-w-[95vw] md:max-w-screen-lg lg:max-w-screen-xl">
        <DialogHeader className="bg-background z-10 flex flex-shrink-0 flex-col border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Bot className="text-primary h-5 w-5" />
              <DialogTitle>
                {t('aiAnalystTitle', { param: title || String(typeName) })}
              </DialogTitle>
            </div>
            <DialogDescription className="m-0 hidden sm:block">
              {t('aiAnalystDescription')}
            </DialogDescription>
          </div>

          {/* 移动端视图切换器 (仅在 < md 显示) */}
          <div className="bg-muted/20 mt-3 flex w-full rounded-lg border p-1 md:hidden">
            <Button
              onClick={() => setMobileView('chat')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${
                mobileView === 'chat'
                  ? 'hover:bg-muted/50'
                  : 'bg-background text-foreground shadow-sm'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {t('chat')}
            </Button>
            <Button
              onClick={() => setMobileView('preview')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${
                mobileView === 'preview'
                  ? 'hover:bg-muted/50'
                  : 'bg-background text-foreground shadow-sm'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {t('preview')}
            </Button>
            {/* 关闭按钮 */}
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className={`hover:bg-muted/50 flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all`}
            >
              <X className="h-3.5 w-3.5" />
              {t('close')}
            </Button>
          </div>
        </DialogHeader>

        <div className="bg-muted/10 flex flex-1 overflow-hidden">
          {/* 左侧：聊天区域 */}
          {/* 响应式控制: 移动端根据 mobileView 显示/隐藏，PC端总是显示 */}
          <div
            className={`bg-background flex flex-col border-r transition-all ${mobileView === 'chat' ? 'flex w-full' : 'hidden'} md:flex md:w-[450px] md:flex-shrink-0`}
          >
            {/* 消息区域 */}
            <div className="relative min-h-0 flex-1" ref={scrollViewportRef}>
              <ScrollArea className="h-full w-full p-4">
                <div className="flex flex-col gap-4 pb-4">
                  {messages.map((msg, idx) => (
                    <ChatMessageItem
                      key={idx}
                      message={msg}
                      codeStyle={codeStyle}
                      defaultExpanded={
                        // 默认展开：如果是最后一条 User 消息或最后一条 Assistant 消息
                        idx === lastUserIndex || idx === lastAssistantIndex
                      }
                      onApply={() => applyConfiguration(msg.content)}
                    />
                  ))}
                  {isLoading && (
                    <div className="text-muted-foreground flex items-center gap-2 pl-4 text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>{t('thinking')}</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            {/* 输入区域 */}
            <div className="bg-background border-t p-3 md:p-4">
              <div className="relative">
                <Textarea
                  placeholder={t('aiInputPlaceholder')}
                  className="max-h-[150px] min-h-[60px] resize-none pr-12 text-sm shadow-sm focus-visible:ring-1"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage().then(() => {}) // 发送消息
                    }
                  }}
                  disabled={isLoading}
                />
                <div className="absolute right-2 bottom-2">
                  {isLoading ? (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={handleStop}
                    >
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleSendMessage}
                      disabled={!input.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {/* 快捷提示 */}
              <div className="text-muted-foreground mt-2 hidden items-center justify-center gap-1 text-center text-[10px] md:flex">
                <CornerDownLeft className="h-3 w-3" /> {t('aiInputHint')}
              </div>
            </div>
          </div>

          {/* 右侧：图表与编辑器 */}
          {/* 响应式控制: 移动端根据 mobileView 显示/隐藏，PC端总是显示 */}
          <div
            className={`min-w-0 flex-col overflow-hidden ${mobileView === 'preview' ? 'flex w-full' : 'hidden'} md:flex md:flex-1`}
          >
            {/* 可视化区 */}
            <UniversalChart
              option={finalOption}
              height="100%"
              className="h-[70%] border-none shadow-none"
            />

            {/* 配置区 */}
            <div className="bg-background flex min-h-0 flex-[4] flex-col border-t">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex h-full w-full flex-col"
              >
                <div className="bg-muted/20 flex flex-col justify-between border-b px-2 sm:flex-row sm:items-center md:px-4">
                  {/* 标签列表 */}
                  <TabsList className="-mb-px h-9 bg-transparent p-0">
                    <TabsTrigger value="config">
                      <FileJson className="mr-2 h-4 w-4" /> {t('config')}
                    </TabsTrigger>
                    <TabsTrigger value="transform">
                      <FileCode className="mr-2 h-4 w-4" /> {t('transformer')}
                    </TabsTrigger>
                  </TabsList>

                  {/* 操作按钮组 (可滚动容器，防止移动端挤压) */}
                  <div className="no-scrollbar flex items-center gap-1 overflow-x-auto pb-2 sm:py-2 sm:pb-0">
                    {/* 隐藏的文件输入框 */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".json"
                      onChange={handleImport}
                    />
                    {/* 导入按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={triggerImport}
                      title={t('import')}
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      <span className="hidden xl:inline">{t('import')}</span>
                    </Button>
                    {/* 导出按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={handleExport}
                      title={t('export')}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      <span className="hidden xl:inline">{t('export')}</span>
                    </Button>
                    <Separator orientation="vertical" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setTransformCode(DEFAULT_TRANSFORM)
                        setConfigCode(JSON.stringify(DEFAULT_OPTION, null, 2))
                        setMessages([
                          {
                            role: 'assistant',
                            content: t('aiDefaultAssistantMsg'),
                          },
                        ])
                      }}
                    >
                      <RefreshCcw className="mr-1 h-3 w-3" />
                      <span className="hidden xl:inline">{t('reset')}</span>
                    </Button>
                  </div>
                </div>
                <div className="group relative flex-1">
                  {/* 配置区域 */}
                  <TabsContent
                    value="config"
                    className="absolute inset-0 m-0 h-full w-full p-0"
                  >
                    <CodeMirror
                      value={configCode}
                      height="100%"
                      extensions={[json()]}
                      onChange={(value) => setConfigCode(value)}
                      theme={editorTheme}
                      className="h-full text-xs"
                      basicSetup={{
                        lineNumbers: true,
                        highlightActiveLine: true,
                        foldGutter: true,
                      }}
                    />
                  </TabsContent>
                  {/* 转换区域 */}
                  <TabsContent
                    value="transform"
                    className="absolute inset-0 m-0 h-full w-full p-0"
                  >
                    <CodeMirror
                      value={transformCode}
                      height="100%"
                      extensions={[javascript()]}
                      onChange={(value) => setTransformCode(value)}
                      theme={editorTheme}
                      className="h-full text-xs"
                      basicSetup={{
                        lineNumbers: true,
                        highlightActiveLine: true,
                        foldGutter: true,
                      }}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
